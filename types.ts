export enum MagiNodeName {
  AI_1 = 'AI-1',
  AI_2 = 'AI-2',
  AI_3 = 'AI-3',
}

export type Language = 'EN' | 'JA';

export type MagiSentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export interface MagiDecision {
  node: MagiNodeName;
  verdict: string; // Dynamic short decision title (e.g. "PERMIT", "DANGEROUS", "REJECT")
  sentiment: MagiSentiment; // For UI coloring and consensus calculation
  reasoning: string;
  role: string; // The persona description (Scientist, Mother, Woman)
  sources?: { title: string; uri: string }[]; // Grounding sources from Google Search
}

export type ConsensusStatus = 'IDLE' | 'PROCESSING' | 'COMPLETE';

export interface MagiResponseSchema {
  verdict: string;
  sentiment: MagiSentiment;
  reasoning: string;
}

export interface MagiAttachment {
  mimeType: string;
  data: string; // Base64 encoded string (raw, no prefix)
}

export interface ChatRecord {
  id: string;
  timestamp: number;
  query: string;
  attachment?: MagiAttachment;
  decisions: MagiDecision[];
  resultSummary: {
    text: string;
    color: string;
  };
}