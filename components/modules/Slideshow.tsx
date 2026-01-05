

import React, { useState, useEffect, useRef } from 'react';
import { Slide } from '../../types';
import { ChevronLeft, ChevronRight, MonitorPlay, PenTool, MousePointer2, Trash2 } from 'lucide-react';
import { parseWordToTiles } from '../../utils';
import Tile from '../Tile';
import SyllableCard from '../SyllableCard';

interface SlideshowProps {
  slides: Slide[];
  googleSlidesUrl?: string;
}

const Slideshow: React.FC<SlideshowProps> = ({ slides, googleSlidesUrl }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // --- Drawing State ---
  const [tool, setTool] = useState<'cursor' | 'pen-blue' | 'pen-red'>('cursor');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  // If a Google Slides URL is provided, render it in an iframe
  if (googleSlidesUrl) {
    return (
      <div className="h-full flex flex-col bg-slate-900">
        <div className="flex-1 w-full h-full relative">
          <iframe 
            src={googleSlidesUrl}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen={true}
            title="Google Slides Presentation"
          />
        </div>
      </div>
    );
  }

  // --- Drawing Logic ---
  
  // Clear canvas when slide changes
  useEffect(() => {
    clearCanvas();
  }, [currentIndex]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (slideContainerRef.current && canvasRef.current) {
        canvasRef.current.width = slideContainerRef.current.offsetWidth;
        canvasRef.current.height = slideContainerRef.current.offsetHeight;
      }
    };
    
    // Initial size
    setTimeout(handleResize, 100);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentIndex, slides]);

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

  // --- Manual Slideshow Navigation ---

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const nextSlide = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (!slides || slides.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <MonitorPlay className="w-16 h-16 mb-4 opacity-50" />
        <p>No slides added to this lesson.</p>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  const renderContent = () => {
    if (currentSlide.type === 'word') {
      const content = currentSlide.content.trim();
      
      // Check for manual syntax markers: | < > [ ] { } /
      const hasSyntax = /[\/|\[\]{}<>]/.test(content);
      
      // Only use legacy hyphen splitting if NO special syntax is present
      const isLegacyMultiSyllable = content.includes('-') && !hasSyntax;

      if (isLegacyMultiSyllable) {
        // Render Syllable Cards (Section 4.2 / 6) - Legacy Mode for simple inputs like "vol-ca-no"
        const parts = content.split('-').filter(Boolean);
        return (
          <div className="flex flex-wrap items-center justify-center gap-8">
            {parts.map((part, idx) => (
              <SyllableCard key={idx} text={part} />
            ))}
          </div>
        );
      } else {
        // Render Tiles via Parser (Handles all special syntax AND standard phonemes)
        const tiles = parseWordToTiles(content);
        return (
          <div className="flex flex-wrap items-center justify-center gap-1">
             {tiles.map((t, idx) => (
               <Tile key={idx} data={t} size="lg" />
             ))}
          </div>
        );
      }
    } else if (currentSlide.type === 'image') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
          <img 
            src={currentSlide.content} 
            alt={currentSlide.title}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Not+Found';
            }}
          />
        </div>
      );
    } else {
      // Text Slide
      return (
        <div className="prose prose-xl max-w-none text-gray-800">
          {currentSlide.content.split('\n').map((line, idx) => (
            <p key={idx} className="mb-4 leading-relaxed">{line}</p>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 relative">
      
      {/* Floating Drawing Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex bg-slate-800 p-1 rounded-lg border border-slate-600 shadow-xl gap-1">
         <button 
           onClick={() => setTool('cursor')}
           className={`p-2 rounded ${tool === 'cursor' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-white'}`}
           title="Cursor Mode"
         >
           <MousePointer2 className="w-5 h-5" />
         </button>
         <button 
           onClick={() => setTool('pen-blue')}
           className={`p-2 rounded ${tool === 'pen-blue' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-indigo-300'}`}
           title="Blue Pen"
         >
           <PenTool className="w-5 h-5" />
         </button>
         <button 
           onClick={() => setTool('pen-red')}
           className={`p-2 rounded ${tool === 'pen-red' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-red-300'}`}
           title="Red Pen"
         >
           <PenTool className="w-5 h-5" />
         </button>
         <div className="w-px h-6 bg-slate-600 mx-1 self-center" />
         <button 
           onClick={clearCanvas}
           className="p-2 rounded text-slate-400 hover:text-white hover:bg-red-900 transition-colors"
           title="Clear Drawing"
         >
           <Trash2 className="w-5 h-5" />
         </button>
      </div>

      {/* Slide Area */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
        <div 
          ref={slideContainerRef}
          className="w-full max-w-5xl aspect-[16/9] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col relative"
        >
          
          {/* Header/Title Bar (Only if title exists) */}
          {currentSlide.title && (
             <div className="bg-blue-600 p-6 flex-shrink-0 z-10 relative">
               <h2 className="text-3xl font-bold text-white tracking-tight">{currentSlide.title}</h2>
             </div>
          )}

          {/* Content Body */}
          <div className={`flex-1 p-8 md:p-12 overflow-y-auto flex flex-col justify-center relative z-0 ${!currentSlide.title ? 'h-full' : ''}`}>
             {renderContent()}
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

          {/* Slide Number Badge */}
          <div className="absolute bottom-4 right-6 bg-black/10 text-gray-400 text-xs px-2 py-1 rounded z-30 pointer-events-none">
            {currentIndex + 1} / {slides.length}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="h-16 bg-slate-950 flex items-center justify-between px-8 border-t border-slate-800 z-40 relative">
        <button 
          onClick={prevSlide}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" /> Previous
        </button>

        <div className="flex gap-2">
          {slides.map((_, idx) => (
            <div 
              key={idx}
              className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-blue-500 scale-125' : 'bg-slate-700'}`}
            />
          ))}
        </div>

        <button 
          onClick={nextSlide}
          disabled={currentIndex === slides.length - 1}
          className="flex items-center gap-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          Next <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Slideshow;
