import React from 'react';
import { MagiDecision, MagiNodeName } from '../types';

interface MagiHexagonProps {
  name: MagiNodeName;
  role: string;
  data: MagiDecision | null;
  loading: boolean;
  delayIndex: number; // For staggered animation
}

export const MagiHexagon: React.FC<MagiHexagonProps> = ({ name, data, loading, delayIndex }) => {
  
  // Default Idle State
  let borderColor = "border-amber-900";
  let textColor = "text-amber-800";
  let statusText = "STANDBY";
  let bgColor = "bg-black";
  let glowEffect = "";

  if (loading) {
    statusText = "PROCESSING";
    borderColor = "border-amber-400 animate-pulse";
    textColor = "text-amber-500";
  } else if (data) {
    statusText = data.verdict;
    
    switch (data.sentiment) {
      case 'POSITIVE':
        borderColor = "border-amber-500";
        textColor = "text-amber-500";
        glowEffect = "drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]";
        break;
      case 'NEGATIVE':
        borderColor = "border-red-600";
        textColor = "text-red-500";
        glowEffect = "drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]";
        break;
      case 'NEUTRAL':
        borderColor = "border-blue-500";
        textColor = "text-blue-400";
        glowEffect = "drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]";
        break;
    }
  }

  return (
    <div 
      className={`relative flex flex-col items-center justify-center p-6 border-2 ${borderColor} ${bgColor} transition-all duration-500`}
      style={{
        clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
        height: "320px",
        width: "280px",
        animationDelay: `${delayIndex * 150}ms`
      }}
    >
      {/* Internal Grid Decoration */}
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(0deg,transparent_24%,rgba(255,165,0,.3)_25%,rgba(255,165,0,.3)_26%,transparent_27%,transparent_74%,rgba(255,165,0,.3)_75%,rgba(255,165,0,.3)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(255,165,0,.3)_25%,rgba(255,165,0,.3)_26%,transparent_27%,transparent_74%,rgba(255,165,0,.3)_75%,rgba(255,165,0,.3)_76%,transparent_77%,transparent)] bg-[length:30px_30px]"></div>

      <div className="z-10 flex flex-col items-center text-center space-y-4 w-full px-4">
        <h2 className={`text-2xl font-bold tracking-widest ${data ? textColor : 'text-amber-700'} uppercase border-b border-current pb-1 w-full`}>
          {name}
        </h2>
        
        {/* Sub-label Removed as per request */}
        
        <div className="h-24 flex items-center justify-center w-full">
          {loading ? (
             <div className="flex space-x-1">
                <div className="w-2 h-8 bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-8 bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-8 bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
          ) : data ? (
            <div className="flex flex-col gap-2 w-full">
              <span className={`text-3xl font-black tracking-tighter leading-none break-words ${glowEffect} ${textColor}`}>
                {statusText}
              </span>
              <p className={`text-[10px] md:text-xs font-mono leading-tight ${textColor} opacity-90`}>
                "{data.reasoning}"
              </p>
            </div>
          ) : (
             <span className="text-amber-900 animate-pulse text-4xl font-bold">...</span>
          )}
        </div>

        <div className="w-full flex justify-between text-[10px] text-amber-800">
           <span>CPU: {loading ? Math.floor(Math.random() * 99) : '00'}%</span>
           <span>DATA: {loading ? 'RECEIVING' : 'WAITING'}</span>
        </div>
      </div>
    </div>
  );
};