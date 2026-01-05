

import React, { useState, useEffect, useRef } from 'react';
import { parseWordToTiles } from '../../utils';
import Tile from '../Tile';
import { ChevronLeft, ChevronRight, Shuffle, Grid, RectangleHorizontal, RotateCcw, Eye, EyeOff, Ear, Eraser, Sparkles } from 'lucide-react';
import Draggable from '../interactive/Draggable';

interface QuickDrillProps {
  sounds: string[];
  isReverse?: boolean;
}

const QuickDrill: React.FC<QuickDrillProps> = ({ sounds, isReverse = false }) => {
  const [mode, setMode] = useState<'grid' | 'deck'>('deck'); 
  const [activeSounds, setActiveSounds] = useState<string[]>(sounds);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  // Grid / Drag State
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilePositions, setTilePositions] = useState<Record<number, { x: number, y: number, z: number }>>({});
  const [topZ, setTopZ] = useState(10);

  // Reset when sounds prop changes
  useEffect(() => {
    setActiveSounds(sounds);
    setCurrentIndex(0);
    setIsRevealed(false);
  }, [sounds]);

  const handleShuffle = () => {
    const shuffled = [...activeSounds].sort(() => Math.random() - 0.5);
    setActiveSounds(shuffled);
    setCurrentIndex(0);
    setIsRevealed(false);
    
    // If in grid mode, reshuffle positions too
    if (mode === 'grid') {
      setTimeout(calculateGrid, 50);
    }
  };

  const calculateGrid = () => {
    if (!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    
    const cardW = 100; // Approx width
    const cardH = 120; // Approx height with padding
    const cols = Math.floor((width - 40) / cardW);
    const safeCols = Math.max(1, cols);

    const newPositions: Record<number, { x: number, y: number, z: number }> = {};
    
    // Center the grid
    const totalW = Math.min(activeSounds.length, safeCols) * cardW;
    const startX = (width - totalW) / 2 + 10;
    const startY = 40;

    activeSounds.forEach((_, idx) => {
       const col = idx % safeCols;
       const row = Math.floor(idx / safeCols);
       newPositions[idx] = {
         x: startX + (col * cardW),
         y: startY + (row * cardH),
         z: 1
       };
    });
    setTilePositions(newPositions);
  };

  // Re-calculate grid when entering grid mode
  useEffect(() => {
    if (mode === 'grid') {
      // Small timeout to allow container to render
      setTimeout(calculateGrid, 50);
      window.addEventListener('resize', calculateGrid);
      return () => window.removeEventListener('resize', calculateGrid);
    }
  }, [mode, activeSounds]);

  const handleDragEnd = (idx: number, pos: { x: number, y: number }) => {
    setTilePositions(prev => ({
      ...prev,
      [idx]: { ...prev[idx], x: pos.x, y: pos.y, z: topZ + 1 }
    }));
    setTopZ(z => z + 1);
  };
  
  const bringToFront = (idx: number) => {
    setTilePositions(prev => ({
      ...prev,
      [idx]: { ...prev[idx], z: topZ + 1 }
    }));
    setTopZ(z => z + 1);
  };

  const nextCard = () => {
    setIsRevealed(false); 
    if (currentIndex < activeSounds.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const prevCard = () => {
    setIsRevealed(false);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(activeSounds.length - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'deck') {
        if (e.key === 'Space') {
          if (isReverse) setIsRevealed(!isRevealed);
          else nextCard();
        } else if (e.key === 'ArrowRight') {
          nextCard();
        } else if (e.key === 'ArrowLeft') {
          prevCard();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentIndex, activeSounds, isReverse, isRevealed]);

  return (
    <div className="h-full flex flex-col bg-[#fdf6e3] font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b-4 border-stone-800 bg-stone-900 shadow-md z-10 relative">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#fdf6e3] tracking-widest uppercase flex items-center gap-3 font-serif">
            {isReverse ? <RotateCcw className="text-red-500" /> : null}
            {isReverse ? "Sound Recognition" : "Quick Drill"}
          </h2>
          <p className="text-stone-400 text-xs mt-1 uppercase tracking-widest hidden md:block">
            {isReverse ? "Teacher Says Sound → Click to Reveal" : "Student Says Sound → Click Next"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {!isReverse && (
            <div className="flex bg-stone-800 rounded-lg p-1 border border-stone-600">
              <button
                onClick={() => setMode('deck')}
                className={`p-2 rounded ${mode === 'deck' ? 'bg-red-900 text-white shadow' : 'text-stone-400 hover:text-white'}`}
                title="Deck View"
              >
                <RectangleHorizontal className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMode('grid')}
                className={`p-2 rounded ${mode === 'grid' ? 'bg-red-900 text-white shadow' : 'text-stone-400 hover:text-white'}`}
                title="Freeplay Grid"
              >
                <Grid className="w-5 h-5" />
              </button>
            </div>
          )}

          <button
            onClick={handleShuffle}
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg transition-colors font-medium text-sm border border-stone-600"
          >
            <Shuffle className="w-4 h-4" />
            Shuffle
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')]">
        {activeSounds.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 italic">
            <div className="border-2 border-dashed border-stone-300 rounded-xl p-8">
              No sounds configured for this lesson.
            </div>
          </div>
        ) : mode === 'grid' ? (
          /* GRID VIEW (Interactive Magnetic Poetry) */
          <div className="h-full w-full relative flex flex-col">
             
             {/* Note / Toolbar */}
             <div className="absolute top-4 left-0 right-0 z-0 flex flex-col items-center pointer-events-none">
                <div className="bg-white/90 backdrop-blur px-6 py-2 rounded-full border border-stone-300 shadow-sm flex items-center gap-2 animate-in slide-in-from-top-4">
                   <Sparkles className="w-4 h-4 text-amber-500" />
                   <span className="text-stone-600 font-bold font-serif text-sm italic">"What words can we make from these tiles?"</span>
                </div>
             </div>

             {/* Tidy Up Button */}
             <button 
                onClick={calculateGrid}
                className="absolute top-4 right-4 z-50 p-2 bg-stone-800 hover:bg-stone-700 text-white rounded-full shadow-lg transition-transform hover:rotate-180"
                title="Tidy Up Grid"
             >
                <RotateCcw className="w-4 h-4" />
             </button>

             {/* Canvas */}
             <div ref={containerRef} className="flex-1 relative overflow-hidden">
                {activeSounds.map((sound, idx) => {
                   const tiles = parseWordToTiles(sound);
                   const pos = tilePositions[idx] || { x: 0, y: 0, z: 1 };
                   
                   return (
                     <Draggable
                       key={idx}
                       initialPos={{ x: pos.x, y: pos.y }}
                       onDragEnd={(p) => handleDragEnd(idx, p)}
                     >
                        <div 
                          onMouseDown={() => bringToFront(idx)}
                          style={{ zIndex: pos.z }}
                          className="flex gap-1 p-2 bg-white/50 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-xl hover:scale-110 transition-all cursor-grab active:cursor-grabbing border border-stone-200/50"
                        >
                          {tiles.map((t, tIdx) => (
                            <Tile key={tIdx} data={t} size="md" />
                          ))}
                        </div>
                     </Draggable>
                   );
                })}
             </div>
          </div>
        ) : (
          /* DECK VIEW */
          <div className="h-full flex flex-col items-center justify-center p-8">
            
            <div className="relative group w-full max-w-xl perspective-1000">
              {/* Card Container */}
              <div 
                onClick={() => isReverse && setIsRevealed(!isRevealed)}
                className={`
                  bg-white p-16 md:p-24 rounded-lg shadow-2xl border-4 border-stone-800 
                  flex items-center justify-center min-h-[400px] transition-all duration-300 cursor-pointer relative overflow-hidden
                  ${isReverse && !isRevealed ? 'hover:bg-stone-50 hover:border-red-900' : ''}
                `}
              >
                
                {/* REVERSE MODE: HIDDEN STATE */}
                {isReverse && !isRevealed && (
                  <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 select-none">
                    <div className="mb-8 p-8 bg-stone-100 rounded-full text-stone-400 border-4 border-stone-200">
                      <Ear className="w-16 h-16" />
                    </div>
                    <p className="text-stone-800 uppercase tracking-widest font-bold text-xl">Teacher Says Sound</p>
                    <p className="text-red-800 text-sm mt-4 font-bold animate-pulse">Click to Reveal</p>
                  </div>
                )}

                {/* REVEALED CONTENT / STANDARD CONTENT */}
                {(!isReverse || isRevealed) && (
                   <div className="flex gap-1 transform scale-150 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      {parseWordToTiles(activeSounds[currentIndex]).map((t, tIdx) => (
                         <Tile key={tIdx} data={t} size="lg" />
                      ))}
                   </div>
                )}
                
                {/* Reveal Icon Indicator */}
                {isReverse && (
                  <div className="absolute top-4 right-4 text-stone-300">
                    {isRevealed ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
                  </div>
                )}
              </div>

              {/* Progress Indicator */}
              <div className="absolute -bottom-12 left-0 right-0 text-center text-stone-400 font-serif font-bold text-sm">
                Card {currentIndex + 1} of {activeSounds.length}
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="absolute inset-x-0 bottom-0 p-8 flex justify-between items-center pointer-events-none">
               <button 
                 onClick={prevCard}
                 className="pointer-events-auto p-6 rounded-full bg-stone-800 hover:bg-red-900 text-white shadow-lg transition-all hover:scale-110 active:scale-95"
               >
                 <ChevronLeft className="w-8 h-8" />
               </button>

               <button 
                 onClick={nextCard}
                 className="pointer-events-auto p-6 rounded-full bg-stone-800 hover:bg-red-900 text-white shadow-lg transition-all hover:scale-110 active:scale-95"
               >
                 <ChevronRight className="w-8 h-8" />
               </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default QuickDrill;
