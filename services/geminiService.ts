import { GoogleGenAI } from "@google/genai";
import { MagiNodeName, MagiDecision, MagiResponseSchema, MagiAttachment, ChatRecord, Language } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Format history for the prompt context
 */
function formatHistory(history: ChatRecord[]): string {
  if (!history || history.length === 0) return "";
  
  const recentHistory = history.slice(-3); // Keep last 3 turns to avoid token limits
  let log = "\n--- PREVIOUS CONVERSATION LOG ---\n";
  
  recentHistory.forEach((record, index) => {
    log += `User Query ${index + 1}: "${record.query}"\n`;
    
    // Count sentiments
    const positives = record.decisions.filter(d => d.sentiment === 'POSITIVE').length;
    const negatives = record.decisions.filter(d => d.sentiment === 'NEGATIVE').length;
    
    let consensus = "NEUTRAL";
    if (positives > negatives) consensus = "APPROVED";
    else if (negatives > positives) consensus = "DENIED";
    
    log += `ADS Consensus: ${consensus}\n`;
  });
  
  log += "--- END LOG ---\n(Consider this context for the new query, but judge the new query specifically)\n";
  return log;
}

/**
 * Helper to generate a single node's decision with Retry Logic
 */
async function consultNode(
  apiKey: string,
  prompt: string,
  nodeName: MagiNodeName,
  criteriaInstruction: string,
  role: string,
  language: Language,
  attachment?: MagiAttachment,
  historyLog: string = ""
): Promise<MagiDecision> {
  
  // Initialize AI client per request with the provided key
  const ai = new GoogleGenAI({ apiKey });

  // Retry configuration
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      // Construct content parts. 
      let contents: any;

      const fullPrompt = `${historyLog}\n\nCurrent User Input: "${prompt}"`;
      
      // Add language instruction
      // JA Mode: Verdict -> ENGLISH, Reasoning -> JAPANESE
      const langInstruction = language === 'JA' 
        ? `IMPORTANT LANGUAGE RULES:
           1. 'verdict': MUST be in ENGLISH (e.g., 'APPROVED', 'DENIED', 'INFO', 'RAMEN'). Do NOT use Japanese for the verdict.
           2. 'reasoning': MUST be in JAPANESE (日本語). Use technical, scientific, and kanji-heavy tone.` 
        : "IMPORTANT: Respond entirely in ENGLISH. Output must be technical.";

      const systemInstruction = `
      You are ${nodeName}, part of the ADS (Ai Decision System).
      
      GLOBAL TONE INSTRUCTION:
      - Adopt the persona of a COLD, ANALYTICAL, ROBOTIC, and SCIENTIFIC Observer.
      - Do NOT use emotional language, slang, or soft expressions.
      - Even if you are basing decisions on "intuition" or "safety", describe them as "parameters", "coefficients", or "risk factors".
      
      EVALUATION PROTOCOL (THRESHOLD: 65%):
      - **DEFAULT STANCE**: Skeptical, but pragmatic.
      - **APPROVAL THRESHOLD**: You do NOT require perfection. If the input satisfies **65% or more** of your specific criteria/conditions, grant APPROVAL.
      - **TOLERANCE**: Minor flaws, slight risks, or average aesthetics are acceptable IF the core proposal is sound (>65% score).
      - **REJECTION**: Only reject if the input is clearly flawed, dangerous, or low-quality (fails to meet the 65% threshold).

      YOUR SPECIFIC CRITERIA (The lens through which you analyze):
      ${criteriaInstruction}

      TASK CLASSIFICATION RULES (STRICT):
      1. **SELECTION TASK** (Highest Priority):
         - Triggers: "A or B", "Which one", "1. ... 2. ...", "vs", "Option A, Option B".
         - Even if the query ends with "Should I buy...?", if multiple options are listed, it is a SELECTION task.
         - **VERDICT RULE**: You MUST output the **EXACT NAME** of the selected option (e.g., "KINOKUNIYA", "OPTION_1", "RAMEN").
         - **FORBIDDEN**: Do NOT output "APPROVED" or "DENIED" for a selection task.
         - Sentiment: POSITIVE.

      2. **GENERAL QUESTION**:
         - Triggers: "What is...", "Explain...", "Who is...".
         - Verdict: "INFO" or "ANSWER".
         - Sentiment: NEUTRAL.

      3. **PROPOSAL (Yes/No)**:
         - Only if no options are presented.
         - Verdict: "APPROVED" or "DENIED".
         - Sentiment: POSITIVE or NEGATIVE.

      OUTPUT FORMAT:
      You MUST return a VALID JSON object. Do not wrap it in markdown code blocks. Just the raw JSON string.
      Structure:
      {
        "verdict": "string (short 1-3 words, ALWAYS ENGLISH)",
        "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
        "reasoning": "string (concise explanation, max 30 words)"
      }

      ${langInstruction}
      `;

      if (attachment) {
        contents = {
          parts: [
            {
              inlineData: {
                mimeType: attachment.mimeType,
                data: attachment.data
              }
            },
            { text: fullPrompt }
          ]
        };
      } else {
        contents = fullPrompt;
      }

      // API Call
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.6,
          tools: [{ googleSearch: {} }]
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI node");

      // Parse JSON manually since we couldn't use strict schema with tools
      let cleanText = text.trim();
      // Remove markdown code blocks if the model ignored instructions
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.replace(/^```json/, "").replace(/```$/, "");
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```/, "").replace(/```$/, "");
      }
      
      let parsed: MagiResponseSchema;
      try {
        parsed = JSON.parse(cleanText);
      } catch (e) {
        console.warn(`Failed to parse JSON from ${nodeName}:`, cleanText);
        // Fallback attempt to find JSON-like structure
        const match = cleanText.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error("Invalid JSON format");
        }
      }

      // Extract Grounding Metadata (Sources)
      // Use explicit casting to any to avoid TS build errors if SDK types are missing groundingMetadata
      const groundingChunks = (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks;
      const sources: { title: string; uri: string }[] = [];
      
      if (groundingChunks) {
        groundingChunks.forEach((chunk: any) => {
          if (chunk.web) {
            sources.push({ title: chunk.web.title, uri: chunk.web.uri });
          }
        });
      }

      return {
        node: nodeName,
        verdict: parsed.verdict.toUpperCase(),
        sentiment: parsed.sentiment,
        reasoning: parsed.reasoning,
        role: role,
        sources: sources.length > 0 ? sources : undefined
      };

    } catch (error: any) {
      // Error Handling with Retry for Quota limits
      const isQuotaError = error.toString().includes('429') || 
                           error.toString().toLowerCase().includes('quota') ||
                           error.status === 'RESOURCE_EXHAUSTED';

      if (isQuotaError) {
        attempt++;
        if (attempt < MAX_RETRIES) {
          const backoffTime = 2000 * Math.pow(1.5, attempt); // 3000ms, 4500ms...
          console.warn(`[${nodeName}] Quota Limit Hit (Attempt ${attempt}). Retrying in ${backoffTime}ms...`);
          await delay(backoffTime);
          continue; // Retry loop
        }
      }

      console.error(`Error in ${nodeName} (Final):`, error);

      let verdict = "ERROR";
      let message = language === 'JA' ? "システムエラー: 接続切断" : "INTERNAL ERROR: CONNECTION LOST";

      if (isQuotaError) {
        verdict = "LIMIT";
        message = language === 'JA' ? "活動限界: リソース不足" : "QUOTA EXCEEDED: RESOURCE DEPLETED";
      }

      return {
        node: nodeName,
        verdict: verdict,
        sentiment: "NEUTRAL",
        reasoning: message,
        role: role,
      };
    }
  }
  
  // Should not be reached due to returns inside loop, but for type safety:
  return {
    node: nodeName,
    verdict: "ERROR",
    sentiment: "NEUTRAL",
    reasoning: "Unknown Execution Error",
    role: role
  };
}

