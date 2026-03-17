import React, { useState, useRef } from 'react';
import { UploadCloud, FileVideo, PlayCircle, X } from 'lucide-react';

interface UploaderProps {
  onFileSelect: (file: File | null) => void;
  file: File | null;
  onStart: () => void;
}

const Uploader: React.FC<UploaderProps> = ({ onFileSelect, file, onStart }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    if (selectedFile.type.includes('video') || selectedFile.type.includes('audio')) {
      onFileSelect(selectedFile);
    } else {
      alert("Por favor selecciona un archivo de audio o video válido.");
    }
  };

  return (
    <div className="w-full flex justify-center flex-col items-center">
      <h2 className="text-2xl text-text-100 font-bold mb-2">Sube tu Video</h2>
      <p className="text-text-400 mb-8 text-center max-w-md">Selecciona o arrastra el video del que quieres obtener el texto. Nosotros nos encargamos del resto.</p>

      {!file ? (
        <div 
          className={`w-full max-w-lg p-14 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer relative overflow-hidden group ${isDragging ? 'border-primary bg-primary/10 shadow-[0_0_40px_rgba(139,92,246,0.2)] scale-[1.02]' : 'border-glass-border bg-glass-bg/40 hover:border-primary/50 hover:bg-glass-bg'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
           {/* Background Glow Effect */}
           <div className="uploader-glow"></div>
           
           <div className="relative z-10 flex flex-col items-center">
             <div className={`p-4 rounded-full mb-6 transition-all duration-300 ${isDragging ? 'bg-primary text-white scale-110' : 'bg-glass-bg border border-glass-border text-primary group-hover:scale-110 group-hover:bg-primary/20'}`}>
               <UploadCloud size={52} className={isDragging ? 'animate-bounce' : 'animate-float'} />
             </div>
             
             <p className="font-bold text-xl text-text-100 mb-2">
                {isDragging ? 'Suelta el video aquí' : 'Selecciona o arrastra tu video'}
             </p>
             <p className="text-sm text-text-400 font-medium">Formatos aceptados: MP4, MOV, MP3...</p>
           </div>
           
           <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             accept="video/*,audio/*"
             onChange={handleFileInput}
           />
        </div>
      ) : (
        <div className="w-full max-w-lg glass-card p-6 flex flex-col animate-fade-in relative shadow-lg">
           <button 
             onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
             className="absolute top-4 right-4 text-text-500 hover:text-error transition"
           >
             <X size={20} />
           </button>
           
           <div className="flex items-center gap-4 mb-6">
             <div className="p-4 rounded-lg bg-primary/20 text-primary">
               <FileVideo size={32} />
             </div>
             <div>
               <p className="font-bold text-lg text-text-100 truncate max-w-[250px]">{file.name}</p>
               <p className="text-sm text-text-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
             </div>
           </div>

           <button onClick={onStart} className="btn btn-primary w-full py-3 text-lg group">
             ¡Transcribir ahora! 
             <PlayCircle className="group-hover:translate-x-1 transition" size={20} />
           </button>
        </div>
      )}
    </div>
  );
};

export default Uploader;
