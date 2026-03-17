export interface TranscriptChunk {
  topic: string;
  summary: string;
  content: string;
}

export interface TranscriptResponse {
  suggestedFileName: string;
  chunks: TranscriptChunk[];
}
