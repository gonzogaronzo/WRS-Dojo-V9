
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, PenTool, MousePointer2, Trash2, FileText } from 'lucide-react';

interface PassageReadingProps {
  text: string;
}

const PassageReading: React.FC<PassageReadingProps> = ({ text }) => {
  // Split text by double newline to get paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tool, setTool] = useState<'cursor' | 'pen-blue' | 'pen-red'>('pen-blue');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Reset drawing when paragraph changes
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
    // Slight delay to ensure container is rendered
    setTimeout(handleResize, 50);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [currentIndex, paragraphs]);

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

  const nextParagraph = () => {
    if (currentIndex < paragraphs.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const prevParagraph = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        nextParagraph();
      } else if (e.key === 'ArrowLeft') {
        prevParagraph();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, paragraphs]);

  if (paragraphs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-stone-400 italic font-serif">
        <FileText className="w-16 h-16 mb-4 opacity-30" />
        No passage content provided.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#fdf6e3]">
      {/* Toolbar */}
      <div className="h-20 bg-stone-900 border-b-4 border-red-900 flex items-center justify-between px-8 shadow-md z-30 flex-shrink-0">
        <h2 className="text-xl font-bold text-[#fdf6e3] flex items-center gap-3 font-serif uppercase tracking-wider">
          <FileText className="w-6 h-6 text-red-500" />
          Passage Reading
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
        
        {/* Navigation Buttons (Floating) */}
        <button 
          onClick={prevParagraph}
          disabled={currentIndex === 0}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-stone-800/80 hover:bg-red-900 text-white disabled:opacity-0 transition-all shadow-lg backdrop-blur-sm group"
        >
           <ChevronLeft className="w-8 h-8 group-hover:scale-110 transition-transform" />
        </button>

        <button 
          onClick={nextParagraph}
          disabled={currentIndex === paragraphs.length - 1}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-stone-800/80 hover:bg-red-900 text-white disabled:opacity-0 transition-all shadow-lg backdrop-blur-sm group"
        >
           <ChevronRight className="w-8 h-8 group-hover:scale-110 transition-transform" />
        </button>

        {/* Text Layer */}
        <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8 z-0 overflow-y-auto">
          <div className="max-w-6xl w-full">
             {/* Typography Updates:
                 - text-3xl md:text-4xl: Large readable font
                 - leading-[3.8]: Increased line height (approx 50% more space than previous 2.5)
                 - tracking-wide: Increased letter spacing for clarity
                 - text-left: Ragged right edge
             */}
             <p className="text-3xl md:text-4xl font-medium text-stone-900 leading-[3.8] font-serif tracking-wide select-none text-left">
                {paragraphs[currentIndex]}
             </p>
          </div>
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
           {paragraphs.map((_, idx) => (
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

export default PassageReading;
