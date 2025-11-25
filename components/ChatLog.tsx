import React, { useEffect, useRef } from 'react';
import { ChatRecord } from '../types';

interface ChatLogProps {
  history: ChatRecord[];
}

export const ChatLog: React.FC<ChatLogProps> = ({ history }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  if (history.length === 0) return null;

  const getSentimentStyle = (sentiment: string) => {
    switch (sentiment) {
      case 'POSITIVE': return 'border-amber-700/50 bg-amber-900/10 text-amber-500';
      case 'NEGATIVE': return 'border-red-900/50 bg-red-900/10 text-red-500';
      case 'NEUTRAL': return 'border-blue-900/50 bg-blue-900/10 text-blue-400';
      default: return 'border-gray-800 text-gray-500';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex-1 overflow-y-auto custom-scrollbar border-t border-amber-900/30 bg-black/50 p-4 space-y-6">
      {history.map((record) => (
        <div key={record.id} className="border-l-2 border-amber-800 pl-4 py-2 relative animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Timestamp & Header */}
          <div className="flex items-center gap-2 text-[10px] text-amber-700 font-bold tracking-widest mb-2">
            <span>LOG_ID: {record.id.slice(0, 8)}</span>
            <span>::</span>
            <span>{new Date(record.timestamp).toLocaleTimeString()}</span>
          </div>

          {/* User Query */}
          <div className="mb-4">
             <div className="text-amber-300 text-sm font-bold uppercase mb-1">
               &gt; USER INPUT
             </div>
             <p className="text-amber-500 font-mono text-lg leading-snug">
               {record.query}
             </p>
             {record.attachment && (
               <div className="mt-2 text-xs text-amber-600 border border-amber-900/50 inline-block px-2 py-1">
                 [ATTACHMENT: {record.attachment.mimeType}]
               </div>
             )}
          </div>

          {/* MAGI Response Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            {record.decisions.map((decision) => (
              <div 
                key={decision.node} 
                className={`p-2 border ${getSentimentStyle(decision.sentiment)} flex flex-col h-full`}
              >
                <div className="flex justify-between items-start mb-1">
                   <div className="text-[10px] font-bold opacity-80">
                     {decision.node}
                   </div>
                   <div className="text-[10px] font-black tracking-widest uppercase">
                      {decision.verdict}
                   </div>
                </div>
                <div className="text-xs leading-tight opacity-90 mb-2 flex-1">
                  "{decision.reasoning}"
                </div>
                
                {/* Source Citations */}
                {decision.sources && decision.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-dashed border-current opacity-50">
                    <div className="text-[8px] uppercase tracking-wider mb-1">SOURCE DATA:</div>
                    <ul className="space-y-1">
                      {decision.sources.map((source, idx) => (
                        <li key={idx} className="truncate">
                          <a 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[9px] hover:underline hover:text-white truncate block"
                            title={source.title}
                          >
                            [{idx + 1}] {source.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Final Consensus */}
          <div className={`text-sm font-bold tracking-widest ${record.resultSummary.color} mt-2 border-t border-dashed border-gray-800 pt-2`}>
            &gt;&gt;&gt; CONSENSUS: {record.resultSummary.text}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};