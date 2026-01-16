
export interface EditingState {
  brightness: number;
  contrast: number;
  saturation: number;
  edgeSmooth: number;
  edgeFeather: number;
  edgeContrast: number;
  edgeShift: number;
  brushMaskUrl: string | null;
  exportFormat: 'png' | 'jpeg' | 'webp';
  exportQuality: number;
  customFilename: string;
  isAdvancedMode: boolean;
  redBalance: number;
  greenBalance: number;
  blueBalance: number;
}

export interface ProcessedImage {
  id: string;
  originalUrl: string;
  processedUrl: string | null;
  status: 'idle' | 'processing' | 'completed' | 'error';
  timestamp: number;
  editingState?: EditingState;
}

export interface GeminiProcessingResult {
  imageUrl: string;
  success: boolean;
  error?: string;
}
