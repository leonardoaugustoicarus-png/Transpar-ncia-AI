
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Download, 
  RefreshCcw, 
  Trash2, 
  Wand2, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Sparkles, 
  Layers, 
  Zap, 
  ChevronRight, 
  FileText, 
  Plus, 
  Minus, 
  RotateCcw,
  Sun,
  Contrast as ContrastIcon,
  Droplet,
  Eye,
  Settings,
  Image as ImageFileIcon,
  MousePointer2,
  Eraser,
  Paintbrush,
  Maximize2,
  Edit3,
  Activity,
  Scissors,
  Save,
  FolderOpen,
  Palette
} from 'lucide-react';
import { removeBackground } from './services/geminiService';
import { ProcessedImage, EditingState } from './types';

const App: React.FC = () => {
  const [currentImage, setCurrentImage] = useState<ProcessedImage | null>(null);
  const [history, setHistory] = useState<ProcessedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [customFilename, setCustomFilename] = useState('resultado-ia');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  
  // Basic Adjustment States
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [showPreviewOnOriginal, setShowPreviewOnOriginal] = useState(true);

  // Advanced Mode States
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [maskViewMode, setMaskViewMode] = useState<'standard' | 'mask' | 'overlay'>('standard');
  const [edgeSmooth, setEdgeSmooth] = useState(0);
  const [edgeFeather, setEdgeFeather] = useState(0);
  const [edgeContrast, setEdgeContrast] = useState(100);
  const [edgeShift, setEdgeShift] = useState(0);
  
  // Color Balance States
  const [redBalance, setRedBalance] = useState(100);
  const [greenBalance, setGreenBalance] = useState(100);
  const [blueBalance, setBlueBalance] = useState(100);
  
  // Correction Brush States
  const [brushMode, setBrushMode] = useState<'restore' | 'erase' | null>(null);
  const [brushSize, setBrushSize] = useState(30);
  const [brushPos, setBrushPos] = useState({ x: -100, y: -100 });
  const brushCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Zoom States
  const [zoomOriginal, setZoomOriginal] = useState(1);
  const [zoomProcessed, setZoomProcessed] = useState(1);

  // Export Settings
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [exportQuality, setExportQuality] = useState(90);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedImgRef = useRef<HTMLImageElement>(null);

  // Load history and session on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('transparencia_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    localStorage.setItem('transparencia_history', JSON.stringify(history));
  }, [history]);

  // Handle restoring the brush mask from a project state
  useEffect(() => {
    if (currentImage?.editingState?.brushMaskUrl && brushCanvasRef.current) {
      const canvas = brushCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const maskImg = new Image();
      maskImg.onload = () => {
        const originalImg = new Image();
        originalImg.onload = () => {
          canvas.width = originalImg.width;
          canvas.height = originalImg.height;
          ctx?.drawImage(maskImg, 0, 0);
        };
        originalImg.src = currentImage.originalUrl;
      };
      maskImg.src = currentImage.editingState.brushMaskUrl;
    }
  }, [currentImage?.id]);

  const getCurrentEditingState = (): EditingState => ({
    brightness, contrast, saturation,
    edgeSmooth, edgeFeather, edgeContrast, edgeShift,
    brushMaskUrl: brushCanvasRef.current?.toDataURL() || null,
    exportFormat, exportQuality, customFilename,
    isAdvancedMode,
    redBalance, greenBalance, blueBalance
  });

  const saveProject = (explicit: boolean = true) => {
    if (!currentImage) return;
    if (explicit) setSaveStatus('saving');

    const state = getCurrentEditingState();
    const updatedImage: ProcessedImage = {
      ...currentImage,
      editingState: state,
      timestamp: Date.now()
    };

    setCurrentImage(updatedImage);
    setHistory(prev => {
      const filtered = prev.filter(p => p.id !== updatedImage.id);
      return [updatedImage, ...filtered].slice(0, 15);
    });

    if (explicit) {
      setTimeout(() => setSaveStatus('success'), 400);
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
    
    localStorage.setItem('transparencia_current_session', JSON.stringify(updatedImage));
  };

  const loadProject = (project: ProcessedImage) => {
    if (currentImage && currentImage.id !== project.id) {
       if (!confirm("Isso substituirá seu trabalho atual. Deseja continuar?")) return;
    }

    setCurrentImage(project);
    const s = project.editingState;
    if (s) {
      setBrightness(s.brightness);
      setContrast(s.contrast);
      setSaturation(s.saturation);
      setEdgeSmooth(s.edgeSmooth);
      setEdgeFeather(s.edgeFeather);
      setEdgeContrast(s.edgeContrast);
      setEdgeShift(s.edgeShift);
      setExportFormat(s.exportFormat);
      setExportQuality(s.exportQuality);
      setCustomFilename(s.customFilename);
      setIsAdvancedMode(s.isAdvancedMode);
      setRedBalance(s.redBalance ?? 100);
      setGreenBalance(s.greenBalance ?? 100);
      setBlueBalance(s.blueBalance ?? 100);
    } else {
      resetAdjustments();
    }
    setZoomOriginal(1);
    setZoomProcessed(1);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | undefined;
    if ('files' in e.target && e.target.files) file = e.target.files[0];
    else if ('dataTransfer' in e && e.dataTransfer.files) {
      e.preventDefault();
      file = e.dataTransfer.files[0];
    }
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const newImage: ProcessedImage = {
        id: Math.random().toString(36).substr(2, 9),
        originalUrl: reader.result as string,
        processedUrl: null,
        status: 'idle',
        timestamp: Date.now(),
      };
      setCurrentImage(newImage);
      resetAdjustments();
      setZoomOriginal(1);
      setZoomProcessed(1);
      setCustomFilename(`${file.name.split('.')[0]}-transparencia`);
    };
    reader.readAsDataURL(file);
  };

  const resetAdjustments = () => {
    setBrightness(100); setContrast(100); setSaturation(100);
    setExportFormat('png'); setExportQuality(90);
    setEdgeSmooth(0); setEdgeFeather(0); setEdgeContrast(100); setEdgeShift(0);
    setRedBalance(100); setGreenBalance(100); setBlueBalance(100);
    setBrushMode(null); clearBrushCanvas();
  };

  const clearBrushCanvas = () => {
    const canvas = brushCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const applyColorBalance = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (redBalance === 100 && greenBalance === 100 && blueBalance === 100) return;
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const rGain = redBalance / 100;
    const gGain = greenBalance / 100;
    const bGain = blueBalance / 100;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * rGain);     // Red
      data[i + 1] = Math.min(255, data[i + 1] * gGain); // Green
      data[i + 2] = Math.min(255, data[i + 2] * bGain); // Blue
    }
    ctx.putImageData(imageData, 0, 0);
  };

  const applyFiltersAndFormatToCanvas = async (imageUrl: string, format: string, quality: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(imageUrl);

        if (format === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.save();
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${edgeSmooth}px) contrast(${edgeContrast}%)`;
        ctx.drawImage(img, 0, 0);
        
        // Manual Color Balance
        if (isAdvancedMode) {
          applyColorBalance(ctx, canvas.width, canvas.height);
        }

        if (brushCanvasRef.current) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.drawImage(brushCanvasRef.current, 0, 0, canvas.width, canvas.height);
        }
        ctx.restore();

        resolve(canvas.toDataURL(format, quality / 100));
      };
      img.onerror = () => resolve(imageUrl);
      img.src = imageUrl;
    });
  };

  const processImage = async () => {
    if (!currentImage || currentImage.status === 'processing') return;
    setCurrentImage(prev => prev ? { ...prev, status: 'processing' } : null);

    try {
      const result = await removeBackground(currentImage.originalUrl);
      const updatedImage: ProcessedImage = { ...currentImage, processedUrl: result, status: 'completed' };
      setCurrentImage(updatedImage);
      setHistory(prev => [updatedImage, ...prev].slice(0, 15));
    } catch (error) {
      console.error(error);
      setCurrentImage(prev => prev ? { ...prev, status: 'error' } : null);
    }
  };

  const downloadImage = async (url: string, filename: string) => {
    const cleanName = sanitizeFilename(filename);
    const finalUrl = await applyFiltersAndFormatToCanvas(url, `image/${exportFormat}`, exportQuality);
    const ext = exportFormat === 'jpeg' ? 'jpg' : exportFormat;
    const link = document.createElement('a');
    link.href = finalUrl;
    link.download = `${cleanName}.${ext}`;
    link.click();
    saveProject(false);
  };

  const sanitizeFilename = (name: string) => name.trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');

  const clearCurrent = () => {
    setCurrentImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsAdvancedMode(false);
    resetAdjustments();
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!brushMode || !isAdvancedMode || !brushCanvasRef.current) return;
    if (brushCanvasRef.current.width === 0 || brushCanvasRef.current.height === 0) {
      const img = new Image();
      img.onload = () => {
        brushCanvasRef.current!.width = img.width;
        brushCanvasRef.current!.height = img.height;
        setIsDrawing(true);
        draw(e);
      };
      img.src = currentImage!.originalUrl;
    } else {
      setIsDrawing(true);
      draw(e);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = brushCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    setBrushPos({ x: clientX - rect.left, y: clientY - rect.top });
    if (!isDrawing) return;
    ctx.lineWidth = brushSize * (canvas.width / rect.width);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (brushMode === 'erase') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#FFFFFF'; 
    } else {
      ctx.globalCompositeOperation = 'destination-out';
    }
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveProject(false);
    }
  };

  const ZoomControls = ({ type }: { type: 'original' | 'processed' }) => (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 bg-black/70 backdrop-blur-xl p-2 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 z-50 shadow-2xl">
      <button onClick={() => handleZoom(type, 'out')} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"><Minus className="w-4 h-4" /></button>
      <button onClick={() => handleZoom(type, 'reset')} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors text-[10px] font-black">1:1</button>
      <button onClick={() => handleZoom(type, 'in')} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"><Plus className="w-4 h-4" /></button>
    </div>
  );

  const handleZoom = (type: 'original' | 'processed', direction: 'in' | 'out' | 'reset') => {
    const step = 0.2;
    if (type === 'original') {
      if (direction === 'in') setZoomOriginal(p => Math.min(p + step, 4));
      else if (direction === 'out') setZoomOriginal(p => Math.max(p - step, 0.2));
      else setZoomOriginal(1);
    } else {
      if (direction === 'in') setZoomProcessed(p => Math.min(p + step, 4));
      else if (direction === 'out') setZoomProcessed(p => Math.max(p - step, 0.2));
      else setZoomProcessed(1);
    }
  };

  return (
    <div className="min-h-screen selection:bg-blue-500/30 pb-20 overflow-x-hidden">
      <header className="glass sticky top-0 z-[60] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Sparkles className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="text-lg font-black text-white leading-none">Transparência<span className="text-blue-500">AI</span></h1>
              <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Master Studio v3.0</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {currentImage && (
              <button 
                onClick={() => saveProject()}
                disabled={saveStatus !== 'idle'}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all border ${
                  saveStatus === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                }`}
              >
                {saveStatus === 'saving' ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saveStatus === 'success' ? 'PROJETO SALVO' : 'SALVAR PROJETO'}
              </button>
            )}
            <button 
              onClick={() => setIsAdvancedMode(!isAdvancedMode)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all border ${
                isAdvancedMode ? 'bg-blue-600 text-white border-blue-400 shadow-xl' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              }`}
            >
              <Activity className="w-4 h-4" /> MODO AVANÇADO
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto px-6 py-8">
        {!currentImage ? (
           <div className="max-w-4xl mx-auto text-center space-y-16 py-20">
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                <span className="px-5 py-2 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black border border-blue-500/20 uppercase tracking-widest">
                  ALIMENTADO POR GEMINI 2.5 FLASH-IMAGE
                </span>
                <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.9]">
                  O futuro da <br/><span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent italic">remoção de fundos.</span>
                </h2>
                <p className="text-slate-400 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                  Combine inteligência artificial de ponta com ferramentas de precisão manual para resultados impossíveis de distinguir da realidade.
                </p>
              </div>

              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileUpload}
                onClick={() => fileInputRef.current?.click()}
                className={`group border-2 border-dashed rounded-[4rem] p-24 text-center cursor-pointer transition-all duration-700 ${
                  isDragging ? 'border-blue-500 bg-blue-500/5 scale-[0.98]' : 'border-slate-800 bg-slate-900/30 hover:border-blue-500/50 hover:bg-slate-900/40 shadow-2xl'
                }`}
              >
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                <div className="flex flex-col items-center gap-10">
                  <div className={`w-32 h-32 bg-slate-800/50 rounded-[3rem] flex items-center justify-center transition-all duration-700 shadow-inner ${
                    isDragging ? 'bg-blue-600 scale-110 shadow-blue-500/50' : 'group-hover:scale-110 group-hover:bg-blue-600/20 group-hover:text-blue-400'
                  }`}>
                    <Upload className={`w-14 h-14 ${isDragging ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-4xl font-black text-white tracking-tight">Comece o Projeto</h3>
                    <p className="text-slate-500 font-bold text-xl opacity-80">Arraste aqui ou selecione arquivos de alta resolução</p>
                  </div>
                </div>
              </div>
           </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 animate-in fade-in duration-700">
            <div className="space-y-6">
              <div className="glass rounded-[3rem] overflow-hidden border-white/5 shadow-2xl relative bg-slate-950/50">
                {isAdvancedMode && currentImage.processedUrl && (
                  <div className="absolute top-8 left-8 z-50 flex gap-3 p-1.5 bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl">
                    <button onClick={() => setMaskViewMode('standard')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${maskViewMode === 'standard' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>Visual</button>
                    <button onClick={() => setMaskViewMode('mask')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${maskViewMode === 'mask' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>Máscara (B/W)</button>
                    <button onClick={() => setMaskViewMode('overlay')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${maskViewMode === 'overlay' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>Rubylith</button>
                  </div>
                )}
                <div className={`grid ${isAdvancedMode ? 'grid-cols-1' : 'md:grid-cols-2'} p-8 gap-10 min-h-[650px]`}>
                  {!isAdvancedMode ? (
                    <>
                      <div className="space-y-4 group relative">
                        <div className="flex items-center gap-2 mb-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span><h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Original Source</h3></div>
                        <div className="aspect-square rounded-[2.5rem] overflow-hidden bg-slate-900/50 border border-white/5 relative shadow-inner">
                          <ZoomControls type="original" />
                          <div className="w-full h-full flex items-center justify-center overflow-hidden">
                            <img src={currentImage.originalUrl} style={{ transform: `scale(${zoomOriginal})`, filter: showPreviewOnOriginal ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)` : 'none' }} className="w-full h-full object-contain transition-all" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4 group relative">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span><h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">AI Generated Preview</h3></div>
                        </div>
                        <div className="aspect-square rounded-[2.5rem] overflow-hidden checkerboard border border-white/5 relative shadow-inner">
                          <ZoomControls type="processed" />
                          {currentImage.status === 'processing' ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-2xl z-30">
                              <RefreshCcw className="w-16 h-16 text-blue-500 animate-spin mb-8" />
                              <p className="text-2xl font-black text-white tracking-tight">Processamento Neural...</p>
                              <p className="text-slate-500 text-sm mt-2 font-bold uppercase tracking-widest">Aguarde alguns segundos</p>
                            </div>
                          ) : currentImage.processedUrl ? (
                            <div className="w-full h-full flex items-center justify-center overflow-hidden">
                              <img src={currentImage.processedUrl} style={{ transform: `scale(${zoomProcessed})`, filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)` }} className="w-full h-full object-contain transition-all" />
                            </div>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800 opacity-10"><Zap className="w-24 h-24 mb-4" /><p className="text-xs font-black uppercase tracking-widest">Aguardando Extração</p></div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col h-full gap-6">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600/10 rounded-2xl"><Edit3 className="w-5 h-5 text-blue-400" /></div>
                            <div>
                               <h3 className="text-lg font-black text-white tracking-tight uppercase">Workspace de Refinamento</h3>
                               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Controle de Máscara e Bordas</p>
                            </div>
                         </div>
                         <div className="flex gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10">
                            <button onClick={() => setBrushMode(brushMode === 'restore' ? null : 'restore')} className={`p-3.5 rounded-xl transition-all ${brushMode === 'restore' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`} title="Restaurar Áreas (Pincel)"><Paintbrush className="w-5 h-5" /></button>
                            <button onClick={() => setBrushMode(brushMode === 'erase' ? null : 'erase')} className={`p-3.5 rounded-xl transition-all ${brushMode === 'erase' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`} title="Remover Áreas (Borracha)"><Eraser className="w-5 h-5" /></button>
                         </div>
                      </div>
                      <div className={`flex-1 min-h-[550px] rounded-[3rem] overflow-hidden relative border border-white/10 shadow-2xl ${maskViewMode === 'mask' ? 'bg-black' : maskViewMode === 'overlay' ? 'bg-red-950' : 'checkerboard'}`}>
                         <ZoomControls type="processed" />
                         <canvas ref={brushCanvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} className="absolute inset-0 w-full h-full z-40 cursor-none" style={{ pointerEvents: brushMode ? 'auto' : 'none' }} />
                         {brushMode && (
                            <div className="fixed pointer-events-none border-2 border-white/50 rounded-full z-[100] transition-all mix-blend-difference" style={{ width: `${brushSize}px`, height: `${brushSize}px`, left: `${brushPos.x - brushSize/2}px`, top: `${brushPos.y - brushSize/2}px`, position: 'absolute' }} />
                         )}
                         <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                            {currentImage.processedUrl && (
                              <img ref={processedImgRef} src={currentImage.processedUrl} style={{ transform: `scale(${zoomProcessed})`, filter: maskViewMode === 'mask' ? `brightness(0) invert(1) contrast(2000%) blur(${edgeSmooth}px) contrast(${edgeContrast}%)` : maskViewMode === 'overlay' ? `sepia(1) saturate(100) hue-rotate(-50deg) blur(${edgeSmooth}px)` : `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${edgeSmooth}px) contrast(${edgeContrast}%)`, opacity: maskViewMode === 'overlay' ? 0.7 : 1 }} className="w-full h-full object-contain transition-all" />
                            )}
                         </div>
                         {brushMode && (
                           <div className="absolute top-8 right-8 bg-black/80 backdrop-blur-2xl border border-white/10 p-5 rounded-[2rem] z-50 space-y-4 w-72 shadow-2xl animate-in fade-in slide-in-from-top-4">
                              <div className="flex items-center justify-between"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tamanho do Pincel</span><span className="text-[10px] font-bold text-white bg-blue-600 px-3 py-1 rounded-lg">{brushSize}px</span></div>
                              <input type="range" min="5" max="300" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer" />
                              <div className="flex justify-between items-center pt-2"><button onClick={() => clearBrushCanvas()} className="text-[9px] font-black text-red-400 uppercase hover:text-red-300 transition-colors">Limpar Máscara</button><span className="text-[8px] font-bold text-slate-600 uppercase">Ajuste Manual Ativo</span></div>
                           </div>
                         )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <aside className="space-y-6 lg:sticky lg:top-32">
              <div className="glass rounded-[3rem] p-10 space-y-10 shadow-2xl border-white/5 max-h-[85vh] overflow-y-auto custom-scrollbar">
                {!isAdvancedMode ? (
                  <div className="space-y-10">
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3"><Activity className="w-4 h-4 text-blue-500" /> Ajustes Gerais</h4>
                      <div className="space-y-8">
                        <ControlSlider label="Exposição" icon={<Sun className="w-4 h-4" />} value={brightness} min={0} max={200} onChange={setBrightness} />
                        <ControlSlider label="Contraste" icon={<ContrastIcon className="w-4 h-4" />} value={contrast} min={0} max={200} onChange={setContrast} />
                        <ControlSlider label="Vibratilidade" icon={<Droplet className="w-4 h-4" />} value={saturation} min={0} max={200} onChange={setSaturation} />
                      </div>
                    </div>
                    <div className="space-y-5 pt-8 border-t border-white/5">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3"><Settings className="w-4 h-4 text-indigo-500" /> Exportação Profissional</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {['png', 'jpeg', 'webp'].map(fmt => (
                          <button key={fmt} onClick={() => setExportFormat(fmt as any)} className={`py-3 rounded-2xl text-[9px] font-black uppercase border tracking-widest transition-all ${exportFormat === fmt ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-900 border-white/5 text-slate-600 hover:text-slate-400'}`}>{fmt === 'jpeg' ? 'JPG' : fmt}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-3"><Scissors className="w-4 h-4" /> Refinamento de Bordas</h4>
                      <div className="space-y-8">
                        <ControlSlider label="Suavizar" icon={<Plus className="w-4 h-4" />} value={edgeSmooth} min={0} max={10} step={0.1} onChange={setEdgeSmooth} />
                        <ControlSlider label="Feather" icon={<Layers className="w-4 h-4" />} value={edgeFeather} min={0} max={50} onChange={setEdgeFeather} />
                        <ControlSlider label="Contraste Alfa" icon={<Maximize2 className="w-4 h-4" />} value={edgeContrast} min={50} max={200} onChange={setEdgeContrast} />
                        <ControlSlider label="Shift Edge" icon={<MousePointer2 className="w-4 h-4" />} value={edgeShift} min={-20} max={20} onChange={setEdgeShift} />
                      </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-white/5">
                      <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-3"><Palette className="w-4 h-4" /> Balanço de Cores</h4>
                      <div className="space-y-8">
                        <ControlSlider label="Vermelho" icon={<div className="w-2 h-2 rounded-full bg-red-500" />} value={redBalance} min={0} max={200} onChange={setRedBalance} color="accent-red-500" />
                        <ControlSlider label="Verde" icon={<div className="w-2 h-2 rounded-full bg-green-500" />} value={greenBalance} min={0} max={200} onChange={setGreenBalance} color="accent-green-500" />
                        <ControlSlider label="Azul" icon={<div className="w-2 h-2 rounded-full bg-blue-500" />} value={blueBalance} min={0} max={200} onChange={setBlueBalance} color="accent-blue-500" />
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-5 pt-5 border-t border-white/5">
                  {!currentImage.processedUrl ? (
                    <button onClick={processImage} disabled={currentImage.status === 'processing'} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] disabled:opacity-50 text-white font-black py-6 px-10 rounded-[2rem] flex items-center justify-center gap-4 shadow-2xl shadow-blue-500/30 transition-all text-lg tracking-tight">
                      <Wand2 className={`w-6 h-6 ${currentImage.status === 'processing' ? 'animate-spin' : 'animate-pulse'}`} />
                      {currentImage.status === 'processing' ? 'CALCULANDO MÁSCARA...' : 'REMOVER FUNDO'}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-5">
                      <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/5 space-y-3 focus-within:border-blue-500/50 transition-all shadow-inner">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">Nome do Projeto</label>
                        <input value={customFilename} onChange={e => setCustomFilename(e.target.value)} className="bg-transparent text-lg font-black text-white w-full outline-none placeholder:text-slate-800" placeholder="Untitled-Project" />
                      </div>
                      <button onClick={() => downloadImage(currentImage.processedUrl!, customFilename)} className="w-full bg-blue-600 hover:bg-blue-500 hover:scale-[1.02] text-white font-black py-6 px-10 rounded-[2rem] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-blue-500/20 text-lg tracking-tight">
                        <Download className="w-6 h-6" /> EXPORTAR PNG HD
                      </button>
                      <button onClick={clearCurrent} className="w-full bg-slate-900 hover:bg-slate-800 text-slate-500 font-bold py-5 rounded-[2rem] text-[10px] uppercase tracking-[0.3em] transition-all border border-white/5">Novo Arquivo</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="glass rounded-[3rem] p-8 space-y-6 shadow-xl border-white/5">
                <div className="flex items-center justify-between px-2"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Meus Projetos</h3><FolderOpen className="w-4 h-4 text-slate-700" /></div>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar px-2">
                  {history.length === 0 ? (
                    <div className="w-full py-10 text-center border border-dashed border-white/5 rounded-[2rem] opacity-30"><p className="text-[9px] font-black text-slate-700 uppercase">Nenhum salvo</p></div>
                  ) : history.map(item => (
                    <div key={item.id} onClick={() => loadProject(item)} className={`group relative w-20 h-20 rounded-2xl overflow-hidden border flex-shrink-0 cursor-pointer transition-all shadow-xl ${currentImage?.id === item.id ? 'border-blue-500 scale-110' : 'border-white/10 hover:border-blue-500/50 hover:scale-105'}`}><img src={item.processedUrl || item.originalUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-blue-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><FolderOpen className="w-5 h-5 text-white" /></div></div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
      <footer className="max-w-7xl mx-auto px-6 pt-20 flex flex-col items-center gap-6 opacity-40"><div className="flex gap-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500"><a href="#" className="hover:text-blue-500 transition-colors">Documentation</a><a href="#" className="hover:text-blue-500 transition-colors">Privacy</a><a href="#" className="hover:text-blue-500 transition-colors">Legal</a></div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Transparência AI &copy; 2025 - Professional Grade Background Removal</p></footer>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; background: #3b82f6; border-radius: 50%; border: 3px solid #fff; cursor: pointer; box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); transition: all 0.2s; }
        input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.15); background: #60a5fa; }
      `}</style>
    </div>
  );
};

const ControlSlider = ({ label, icon, value, min, max, step = 1, onChange, color = 'accent-blue-500' }: any) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3">
        <span className="p-2 bg-slate-900 rounded-xl border border-white/5">{icon}</span> {label}
      </label>
      <span className="text-[11px] font-black text-white bg-white/5 px-3 py-1 rounded-lg border border-white/5 min-w-[50px] text-center">{value}{step < 1 ? '' : '%'}</span>
    </div>
    <input 
      type="range" min={min} max={max} step={step} value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={`w-full ${color} h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer`}
    />
  </div>
);

export default App;
