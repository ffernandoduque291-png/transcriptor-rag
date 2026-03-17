import React from 'react';
import { Copy, RefreshCw, Database } from 'lucide-react';
import type { TranscriptResponse } from '../types';

interface ResultExportProps {
  transcription: TranscriptResponse;
  originalFileName: string;
  onReset: () => void;
}

const ResultExport: React.FC<ResultExportProps> = ({ transcription, originalFileName, onReset }) => {
  const handleDownload = () => {
    const element = document.createElement('a');
    const jsonStr = JSON.stringify(transcription.chunks, null, 2);
    const file = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    
    // Usar el nombre sugerido por la IA o fallback
    const fileName = transcription.suggestedFileName || (originalFileName ? originalFileName.replace(/\.[^/.]+$/, "") + "-rag" : "rag-dataset");
    
    element.href = URL.createObjectURL(file);
    element.download = `${fileName}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(transcription.chunks, null, 2));
    alert('¡Dataset JSON copiado al portapapeles!');
  };

  return (
    <div className="w-full flex flex-col animate-fade-in h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-100">¡Tu texto está listo!</h2>
          <p className="text-text-400">Puedes copiar el texto o descargar el archivo transcrito.</p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={onReset} className="btn btn-glass">
            <RefreshCw size={18} />
            Nuevo Video
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-6 custom-scrollbar pr-2 max-h-[55vh]">
        <div className="flex flex-col gap-4">
          {transcription.chunks.map((chunk, index) => (
            <div key={index} className="glass-panel p-5 border-l-4 border-l-primary hover:border-l-accent transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold px-3 py-1 bg-primary/20 text-primary rounded-full tracking-wider uppercase">
                  {chunk.topic}
                </span>
              </div>
              <p className="text-sm text-text-200 font-medium mb-3 border-b border-glass-border pb-3">"{chunk.summary}"</p>
              <p className="text-sm text-text-400 font-light leading-relaxed">
                {chunk.content}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-auto">
        <button onClick={handleDownload} className="btn btn-primary py-3 px-6 text-base">
          <Database size={18} />
          Descargar JSON (Vectores)
        </button>
        <button onClick={handleCopy} className="btn btn-glass py-3 px-6 text-base">
          <Copy size={18} />
          Copiar JSON
        </button>
      </div>
    </div>
  );
};

export default ResultExport;
