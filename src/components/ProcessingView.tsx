import React, { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import type { TranscriptChunk, TranscriptResponse } from '../types';

interface ProcessingViewProps {
  state: 'extracting' | 'transcribing';
  file: File | null;
  apiKey: string;
  onExtractionDone: (url: string, blob: Blob) => void;
  onTranscriptionDone: (data: TranscriptResponse) => void;
  onError: (error: string) => void;
}

const ProcessingView: React.FC<ProcessingViewProps> = ({ state, file, apiKey, onExtractionDone, onTranscriptionDone, onError }) => {
  const extractionStartedRef = useRef(false);

  useEffect(() => {
    // Ya no extraemos audio localmente, pasamos directo a enviar el archivo a la API
    // Para no romper el flujo de App.tsx, fingiremos que terminó la "extracción" instantáneamente
    if (state === 'extracting') {
      if (!extractionStartedRef.current && file) {
        extractionStartedRef.current = true;
        
        // Simular que devolvemos un audioUrl/blob vacío solo por compatibilidad de tipos
        const dummyBlob = new Blob([], { type: 'audio/mp3' });
        onExtractionDone('', dummyBlob); 
        
        // Iniciar transcripción con el archivo de video original
        transcribeFile(file);
      }
    }
  }, [state, file]);

  const transcribeFile = async (targetFile: File) => {
    try {
      if (apiKey.startsWith('AIzaSy')) {
        // --- GEMINI API (FILE API FOR LARGE FILES UP TO 2GB) ---
        let mimeType = targetFile.type;
        if (!mimeType || mimeType.includes('quicktime') || mimeType.includes('mkv') || mimeType === 'video/x-matroska') {
           mimeType = 'video/mp4';
        } else if (mimeType.includes('audio') && !['audio/aac', 'audio/flac', 'audio/mp3', 'audio/m4a', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm'].includes(mimeType)) {
           mimeType = 'audio/mp3'; 
        }

        // 1. Upload File directly to Gemini API
        const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=media&key=${apiKey}`;
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': mimeType,
          },
          body: targetFile
        });
        
        if (!uploadRes.ok) {
           const errJson = await uploadRes.json().catch(() => ({}));
           throw new Error(errJson.error?.message || 'Error subiendo el video a los servidores de Gemini.');
        }
        
        const uploadData = await uploadRes.json();
        const fileUri = uploadData.file.uri;
        const fileName = uploadData.file.name;

        // 1.5 Polling: Wait for Google to process the video (ACTIVE state)
        // La API de subida devuelve { file: { name: '...', uri: '...', state: '...' } }
        let fileState = uploadData.file.state || 'PROCESSING';
        
        // Bloqueamos la ejecución hasta que el estado sea explícitamente ACTIVE
        while (fileState !== 'ACTIVE') {
           if (fileState === 'FAILED') {
              throw new Error('Los laboratorios de Google reportan que el archivo está corrupto o es irreconocible para ellos.');
           }
           // Esperamos 5 segundos antes de volver a preguntar
           await new Promise((resolve) => setTimeout(resolve, 5000));
           
           const checkRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`);
           if (!checkRes.ok) {
              throw new Error('Error de red al intentar consultar el estado del video en Google.');
           }
           
           const checkData = await checkRes.json();
           // Si por alguna razón la API no devuelve state en un frame, asumimos que sigue procesando
           fileState = checkData.state || 'PROCESSING';
        }

        // 2. Generate Content using the File URI
        const generationUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const genRes = await fetch(generationUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Transcribe the following video exactly in Spanish. Organize the transcription into logical, cohesive chunks or paragraphs based on topic changes or natural breaks in the speech. Return a strict JSON object with two fields: 'suggestedFileName' (a short, descriptive, kebab-case title summarizing the whole video topic, max 4 words) and 'chunks' (an array where each object has: 'topic', 'summary', and 'content' as the exact transcription). Do not skip any spoken word." },
                { fileData: { mimeType: mimeType, fileUri: fileUri } }
              ]
            }],
            generationConfig: { 
              temperature: 0.1,
              responseMimeType: "application/json",
              responseSchema: {
                type: "object",
                properties: {
                  suggestedFileName: { type: "string" },
                  chunks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string" },
                        summary: { type: "string" },
                        content: { type: "string" }
                      },
                      required: ["topic", "summary", "content"]
                    }
                  }
                },
                required: ["suggestedFileName", "chunks"]
              }
            }
          })
        });

        if (!genRes.ok) {
          const errJson = await genRes.json().catch(() => ({}));
          throw new Error(errJson.error?.message || 'Error procesando la transcripción en Gemini API.');
        }
        
        const data = await genRes.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if(!textResponse) throw new Error("La API no devolvió ninguna transcripción.");
        
        try {
          const parsedResponse: TranscriptResponse = JSON.parse(textResponse);
          onTranscriptionDone(parsedResponse);
        } catch (parseError) {
          console.error("Error parseando JSON de Gemini:", parseError);
          onTranscriptionDone({
            suggestedFileName: targetFile.name.replace(/\.[^/.]+$/, "") + "-rag",
            chunks: [{ topic: "Transcripción General", summary: "Video completo", content: textResponse }]
          });
        }
      } else {
        // --- OPENAI / GROQ API ---
        const formData = new FormData();
        // Groq y OpenAI Whisper soportan nativamente archivos .mp4, .webm, etc.
        // Simulamos un nombre seguro
        const cleanExt = targetFile.type.includes('video') ? 'mp4' : 'mp3';
        formData.append('file', targetFile, `media.${cleanExt}`);
        formData.append('response_format', 'verbose_json'); // Request segments
        formData.append('language', 'es'); // Asumimos español

        const isGroq = apiKey.startsWith('gsk_');
        const apiUrl = isGroq
            ? 'https://api.groq.com/openai/v1/audio/transcriptions'
            : 'https://api.openai.com/v1/audio/transcriptions';

        const modelName = isGroq ? 'whisper-large-v3-turbo' : 'whisper-1';
        formData.set('model', modelName);

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          body: formData
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || `Error en API externa (${modelName}). Verifica el tamaño del archivo.`);
        }

        const data = await res.json();
        
        let finalChunks: TranscriptChunk[] = [];
        
        if (data.segments && Array.isArray(data.segments)) {
           let currentContent = "";
           let segmentCount = 0;
           let topicIndex = 1;
           
           for (let i = 0; i < data.segments.length; i++) {
              currentContent += data.segments[i].text + " ";
              segmentCount++;
              
              if (segmentCount >= 8 || i === data.segments.length - 1) {
                 finalChunks.push({
                   topic: `Fragmento de Contexto #${topicIndex}`,
                   summary: "Sección extraída automáticamente del flujo de audio.",
                   content: currentContent.trim()
                 });
                 currentContent = "";
                 segmentCount = 0;
                 topicIndex++;
              }
           }
        } else {
           finalChunks = [{
             topic: "Transcripción General",
             summary: "Audio completo",
             content: data.text || "No se pudo extraer texto."
           }];
        }

        // Para Whisper, no tenemos el título corto inteligente (a menos que hagamos un pase extra)
        // Usaremos el nombre bruto del archivo como fallback seguro.
        const fallbackName = targetFile.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, '-').toLowerCase() + "-rag";
        
        onTranscriptionDone({
          suggestedFileName: fallbackName,
          chunks: finalChunks
        });
      }
    } catch (err: any) {
      console.error(err);
      onError('Error crítico transcribiendo: ' + err.message);
    }
  };

  return (
    <div className="w-full flex justify-center py-10 animate-fade-in">
       <div className="flex flex-col items-center">
         
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-primary-glow blur-xl rounded-full opacity-50 pulse-glow"></div>
            <div className="w-24 h-24 rounded-full glass-panel flex items-center justify-center relative z-10 border-primary">
                 <Mic size={40} className="text-accent animate-pulse" />
            </div>
         </div>

         <h3 className="text-xl font-semibold mb-2 text-text-100">
          Enviando y analizando video inteligente...
        </h3>
        <p className="text-text-400">
          Solo tomará unos segundos...
        </p>

         <div className="w-full max-w-sm h-3 bg-glass-border/30 rounded-full overflow-hidden mt-6 relative shadow-inner">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary via-accent to-primary animate-[pulse_2s_ease-in-out_infinite] blur-[1px] w-full opacity-80"></div>
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent w-full animate-[shimmer_2s_infinite]"></div>
         </div>
       </div>
    </div>
  );
};

export default ProcessingView;
