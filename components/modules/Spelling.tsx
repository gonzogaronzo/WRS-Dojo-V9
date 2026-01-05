import React, { useState, useEffect, useRef } from 'react';
import { DictationSection } from '../../types';
import { Play, Settings, Eye, EyeOff, CheckCircle2, RotateCcw, Turtle, Volume2, Ear, Book, Layers, HelpCircle, AlignLeft, FileText, PenTool, MousePointer2, Trash2, Gamepad2, X, Check } from 'lucide-react';
import { parseWordToTiles, TileData } from '../../utils';
import Tile from '../Tile';
import Draggable from '../interactive/Draggable';

interface SpellingProps {
  data: DictationSection;
}

const Spelling: React.FC<SpellingProps> = ({ data }) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  
  // Playback State
  const [isSlow, setIsSlow] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Navigation State
  const [activeTab, setActiveTab] = useState<number>(0);

  // Drawing State
  const [tool, setTool] = useState<'cursor' | 'pen-blue' | 'pen-red'>('cursor');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- CIPHER GAME STATE ---
  const [gameMode, setGameMode] = useState(false);
  const [cipherWord, setCipherWord] = useState<string | null>(null);
  const [cipherTiles, setCipherTiles] = useState<TileData[]>([]);
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set());
  const [draggedTiles, setDraggedTiles] = useState<Record<number, TileData>>({}); // Index -> TileData
  const [bankTiles, setBankTiles] = useState<{id: string, tile: TileData}[]>([]);
  const [checkResult, setCheckResult] = useState<'correct' | 'incorrect' | null>(null);

  const sections = [
    { title: "Sounds", count: 5, data: data.sounds || [], icon: Ear },
    { title: "Real Words", count: 5, data: data.realWords || [], icon: Book },
    { title: "Word Elements", count: 5, data: data.wordElements || [], icon: Layers },
    { title: "Nonsense Words", count: 3, data: data.nonsenseWords || [], icon: HelpCircle },
    { title: "Phrases", count: 3, data: data.phrases || [], icon: AlignLeft },
    { title: "Sentences", count: 3, data: data.sentences || [], icon: FileText }
  ];

  // Load Voices
  useEffect(() => {
    const loadVoices = () => {
      const vs = window.speechSynthesis.getVoices();
      vs.sort((a, b) => (a.lang === 'en-US' ? -1 : 1));
      setVoices(vs);
      if (!selectedVoiceURI && vs.length > 0) {
        const best = vs.find(v => v.name.includes('Google US English')) ||
                     vs.find(v => v.name.includes('Natural')) || 
                     vs.find(v => v.lang === 'en-US') ||
                     vs[0];
        if (best) setSelectedVoiceURI(best.voiceURI);
      }
    };
    
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [selectedVoiceURI]);

  // Handle Resize for Canvas
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        // Match the scrollHeight to cover entire scrollable area
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = Math.max(containerRef.current.scrollHeight, containerRef.current.clientHeight);
      }
    };
    
    // Trigger on tab change (content change) and window resize
    const timeout = setTimeout(handleResize, 50);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [activeTab, sections[activeTab].data, gameMode]);

  // Clear canvas when switching tabs
  useEffect(() => {
    clearCanvas();
  }, [activeTab, gameMode]);

  const speakWord = (text: string, id?: string) => {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[/\\{}[\]-]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    if (selectedVoiceURI) {
      const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (voice) utterance.voice = voice;
    }
    
    utterance.rate = isSlow ? 0.5 : 0.9;
    if (id) {
      utterance.onstart = () => setPlayingId(id);
      utterance.onend = () => setPlayingId(null);
      utterance.onerror = () => setPlayingId(null);
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const toggleReveal = (id: string) => {
    const next = new Set(revealedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRevealedIds(next);
  };

  const resetAll = () => {
    setRevealedIds(new Set());
    window.speechSynthesis.cancel();
    clearCanvas();
    setCipherWord(null); // Reset game if active
  };

  // --- Drawing Logic ---
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
    return { x: clientX - rect.left, y: clientY - rect.top };
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

  const stopDrawing = () => setIsDrawing(false);

  // --- CIPHER GAME LOGIC ---

  const initCipherGame = (word: string) => {
    setCipherWord(word);
    const tiles = parseWordToTiles(word);
    setCipherTiles(tiles);
    setHiddenIndices(new Set());
    setDraggedTiles({});
    setBankTiles([]);
    setCheckResult(null);
  };

  const toggleTileHidden = (index: number) => {
    const newHidden = new Set(hiddenIndices);
    const tile = cipherTiles[index];
    
    if (newHidden.has(index)) {
      // Unhide: Remove from bank, remove from hidden
      newHidden.delete(index);
      setBankTiles(prev => prev.filter(t => t.id !== `bank-${index}`));
      
      // Also remove from placed if it was placed
      const newPlaced = { ...draggedTiles };
      delete newPlaced[index];
      setDraggedTiles(newPlaced);

    } else {
      // Hide: Add to hidden, add to bank
      newHidden.add(index);
      
      // Add to bank with unique ID
      setBankTiles(prev => [
        ...prev, 
        { id: `bank-${index}`, tile: tile }
      ].sort(() => Math.random() - 0.5)); // Shuffle bank on add?
    }
    setHiddenIndices(newHidden);
    setCheckResult(null);
  };

  // Simple "Click Bank Tile -> First Empty Slot" logic for simplicity in this view?
  // Or Drag and Drop? Drag and drop requested.
  // Using Draggable requires absolute positioning which is tricky in a flex layout.
  // Let's use a "Click to Move" approach for robustness in this specific modal view.
  // OR: Use standard HTML5 Drag/Drop? 
  // Let's stick to "Click tile in bank -> Click empty slot" for UX simplicity on touch screens.
  
  const [selectedBankTile, setSelectedBankTile] = useState<string | null>(null);

  const handleBankTileClick = (bankId: string) => {
    setSelectedBankTile(selectedBankTile === bankId ? null : bankId);
  };

  const handleSlotClick = (index: number) => {
    if (!hiddenIndices.has(index)) return; // Not a slot

    // If a tile is selected from bank, place it
    if (selectedBankTile) {
      const bankItem = bankTiles.find(b => b.id === selectedBankTile);
      if (bankItem) {
        // Place tile
        setDraggedTiles(prev => ({ ...prev, [index]: bankItem.tile }));
        // Remove from bank (visually hide or actually remove?)
        // Let's remove from bank array to prevent duplicates
        setBankTiles(prev => prev.filter(b => b.id !== selectedBankTile));
        setSelectedBankTile(null);
        setCheckResult(null);
      }
    } else if (draggedTiles[index]) {
      // If clicked a filled slot (and no bank tile selected), return it to bank
      const tileToRemove = draggedTiles[index];
      const newPlaced = { ...draggedTiles };
      delete newPlaced[index];
      setDraggedTiles(newPlaced);
      
      // Return to bank
      setBankTiles(prev => [...prev, { id: `bank-returned-${Date.now()}`, tile: tileToRemove }]);
      setCheckResult(null);
    }
  };

  const checkCipherAnswer = () => {
    // Check if all slots filled
    if (Object.keys(draggedTiles).length !== hiddenIndices.size) {
      // Incomplete
      return;
    }
    
    let correct = true;
    hiddenIndices.forEach(idx => {
       if (draggedTiles[idx].text !== cipherTiles[idx].text) {
         correct = false;
       }
    });

    setCheckResult(correct ? 'correct' : 'incorrect');
    if (correct && cipherWord) speakWord("Correct! " + cipherWord);
    else speakWord("Try again.");
  };

  const currentSection = sections[activeTab];

  return (
    <div className="h-full flex flex-col bg-[#fdf6e3] font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between px-8 py-4 bg-stone-900 border-b-4 border-red-900 shadow-md z-10 text-[#fdf6e3] flex-shrink-0">
        <div className="mb-4 md:mb-0">
          <h2 className="text-2xl font-bold flex items-center gap-3 font-serif uppercase tracking-widest">
            <CheckCircle2 className="w-6 h-6 text-red-500" />
            Written Work
          </h2>
          <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">Dictation Administrator</p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-4">
           {/* Game Mode Toggle */}
           <button 
             onClick={() => setGameMode(!gameMode)}
             className={`flex items-center gap-2 px-3 py-2 rounded border border-stone-600 transition-colors ${gameMode ? 'bg-purple-900 text-purple-100 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
           >
             <Gamepad2 className="w-5 h-5" />
             <span className="text-xs font-bold uppercase hidden md:inline">{gameMode ? 'Cipher Active' : 'Cipher Game'}</span>
           </button>

           <div className="w-px h-6 bg-stone-600 mx-1"></div>

           {/* Drawing Controls */}
           <div className="flex bg-stone-800 rounded-lg p-1 border border-stone-600">
             <button 
               onClick={() => setTool('cursor')}
               className={`p-2 rounded ${tool === 'cursor' ? 'bg-[#fdf6e3] text-stone-900' : 'text-stone-400 hover:text-white'}`}
               title="Cursor Mode"
             >
               <MousePointer2 className="w-4 h-4" />
             </button>
             <button 
               onClick={() => setTool('pen-blue')}
               className={`p-2 rounded ${tool === 'pen-blue' ? 'bg-indigo-900 text-indigo-300 ring-1 ring-indigo-500' : 'text-stone-400 hover:text-indigo-300'}`}
               title="Blue Ink"
             >
               <PenTool className="w-4 h-4" />
             </button>
             <button 
               onClick={() => setTool('pen-red')}
               className={`p-2 rounded ${tool === 'pen-red' ? 'bg-red-900 text-red-300 ring-1 ring-red-500' : 'text-stone-400 hover:text-red-300'}`}
               title="Red Ink"
             >
               <PenTool className="w-4 h-4" />
             </button>
             <div className="w-px h-6 bg-stone-600 mx-1 self-center" />
             <button 
               onClick={clearCanvas}
               className="p-2 rounded text-stone-400 hover:text-white hover:bg-red-900 transition-colors"
               title="Clear Markings"
             >
               <Trash2 className="w-4 h-4" />
             </button>
           </div>

          {/* Global Controls */}
          <div className="flex items-center bg-stone-800 rounded-lg p-1 border border-stone-600">
             <button
               onClick={() => setIsSlow(!isSlow)}
               className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${isSlow ? 'bg-emerald-900 text-emerald-100 shadow-inner' : 'text-stone-400 hover:text-white'}`}
             >
               <Turtle className="w-5 h-5" />
               <span className="text-xs font-bold uppercase hidden md:inline">Slow</span>
             </button>
             
             <div className="w-px h-6 bg-stone-600 mx-1"></div>

             <div className="relative">
                <button 
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                  className={`p-2 rounded flex items-center gap-2 hover:text-white ${showVoiceSettings ? 'text-white' : 'text-stone-400'}`}
                >
                  <Settings className="w-5 h-5" />
                </button>
                {showVoiceSettings && (
                   <div className="absolute top-full right-0 mt-4 w-72 bg-white border border-stone-300 rounded shadow-xl p-3 z-50 text-stone-900">
                      <label className="block text-xs font-bold text-stone-500 mb-2 uppercase">Dictation Voice</label>
                      <select 
                        value={selectedVoiceURI}
                        onChange={(e) => setSelectedVoiceURI(e.target.value)}
                        className="w-full text-sm p-2 border border-stone-300 rounded outline-none"
                      >
                        {voices.map(v => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name.replace(/Microsoft|Google/g, '').trim().slice(0,25)}... ({v.lang})
                          </option>
                        ))}
                      </select>
                   </div>
                )}
             </div>
          </div>
          
          <button onClick={resetAll} className="p-2 text-stone-400 hover:text-red-500 transition-colors">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-stone-800 px-4 overflow-x-auto scrollbar-hide flex-shrink-0">
        <div className="flex gap-1 min-w-max mx-auto max-w-5xl">
          {sections.map((sec, idx) => {
            const Icon = sec.icon;
            const isActive = activeTab === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`
                  flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-4
                  ${isActive 
                    ? 'border-red-600 bg-stone-700 text-white' 
                    : 'border-transparent text-stone-500 hover:text-stone-300 hover:bg-stone-700/50'}
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-red-500' : ''}`} />
                {sec.title}
                <span className="ml-1 text-xs opacity-50 bg-stone-900 px-2 py-0.5 rounded-full">{sec.count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-8 bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')] relative"
      >
        {/* CIPHER GAME OVERLAY */}
        {gameMode && cipherWord && (
           <div className="absolute inset-0 z-40 bg-stone-900/95 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
              <button onClick={() => setCipherWord(null)} className="absolute top-4 right-4 text-stone-500 hover:text-white p-2">
                 <X className="w-8 h-8" />
              </button>

              <div className="text-center mb-12">
                 <h3 className="text-3xl font-black text-[#fdf6e3] uppercase tracking-widest mb-2 font-serif">Sound Cipher</h3>
                 <p className="text-stone-400 text-sm">Fill in the missing sounds. Tap a tile in the bank, then the empty slot.</p>
              </div>

              {/* Word Display (With Slots) */}
              <div className="flex flex-wrap justify-center gap-2 mb-16 min-h-[8rem]">
                 {cipherTiles.map((tile, idx) => {
                    const isHidden = hiddenIndices.has(idx);
                    const placed = draggedTiles[idx];

                    if (isHidden) {
                      return (
                        <div 
                          key={idx}
                          onClick={() => handleSlotClick(idx)}
                          className={`
                            min-w-[6rem] h-32 border-4 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-all
                            ${placed 
                              ? 'border-transparent' 
                              : 'border-stone-600 bg-stone-800 hover:border-stone-400 hover:bg-stone-700'
                            }
                            ${checkResult === 'correct' ? 'ring-4 ring-green-500' : ''}
                            ${checkResult === 'incorrect' ? 'ring-4 ring-red-500' : ''}
                          `}
                        >
                           {placed ? (
                              <div className="pointer-events-none">
                                 <Tile data={placed} size="lg" />
                              </div>
                           ) : (
                              <span className="text-stone-600 font-bold text-4xl">?</span>
                           )}
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="pointer-events-none opacity-50">
                        <Tile data={tile} size="lg" />
                      </div>
                    );
                 })}
              </div>

              {/* Tile Bank */}
              <div className="flex gap-4 p-4 bg-stone-800/50 rounded-2xl border border-stone-700 min-h-[6rem] items-center justify-center">
                 {bankTiles.length === 0 && Object.keys(draggedTiles).length === hiddenIndices.size ? (
                    <button 
                      onClick={checkCipherAnswer}
                      className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest shadow-lg animate-bounce"
                    >
                       Check Answer
                    </button>
                 ) : (
                    bankTiles.map(item => (
                       <div 
                         key={item.id}
                         onClick={() => handleBankTileClick(item.id)}
                         className={`cursor-pointer transform transition-all hover:scale-110 ${selectedBankTile === item.id ? 'ring-4 ring-yellow-400 rounded-xl scale-110' : ''}`}
                       >
                          <Tile data={item.tile} size="md" />
                       </div>
                    ))
                 )}
              </div>
              
              {checkResult === 'correct' && (
                 <div className="mt-8 text-green-400 font-bold text-xl uppercase tracking-widest animate-pulse flex items-center gap-2">
                    <Check className="w-6 h-6" /> Cipher Solved!
                 </div>
              )}
           </div>
        )}

        <div className="max-w-4xl mx-auto relative z-10 pointer-events-auto">
          
          <div className="mb-6 flex items-center gap-3">
             <div className="p-3 bg-red-900 rounded-lg text-white shadow-lg">
                <currentSection.icon className="w-8 h-8" />
             </div>
             <div>
               <h3 className="text-3xl font-serif font-bold text-stone-900">{currentSection.title}</h3>
               <p className="text-stone-500 italic">
                 {gameMode ? "Select a word to start the Cipher Game." : "Dictate the following items clearly."}
               </p>
             </div>
          </div>

          <div className="space-y-4">
            {currentSection.data.length === 0 ? (
              <div className="p-12 border-2 border-dashed border-stone-300 rounded-xl text-center text-stone-400 italic">
                No items configured for {currentSection.title}.
              </div>
            ) : (
              currentSection.data.map((text, idx) => {
                const uniqueId = `${activeTab}-${idx}`;
                const isRevealed = revealedIds.has(uniqueId);
                const isPlaying = playingId === uniqueId;

                // Game Mode: Clicking item launches game
                if (gameMode) {
                   return (
                      <div 
                        key={uniqueId}
                        onClick={() => initCipherGame(text)}
                        className="p-6 bg-white border-2 border-stone-200 rounded-xl hover:border-purple-500 hover:shadow-lg cursor-pointer transition-all flex items-center justify-between group"
                      >
                         <span className="text-2xl font-bold text-stone-700 font-serif">{text}</span>
                         <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs font-bold uppercase group-hover:bg-purple-600 group-hover:text-white transition-colors">
                           Load Cipher &rarr;
                         </span>
                      </div>
                   );
                }

                // Standard Mode
                return (
                  <div 
                    key={uniqueId} 
                    className={`
                      flex items-center p-6 rounded-xl border-2 shadow-sm transition-all min-h-[7rem]
                      ${isRevealed ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-200'}
                      ${isPlaying ? 'border-red-500 ring-2 ring-red-100' : ''}
                    `}
                  >
                    {/* Number Badge */}
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-stone-200 rounded-lg mr-6 font-bold text-xl text-stone-600 border border-stone-300 shadow-inner font-serif">
                      {idx + 1}
                    </div>

                    {/* Audio Button */}
                    <button
                      onClick={() => speakWord(text, uniqueId)}
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center mr-6 shadow-md transition-transform active:scale-95 flex-shrink-0
                        ${isPlaying ? 'bg-red-600 text-white animate-pulse' : 'bg-stone-800 text-white hover:bg-stone-700'}
                      `}
                    >
                      {isPlaying ? <Volume2 className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                    </button>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                             {isRevealed ? (
                               <div className="animate-in fade-in slide-in-from-left-2 py-2">
                                  <span className="text-5xl md:text-6xl font-bold font-serif text-stone-900 tracking-wide break-words leading-snug">
                                    {text}
                                  </span>
                               </div>
                             ) : (
                               <div className="h-20 w-full max-w-sm bg-stone-200 rounded animate-pulse" />
                             )}
                          </div>

                          {/* Reveal Toggle */}
                          <button
                            onClick={() => toggleReveal(uniqueId)}
                            className={`
                              px-4 py-3 rounded-lg border flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors min-w-[110px] justify-center ml-4
                              ${isRevealed 
                                ? 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200' 
                                : 'bg-white text-red-800 border-red-200 hover:bg-red-50 hover:border-red-300 shadow-sm'
                              }
                            `}
                          >
                            {isRevealed ? (
                              <>Hide <EyeOff className="w-4 h-4" /></>
                            ) : (
                              <>Reveal <Eye className="w-4 h-4" /></>
                            )}
                          </button>
                       </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Empty slots placeholders if less than count */}
            {Array.from({ length: Math.max(0, currentSection.count - currentSection.data.length) }).map((_, idx) => (
               <div key={`empty-${idx}`} className="flex items-center p-6 rounded-xl border-2 border-dashed border-stone-200 bg-transparent opacity-50 min-h-[7rem]">
                  <div className="w-12 h-12 flex items-center justify-center border-2 border-dashed border-stone-300 rounded-lg mr-6 text-stone-300 font-bold text-xl font-serif">
                     {currentSection.data.length + idx + 1}
                  </div>
                  <span className="text-stone-300 italic">Empty Slot</span>
               </div>
            ))}
          </div>

        </div>

        {/* Drawing Canvas (Under Game Overlay if active, but game is modal so this is fine) */}
        {!gameMode && (
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
        )}
      </div>
    </div>
  );
};

export default Spelling;