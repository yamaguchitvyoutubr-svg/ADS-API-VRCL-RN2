import React, { useState, useRef } from 'react';
import { MagiAttachment } from '../types';

interface InputConsoleProps {
  onSubmit: (query: string, attachment?: MagiAttachment) => void;
  loading: boolean;
}

export const InputConsole: React.FC<InputConsoleProps> = ({ onSubmit, loading }) => {
  const [query, setQuery] = useState('');
  const [attachment, setAttachment] = useState<{ file: File; base64: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (query.trim() && !loading) {
      const payloadAttachment = attachment
        ? { mimeType: attachment.file.type, data: attachment.base64 }
        : undefined;
      
      onSubmit(query, payloadAttachment);
      setQuery('');
      setAttachment(null);
      // Reset height
      if (textAreaRef.current) textAreaRef.current.style.height = 'auto';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        // Extract raw base64 without the data URL prefix
        const base64 = result.split(',')[1];
        setAttachment({ file, base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    // Auto-expand
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 border-2 border-amber-700 bg-black p-1 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
      <div className="bg-amber-900/10 p-4 border border-amber-900/50 relative overflow-hidden">
        
        {/* Decorative corner markers */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-500"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-500"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-500"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-500"></div>

        <div className="mb-2 flex items-center justify-between text-xs text-amber-600 tracking-wider font-bold">
           <div className="flex gap-2">
             <span className="bg-amber-600 text-black px-1">INPUT</span>
             <span>SYS.DILEMMA_INPUT_INTERFACE_V8.2</span>
           </div>
        </div>

        {/* Attachment Display */}
        {attachment && (
          <div className="mb-4 flex items-center justify-between bg-amber-900/30 border border-amber-700/50 p-2 text-xs">
            <div className="flex items-center gap-2 text-amber-500">
               <span className="animate-pulse">▶</span>
               <span>DATA LOADED: {attachment.file.name.toUpperCase()}</span>
               <span className="opacity-50">[{Math.round(attachment.file.size / 1024)}KB]</span>
            </div>
            <button 
              type="button" 
              onClick={clearAttachment}
              className="px-2 py-1 hover:bg-red-900/50 hover:text-red-500 text-amber-700 border border-transparent hover:border-red-800 transition-colors uppercase"
            >
              [EJECT]
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          
          {/* File Input Trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="group flex flex-col items-center justify-center p-2 border border-amber-800 hover:border-amber-500 hover:bg-amber-900/20 transition-all cursor-pointer h-[46px] w-[46px] mb-1"
            title="Upload Data File"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-700 group-hover:text-amber-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.71-5.71a9.008 9.008 0 01-9.008 5.71h-.015a9.008 9.008 0 01-9.008-9.008v-.016a9.008 9.008 0 019.008-9.008h.016a9.008 9.008 0 019.008 9.008v.016m0 0v-4.5" />
            </svg>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept="image/*,application/pdf,text/plain"
          />

          <div className="flex-1 relative">
            <span className="absolute left-0 top-3 text-amber-500 font-bold text-lg animate-blink">&gt;</span>
            <textarea
              ref={textAreaRef}
              value={query}
              onChange={handleInput}
              disabled={loading}
              rows={1}
              className="w-full bg-transparent border-b-2 border-amber-800 text-amber-400 font-mono text-lg py-2 pl-6 focus:outline-none focus:border-amber-500 placeholder-amber-900 transition-colors uppercase resize-none overflow-hidden"
              placeholder="ENTER PROPOSAL FOR DELIBERATION..."
              style={{ minHeight: '44px' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-2 bg-amber-700/20 border border-amber-600 text-amber-500 font-bold tracking-widest hover:bg-amber-600 hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm h-[46px] mb-1"
          >
            TRANSMIT
          </button>
        </form>
      </div>
    </div>
  );
};