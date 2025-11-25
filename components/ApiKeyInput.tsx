import React, { useState, useEffect } from 'react';

interface ApiKeyInputProps {
  onSave: (key: string) => void;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onSave }) => {
  const [key, setKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in effect
    setIsVisible(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim().length > 10) {
      onSave(key.trim());
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="w-full max-w-md p-1 border-2 border-amber-800 bg-black relative shadow-[0_0_50px_rgba(245,158,11,0.2)]">
        
        {/* Decorative Borders */}
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-500"></div>
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-500"></div>
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-500"></div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-500"></div>

        <div className="bg-amber-900/10 p-8 flex flex-col items-center text-center space-y-6 border border-amber-900/50">
          
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-amber-500 tracking-widest glitch-text">SECURITY ALERT</h2>
            <div className="h-px w-full bg-amber-800"></div>
            <p className="text-xs text-amber-700 tracking-[0.2em] font-bold">ADS // AUTHENTICATION REQUIRED</p>
          </div>

          <div className="text-amber-800 text-xs font-mono leading-relaxed">
            <p>ACCESS TO THE DECISION SUPPORT SYSTEM IS RESTRICTED.</p>
            <p>PLEASE PROVIDE A VALID GEMINI API CREDENTIAL.</p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative group">
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-black border border-amber-800 text-amber-500 px-4 py-3 text-center tracking-widest focus:outline-none focus:border-amber-500 focus:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all placeholder-amber-900/50"
                placeholder="ENTER_API_KEY_HERE"
                autoFocus
              />
              <div className="absolute inset-0 border border-amber-500/20 pointer-events-none group-hover:border-amber-500/40 transition-colors"></div>
            </div>

            <button
              type="submit"
              disabled={key.length < 10}
              className="w-full bg-amber-700/20 border border-amber-600 text-amber-500 py-3 font-bold tracking-[0.2em] hover:bg-amber-600 hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              AUTHENTICATE
            </button>
          </form>

          <div className="mt-4 text-[10px] text-amber-900/60">
            <p>NO KEY DETECTED? OBTAIN CLEARANCE AT:</p>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noreferrer"
              className="text-amber-700 hover:text-amber-500 underline decoration-dashed underline-offset-4"
            >
              GOOGLE AI STUDIO
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};