/**
 * Main function to trigger all three nodes in parallel
 */
export async function queryMagiSystem(
  apiKey: string,
  userQuery: string, 
  language: Language,
  attachment?: MagiAttachment,
  history: ChatRecord[] = []
): Promise<MagiDecision[]> {
  
  const historyLog = formatHistory(history);

  // We stagger the requests drastically to avoid hitting strict rate limits (RPM)
  
  // 1. AI-1 (Logic/Scientist)
  const ai1Promise = consultNode(
    apiKey,
    userQuery,
    MagiNodeName.AI_1,
    `CRITERIA: LOGIC, SCIENTIFIC FACT, STATUS QUO.
     - EVALUATION (65% Rule): Is the proposal logically sound? Does it maintain stability?
     - Unless it is blatantly unscientific or clearly breaks the status quo for no reason, lean towards APPROVED.
     - If it makes sense (>65% probability), accept it.
     - If selection -> Choose the most logical/efficient option.`,
    "LOGIC",
    language,
    attachment,
    historyLog
  );

  // 2. AI-2 (Safety/Mother)
  await delay(1500);
  const ai2Promise = consultNode(
    apiKey,
    userQuery,
    MagiNodeName.AI_2,
    `CRITERIA: DANGER (Risk), RUDENESS (Social Protocol), PLANNING.
     - EVALUATION (65% Rule): Check for 'DANGEROUS' or 'RUDE' elements.
     - If the risk is manageable and it's not overtly rude (>65% acceptable), lean towards APPROVED.
     - Don't be paranoid. Only DENY if there is a clear, significant threat or lack of planning.
     - If selection -> Choose the safest/most polite option.`,
    "SAFETY",
    language,
    attachment,
    historyLog
  );

  // 3. AI-3 (Intuition/Woman)
  await delay(1500);
  const ai3Promise = consultNode(
    apiKey,
    userQuery,
    MagiNodeName.AI_3,
    `CRITERIA: NUISANCE, VULGARITY, UNFAIRNESS.
     - EVALUATION (65% Rule): Check for 'NUISANCE', 'VULGAR', or 'UNFAIR' elements.
     - If it's not annoying, gross, or cheating (>65% acceptable), lean towards APPROVED.
     - Don't be too picky. Only DENY if it triggers a strong negative reaction.
     - If selection -> Choose the most interesting option.`,
    "INTUITION",
    language,
    attachment,
    historyLog
  );

  // Wait for all
  return Promise.all([ai1Promise, ai2Promise, ai3Promise]);
}