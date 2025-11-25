import React, { useState, useEffect } from 'react';
import { queryMagiSystem } from './services/geminiService';
import { MagiDecision, ConsensusStatus, MagiNodeName, MagiAttachment, ChatRecord, Language } from './types';
import { MagiHexagon } from './components/MagiHexagon';
import { InputConsole } from './components/InputConsole';
import { ChatLog } from './components/ChatLog';
import { ApiKeyInput } from './components/ApiKeyInput';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [status, setStatus] = useState<ConsensusStatus>('IDLE');
  const [decisions, setDecisions] = useState<MagiDecision[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatRecord[]>([]);
  const [language, setLanguage] = useState<Language>('JA');
  
  // Load API Key from local storage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('ADS_API_KEY');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSaveKey = (key: string) => {
    localStorage.setItem('ADS_API_KEY', key);
    setApiKey(key);
  };

  const handleResetKey = () => {
    localStorage.removeItem('ADS_API_KEY');
    setApiKey(null);
  };

  const handleQuerySubmit = async (query: string, attachment?: MagiAttachment) => {
    if (!apiKey) return;

    setStatus('PROCESSING');
    setDecisions([]); 

    try {
      const results = await queryMagiSystem(apiKey, query, language, attachment, chatHistory);
      setDecisions(results);
      setStatus('COMPLETE');
      
      const resultSummary = calculateResultSummary(results);
      
      const newRecord: ChatRecord = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        query,
        attachment,
        decisions: results,
        resultSummary: resultSummary || { text: "ERROR", color: "text-red-500" }
      };

      // Add to history
      setChatHistory(prev => [...prev, newRecord]);

    } catch (error) {
      console.error("System failure:", error);
      setStatus('IDLE'); // Reset on fatal error
    }
  };

  const getNodeData = (name: MagiNodeName) => decisions.find(d => d.node === name) || null;

  // Calculate consensus based on textual agreement AND sentiments
  const calculateResultSummary = (currentDecisions: MagiDecision[]) => {
    if (currentDecisions.length < 3) return null;

    // Check for System Failure / Quota Limits
    const isSystemHalted = currentDecisions.some(d => d.verdict === 'LIMIT');
    if (isSystemHalted) {
      return { text: "SYSTEM HALTED: QUOTA LIMIT", color: "text-red-600" };
    }
    
    // 1. Textual Consensus (Specific Options)
    // Count occurrences of each verdict string
    const verdictCounts: Record<string, number> = {};
    currentDecisions.forEach(d => {
      const v = d.verdict.trim().toUpperCase();
      verdictCounts[v] = (verdictCounts[v] || 0) + 1;
    });

    // Exclude generic status words from specific selection logic
    const genericTerms = ['APPROVED', 'DENIED', 'POSITIVE', 'NEGATIVE', 'INFO', 'ANSWER', 'DATA', 'SOLUTION', 'SAFE', 'DANGEROUS', 'LOGICAL', 'ILLOGICAL', 'REJECTED', 'VALID', 'CONDITIONAL', 'LIMIT', 'ERROR'];
    
    // Find if there is a winner that is NOT a generic term (i.e., a specific selection like "RAMEN")
    let selectionWinner = null;
    for (const [verdict, count] of Object.entries(verdictCounts)) {
      if (!genericTerms.some(term => verdict.includes(term)) && count >= 2) {
        selectionWinner = verdict;
        break;
      }
    }

    if (selectionWinner) {
       return { text: `SELECTED: ${selectionWinner}`, color: "text-blue-400" };
    }

    // 2. Sentiment Consensus (Binary/Tri-state)
    const positiveCount = currentDecisions.filter(d => d.sentiment === 'POSITIVE').length;
    const negativeCount = currentDecisions.filter(d => d.sentiment === 'NEGATIVE').length;
    const neutralCount = currentDecisions.filter(d => d.sentiment === 'NEUTRAL').length;
    
    // Check for General Information / Answers
    const isInfoQuery = currentDecisions.some(d => 
      ['INFO', 'ANSWER', 'DATA', 'SOLUTION'].includes(d.verdict) || 
      (d.sentiment === 'NEUTRAL' && d.verdict !== 'NEUTRAL')
    );

    if (isInfoQuery && neutralCount >= 2) {
       return { text: "DATA RETRIEVED", color: "text-blue-400" };
    }

    // Unanimous cases
    if (positiveCount === 3) return { text: "UNANIMOUS APPROVAL", color: "text-amber-500" };
    if (negativeCount === 3) return { text: "TOTAL REJECTION", color: "text-red-600" };
    
    // Majority cases
    if (positiveCount >= 2) return { text: "CONDITIONAL APPROVAL", color: "text-amber-500" };
    if (negativeCount >= 2) return { text: "REJECTION", color: "text-red-600" };
    
    // Split/Neutral cases
    if (neutralCount === 3) return { text: "INSUFFICIENT DATA", color: "text-blue-400" };
    
    // Default tie breaker
    return { text: "ADS HOLD", color: "text-blue-400" };
  };

  const currentResult = status === 'COMPLETE' ? calculateResultSummary(decisions) : null;

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'JA' ? 'EN' : 'JA');
  };

  return (
    <div className="h-screen bg-black text-amber-500 flex flex-col relative overflow-hidden font-mono selection:bg-amber-500 selection:text-black">
      
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none opacity-10" style={{
        backgroundImage: "radial-gradient(circle at 50% 50%, #ff9d00 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }}></div>

      {/* Header - Compact */}
      <header className="relative z-10 w-full flex justify-between items-center border-b-2 border-amber-600 px-6 py-3 bg-black/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
           <h1 className="text-2xl font-black tracking-tighter italic transform -skew-x-12">ADS // Ai Decision System</h1>
           <span className="text-[10px] tracking-[0.3em] hidden md:block">CHAT INTERFACE MODE</span>
        </div>
        
        <div className="flex items-center gap-6">
          {apiKey && (
            <button
              onClick={handleResetKey}
              className="text-[10px] border border-amber-900 px-2 py-1 text-amber-800 hover:text-red-500 hover:border-red-500 transition-colors uppercase tracking-widest"
              title="Reset API Key"
            >
              [RESET KEY]
            </button>
          )}

          <button 
            onClick={toggleLanguage}
            className="flex items-center border border-amber-700 bg-amber-900/20 px-2 py-1 gap-2 hover:bg-amber-500 hover:text-black transition-colors"
            title="Toggle Language"
          >
             <span className={`text-xs font-bold ${language === 'EN' ? 'opacity-100 underline' : 'opacity-40'}`}>EN</span>
             <span className="text-xs opacity-40">/</span>
             <span className={`text-xs font-bold ${language === 'JA' ? 'opacity-100 underline' : 'opacity-40'}`}>JP</span>
          </button>
        </div>
      </header>

      {/* Main Content - Flex Grow - Adjusted for more Chat Log space */}
      <main className="flex-1 flex flex-col relative z-10 w-full max-w-6xl mx-auto overflow-hidden">
        
        {!apiKey ? (
          <ApiKeyInput onSave={handleSaveKey} />
        ) : (
          <>
            {/* Top: Active Monitors (Hexagons) */}
            <div className="shrink-0 py-4 flex justify-center items-center w-full min-h-[260px] md:min-h-[280px]">
              <div className="grid grid-cols-3 gap-2 md:gap-6 items-center transform scale-[0.65] md:scale-75 origin-top">
                <MagiHexagon 
                  name={MagiNodeName.AI_1} 
                  role="LOGIC" 
                  data={getNodeData(MagiNodeName.AI_1)} 
                  loading={status === 'PROCESSING'}
                  delayIndex={0}
                />
                <MagiHexagon 
                  name={MagiNodeName.AI_2} 
                  role="SAFETY" 
                  data={getNodeData(MagiNodeName.AI_2)} 
                  loading={status === 'PROCESSING'}
                  delayIndex={1}
                />
                <MagiHexagon 
                  name={MagiNodeName.AI_3} 
                  role="INTUITION" 
                  data={getNodeData(MagiNodeName.AI_3)} 
                  loading={status === 'PROCESSING'}
                  delayIndex={2}
                />
              </div>
            </div>

            {/* CONSENSUS BAR - Clearly distinct area */}
            <div className="shrink-0 w-full px-4 mb-2">
              <div className={`w-full border-y-2 bg-black/80 py-3 text-center transition-colors duration-500 ${
                status === 'COMPLETE' && currentResult 
                  ? (currentResult.color.replace('text-', 'border-')) 
                  : 'border-amber-900/30'
              }`}>
                {status === 'COMPLETE' && currentResult ? (
                   <div className={`text-2xl md:text-4xl font-black tracking-tighter ${currentResult.color} animate-in fade-in slide-in-from-top-2`}>
                     &gt;&gt;&gt; {currentResult.text} &lt;&lt;&lt;
                   </div>
                ) : (
                   <div className="text-amber-900 text-sm tracking-[0.5em] animate-pulse">
                     {status === 'PROCESSING' ? 'DELIBERATING...' : 'AWAITING INPUT'}
                   </div>
                )}
              </div>
            </div>

            {/* Middle: Chat Log (Scrollable) */}
            <div className="flex-1 overflow-hidden relative w-full flex flex-col min-h-0">
               <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none"></div>
               <ChatLog history={chatHistory} />
               <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none"></div>
            </div>

            {/* Bottom: Input Console */}
            <div className="shrink-0 w-full pb-4 px-4 pt-2">
               <InputConsole onSubmit={handleQuerySubmit} loading={status === 'PROCESSING'} />
            </div>
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full text-center py-1 text-[8px] text-amber-900 tracking-widest relative z-10 bg-black">
         SYSTEM: ADS // AI DECISION SUPPORT
      </footer>

    </div>
  );
};

export default App;