
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, PenTool, Eraser, Trash2, MousePointer2 } from 'lucide-react';

interface SentenceReadingProps {
  sentences: string[];
}

const SentenceReading: React.FC<SentenceReadingProps> = ({ sentences }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tool, setTool] = useState<'cursor' | 'pen-blue' | 'pen-red'>('pen-blue');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Reset drawing when sentence changes
  useEffect(() => {
    clearCanvas();
  }, [currentIndex]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.offsetWidth;
        canvasRef.current.height = containerRef.current.offsetHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'cursor') return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Theme colors: Blue (Indigo-700) or Red (Red-700) to look like ink
      ctx.strokeStyle = tool === 'pen-blue' ? '#4338ca' : '#b91c1c'; 
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || tool === 'cursor') return;
    const { x, y } = getCoordinates(e);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const nextSentence = () => {
    if (currentIndex < sentences.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const prevSentence = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  if (sentences.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-stone-400 italic font-serif">
        No sentences configured for this mission.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#fdf6e3]">
      {/* Toolbar */}
      <div className="h-20 bg-stone-900 border-b-4 border-red-900 flex items-center justify-between px-8 shadow-md z-30">
        <h2 className="text-xl font-bold text-[#fdf6e3] flex items-center gap-3 font-serif uppercase tracking-wider">
          <PenTool className="w-6 h-6 text-red-500" />
          Fluency Canvas
        </h2>
        
        <div className="flex bg-stone-800 p-1 rounded-lg gap-1 border border-stone-600">
           <button 
             onClick={() => setTool('cursor')}
             className={`p-3 rounded ${tool === 'cursor' ? 'bg-[#fdf6e3] shadow text-stone-900' : 'text-stone-400 hover:text-white'}`}
             title="Cursor Mode"
           >
             <MousePointer2 className="w-5 h-5" />
           </button>
           <button 
             onClick={() => setTool('pen-blue')}
             className={`p-3 rounded ${tool === 'pen-blue' ? 'bg-indigo-900 text-indigo-300 shadow ring-1 ring-indigo-500' : 'text-stone-400 hover:text-indigo-300'}`}
             title="Blue Ink (Phrasing)"
           >
             <PenTool className="w-5 h-5" />
           </button>
           <button 
             onClick={() => setTool('pen-red')}
             className={`p-3 rounded ${tool === 'pen-red' ? 'bg-red-900 text-red-300 shadow ring-1 ring-red-500' : 'text-stone-400 hover:text-red-300'}`}
             title="Red Ink (Corrections)"
           >
             <PenTool className="w-5 h-5" />
           </button>
           <div className="w-px h-8 bg-stone-600 mx-2 self-center" />
           <button 
             onClick={clearCanvas}
             className="p-3 rounded text-stone-400 hover:text-white hover:bg-red-900 transition-colors"
             title="Clear Canvas"
           >
             <Trash2 className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Canvas / Text Area */}
      <div className="flex-1 relative flex flex-col bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')]" ref={containerRef}>
        
        {/* Navigation Buttons (Visible & Interactive) */}
        <button 
          onClick={prevSentence}
          disabled={currentIndex === 0}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-stone-800/80 hover:bg-red-900 text-white disabled:opacity-0 transition-all shadow-lg backdrop-blur-sm group"
        >
           <ChevronLeft className="w-8 h-8 group-hover:scale-110 transition-transform" />
        </button>

        <button 
          onClick={nextSentence}
          disabled={currentIndex === sentences.length - 1}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-stone-800/80 hover:bg-red-900 text-white disabled:opacity-0 transition-all shadow-lg backdrop-blur-sm group"
        >
           <ChevronRight className="w-8 h-8 group-hover:scale-110 transition-transform" />
        </button>

        {/* Text Layer */}
        <div className="absolute inset-0 flex items-center justify-center p-24 select-none pointer-events-none z-0">
          <p className="text-5xl md:text-7xl lg:text-8xl font-medium text-stone-800 text-center leading-tight font-serif tracking-tight">
            {sentences[currentIndex]}
          </p>
        </div>

        {/* Drawing Layer */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`absolute inset-0 z-20 touch-none ${tool === 'cursor' ? 'pointer-events-none' : 'cursor-crosshair'}`}
        />

        {/* Pagination Dots */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 pointer-events-none z-30">
           {sentences.map((_, idx) => (
             <div 
               key={idx} 
               className={`w-3 h-3 rounded-full border-2 border-stone-400 transition-all ${idx === currentIndex ? 'bg-red-800 scale-125 border-red-900' : 'bg-transparent'}`} 
             />
           ))}
        </div>
      </div>
    </div>
  );
};

export default SentenceReading;
