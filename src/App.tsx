import { useState, useEffect } from 'react';
import { FileVideo, Shield, Key } from 'lucide-react';
import './App.css';
import './utils.css';

// Componentes a implementar
import Uploader from './components/Uploader';
import ProcessingView from './components/ProcessingView';
import ResultExport from './components/ResultExport';
import type { TranscriptResponse } from './types';

export type ProcessState = 'idle' | 'extracting' | 'transcribing' | 'done' | 'error';

function App() {
  // Intentar cargar la llave desde el entorno de Vercel/Vite. Si no existe, usar localStorage
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  const [apiKey, setApiKey] = useState<string>(envKey);
  const [isKeyValid, setIsKeyValid] = useState<boolean>(!!envKey);
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  
  const [processState, setProcessState] = useState<ProcessState>('idle');
  const [transcription, setTranscription] = useState<TranscriptResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!envKey) {
      const savedKey = localStorage.getItem('gemini_api_key');
      if (savedKey) {
        setApiKey(savedKey);
        setIsKeyValid(true);
      }
    }
  }, [envKey]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim().length > 15) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setIsKeyValid(true);
    }
  };

  const handleReset = () => {
    setVideoFile(null);
    setProcessState('idle');
    setTranscription(null);
    setErrorMsg('');
  };

  const handleResetKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setIsKeyValid(false);
    handleReset();
  };

  return (
    <div className="app-container">
      <header className="app-header animate-fade-in">
        <div className="container">
          <h1>
            <FileVideo size={40} className="text-primary" />
            Transcriptor Rápido
          </h1>
          <p className="subtitle">Sube tus videos y obtén el texto escrito al instante de forma fácil y rápida.</p>
        </div>
      </header>

      <main className="main-content container animate-fade-in">
        <div className="split-layout">
          {/* LEFT PANE: Uploader & Processing */}
          <div className="left-pane">
            <div className="glass-panel w-full p-6 relative">
              <div className="flex items-center gap-2 mb-6 border-b border-glass-border pb-4">
                 <div className="w-3 h-3 rounded-full bg-error"></div>
                 <div className="w-3 h-3 rounded-full bg-warning"></div>
                 <div className="w-3 h-3 rounded-full bg-success"></div>
                 <span className="ml-2 text-sm text-text-400 font-medium">Panel de Carga</span>
              </div>

              {processState === 'idle' && (
                 <>
                   {!isKeyValid ? (
                     <div className="glass-panel p-6 border border-warning/30 bg-warning/5 rounded-xl animate-fade-in relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-warning"></div>
                       <h3 className="text-white text-lg font-medium mb-2 flex items-center gap-2">
                         <Key size={18} className="text-warning" />
                         Protección de API
                       </h3>
                       <p className="text-text-400 text-sm mb-4">
                         Parece que no hay una API Key configurada en Vercel. Por seguridad, ingresa una llave de Google Gemini válida aquí abajo. Solo se guardará localmente en tu navegador.
                       </p>
                       <form onSubmit={handleSaveKey} className="flex gap-3">
                         <input 
                           type="password" 
                           placeholder="AIzaSy..." 
                           className="flex-1 bg-black/40 border border-glass-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                           value={apiKey}
                           onChange={(e) => setApiKey(e.target.value)}
                         />
                         <button type="submit" className="btn btn-primary px-6" disabled={apiKey.length < 15}>
                           Desbloquear
                         </button>
                       </form>
                     </div>
                   ) : (
                     <Uploader 
                       onFileSelect={setVideoFile} 
                       file={videoFile} 
                       onStart={() => setProcessState('extracting')} 
                     />
                   )}
                 </>
              )}

              {(processState === 'extracting' || processState === 'transcribing') && (
                 <ProcessingView 
                   state={processState} 
                   file={videoFile}
                   apiKey={apiKey}
                   onExtractionDone={(_url: string, _blob: Blob) => {
                     setProcessState('transcribing');
                   }}
                   onTranscriptionDone={(data: TranscriptResponse) => {
                     setTranscription(data);
                     setProcessState('done');
                   }}
                   onError={(err: string) => {
                     setErrorMsg(err);
                     setProcessState('error');
                   }}
                 />
              )}

              {processState === 'error' && (
                <div className="text-center py-10">
                  <div className="text-error mb-4">
                     <Shield size={48} className="mx-auto block" />
                  </div>
                  <h3 className="text-xl mb-2 text-white">Ocurrió un error</h3>
                  <p className="text-text-400 mb-6">{errorMsg}</p>
                  <div className="flex flex-col gap-3 justify-center items-center">
                    <button onClick={handleReset} className="btn btn-primary w-full max-w-xs">
                      Intentar nuevamente
                    </button>
                    <button onClick={handleResetKey} className="btn btn-glass w-full max-w-xs text-sm">
                      <Key size={16} /> Cambiar API Key
                    </button>
                  </div>
                </div>
              )}

              {processState === 'done' && (
                <div className="text-center py-10">
                   <div className="text-success mb-4">
                     <FileVideo size={48} className="mx-auto block" />
                   </div>
                   <h3 className="text-xl mb-2 text-white">Video procesado exitosamente</h3>
                   <p className="text-text-400 mb-6">La transcripción está disponible en el panel derecho.</p>
                   <button onClick={handleReset} className="btn btn-glass">
                     Subir nuevo video
                   </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANE: Results / Empty State */}
          <div className="right-pane">
            <div className="glass-panel w-full h-full p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6 border-b border-glass-border pb-4">
                 <span className="text-sm text-text-400 font-medium tracking-wide uppercase">Texto Transcrito</span>
                 {processState === 'done' && (
                    <span className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                       <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                       Completado
                    </span>
                 )}
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center relative min-h-[300px]">
                {processState === 'done' && transcription ? (
                   <ResultExport 
                     transcription={transcription} 
                     originalFileName={videoFile?.name || 'video_desconocido'}
                     onReset={handleReset} 
                   />
                ) : (
                   <div className="text-center opacity-50 flex flex-col items-center justify-center h-full">
                     <FileVideo size={48} className="text-text-500 mb-4" />
                     <p className="text-text-400 text-lg">Tu transcripción aparecerá aquí</p>
                     <p className="text-text-500 text-sm mt-2 max-w-xs">Sube un video a la izquierda para comenzar el proceso automático.</p>
                   </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;
