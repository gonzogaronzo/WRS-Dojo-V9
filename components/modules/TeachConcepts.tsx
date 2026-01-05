
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Lesson, Slide } from '../../types';
import Slideshow from './Slideshow';
import GenericText from './GenericText';
import { parseWordToTiles, getTileColor, TileData, generateId } from '../../utils';
import Tile from '../Tile';
import { MonitorPlay, BookOpen, Grid3X3, Eraser, Delete, PenTool, MousePointer2, Trash2, PlusCircle, Save, Gamepad2, Check, X, Edit3, ChevronLeft, ChevronRight, Type, Sparkles, ChevronDown } from 'lucide-react';
import Draggable from '../interactive/Draggable';

interface TeachConceptsProps {
  lesson: Lesson;
  isSpelling?: boolean; 
  onUpdateLesson?: (lesson: Lesson) => void;
  onAddToInventory?: (text: string) => void;
  initialMode?: 'slides' | 'notes' | 'board' | 'cipher'; 
}

// Decoration interface for markings
interface Decoration {
  id: string;
  text: string;
  type: 'symbol' | 'syllableType';
  x: number;
  y: number;
}

type CipherSegment = 
  | { type: 'static'; tiles: TileData[] }
  | { type: 'blank'; id: number; correctText: string };

const PHONEME_MAP: Record<string, string[]> = {
  'k': ['c', 'k', 'ck'],
  'j': ['j', 'g', 'dge'],
  'ch': ['ch', 'tch'],
  'f': ['f', 'ff', 'ph'],
  's': ['s', 'ss', 'c'],
  'z': ['z', 'zz', 's'],
  'er': ['er', 'ir', 'ur'],
  'ā': ['a-e', 'ai', 'ay'],
  'ē': ['e-e', 'ee', 'ea', 'y'],
  'ī': ['i-e', 'igh', 'y'],
  'ō': ['o-e', 'oa', 'ow'],
  'ū': ['u-e', 'oo', 'ue', 'ew'],
  'oi': ['oi', 'oy'],
  'ow': ['ou', 'ow'],
  'au': ['au', 'aw'],
  'shun': ['tion', 'sion', 'cian'],
  'cher': ['ture', 'cher']
};

const TeachConcepts: React.FC<TeachConceptsProps> = ({ lesson, isSpelling = false, onUpdateLesson, onAddToInventory, initialMode: forcedInitialMode }) => {
  const hasSlides = (lesson.slides && lesson.slides.length > 0) || lesson.googleSlidesUrl;
  const hasCipher = lesson.cipherWords && lesson.cipherWords.length > 0;

  const determineInitialMode = () => {
    if (forcedInitialMode) return forcedInitialMode;
    if (isSpelling) {
      return hasCipher ? 'cipher' : 'notes';
    }
    if (hasSlides) return 'slides';
    return 'board'; 
  };

  const [mode, setMode] = useState<'slides' | 'notes' | 'board' | 'cipher'>(determineInitialMode());
  
  // Magnetic Board State
  const [boardText, setBoardText] = useState('');
  const [scale, setScale] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [inventoryFeedback, setInventoryFeedback] = useState(false);
  
  // Markings / Decorations state
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'symbols' | 'syllableTypes' | null>(null);

  const tilesContainerRef = useRef<HTMLDivElement>(null);
  const tilesContentRef = useRef<HTMLDivElement>(null);
  
  const [tool, setTool] = useState<'cursor' | 'pen-blue' | 'pen-red'>('cursor');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Cipher state
  const [currentCipherIndex, setCurrentCipherIndex] = useState(0);
  const [cipherSegments, setCipherSegments] = useState<CipherSegment[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [activeBlankId, setActiveBlankId] = useState<number | null>(null);
  const [cipherOptions, setCipherOptions] = useState<string[]>([]);
  const [gameStatus, setGameStatus] = useState<'playing' | 'correct' | 'incorrect'>('playing');

  // Constants for markings
  const WRS_SYMBOLS = [
    { label: 'Breve', char: '˘', desc: 'Short vowel' },
    { label: 'Macron', char: '¯', desc: 'Long vowel' },
    { label: 'Umlaut', char: '¨', desc: 'Modified sound' },
    { label: 'Single Dot', char: '˙', desc: 'Focus' },
    { label: 'Schwa', char: 'ə', desc: 'Unstressed' },
  ];

  const SYLLABLE_TYPES = ['c', 'v-e', 'o', '-le', 'r', 'vv', 'x'];

  useEffect(() => {
    if (mode === 'board') {
      const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
          canvasRef.current.width = containerRef.current.offsetWidth;
          canvasRef.current.height = containerRef.current.offsetHeight;
        }
      };
      setTimeout(handleResize, 50);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [mode]);

  useEffect(() => {
    const calculateScale = () => {
      if (mode === 'board' && tilesContainerRef.current && tilesContentRef.current) {
        const containerWidth = tilesContainerRef.current.clientWidth;
        const padding = 64; 
        const availableWidth = containerWidth - padding;
        const contentWidth = tilesContentRef.current.scrollWidth;
        if (contentWidth > availableWidth && availableWidth > 0) {
          setScale(availableWidth / contentWidth);
        } else {
          setScale(1);
        }
      }
    };
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [boardText, mode]);

  // Handle Initial Cipher Population
  useEffect(() => {
    if (mode === 'cipher' && hasCipher && lesson.cipherWords) {
      loadCipherWord(0);
    }
  }, [mode, hasCipher]);

  const loadCipherWord = (idx: number) => {
    if (!lesson.cipherWords || !lesson.cipherWords[idx]) return;
    setCurrentCipherIndex(idx);
    const rawWord = lesson.cipherWords[idx];
    
    // Regex matches: /phoneme/ OR [options] OR static text
    const regex = /(\/([^\/]+)\/)|(\[([^\]]+)\])|([^/\[\]]+)/g;
    const segments: CipherSegment[] = [];
    let blankCounter = 0;
    let match;

    while ((match = regex.exec(rawWord)) !== null) {
      const phonemeMatch = match[2]; // /k/
      const bracketMatch = match[4]; // [c|k|ck]
      const staticText = match[5];   // lap

      if (phonemeMatch) {
        const options = PHONEME_MAP[phonemeMatch] || [phonemeMatch];
        let correctSpelling = '';
        
        // --- LOOKBACK LOGIC ---
        const prevSeg = segments[segments.length - 1];
        if (prevSeg && prevSeg.type === 'static') {
           const combinedText = prevSeg.tiles.map(t => t.text).join('');
           const sortedOpts = [...options].sort((a,b) => b.length - a.length);
           const found = sortedOpts.find(opt => combinedText.endsWith(opt));
           
           if (found) {
              correctSpelling = found;
              const remainingText = combinedText.slice(0, -found.length);
              if (remainingText === '') {
                 segments.pop(); 
              } else {
                 prevSeg.tiles = parseWordToTiles(remainingText);
              }
           }
        }
        
        segments.push({ 
          type: 'blank', 
          id: blankCounter++, 
          correctText: correctSpelling || options[0] 
        });
      } else if (bracketMatch) {
        const opts = bracketMatch.split('|').map(s => s.trim()).filter(Boolean);
        segments.push({ type: 'blank', id: blankCounter++, correctText: opts[0] });
      } else if (staticText) {
        segments.push({ type: 'static', tiles: parseWordToTiles(staticText) });
      }
    }
    
    setCipherSegments(segments);
    setUserAnswers({});
    setActiveBlankId(null);
    setGameStatus('playing');
    setCipherOptions([]);
  };

  const handleBlankClick = (blankId: number, correctText: string) => {
    if (gameStatus !== 'playing') return;
    setActiveBlankId(blankId);
    
    const rawWord = lesson.cipherWords?.[currentCipherIndex] || '';
    const phonemeMatches = Array.from(rawWord.matchAll(/\/([^\/]+)\//g));
    const phonemeKey = phonemeMatches[blankId]?.[1];

    let pool: string[] = [];
    if (phonemeKey && PHONEME_MAP[phonemeKey]) {
      pool = PHONEME_MAP[phonemeKey];
    } else {
      const distractorsString = lesson.cipherDistractors?.[currentCipherIndex] || '';
      const distractors = distractorsString.split(',').map(s => s.trim()).filter(Boolean);
      pool = Array.from(new Set([correctText, ...distractors]));
    }
    
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setCipherOptions(shuffled);
  };

  const handleOptionSelect = (text: string) => {
    if (activeBlankId === null) return;
    setUserAnswers(prev => ({ ...prev, [activeBlankId]: text }));
    setActiveBlankId(null);
  };

  const checkCipher = () => {
    const blanks = cipherSegments.filter(s => s.type === 'blank') as {type: 'blank', id: number, correctText: string}[];
    const allAnswered = blanks.every(b => userAnswers[b.id]);
    if (!allAnswered) return;
    
    const isCorrect = blanks.every(b => userAnswers[b.id] === b.correctText);
    setGameStatus(isCorrect ? 'correct' : 'incorrect');
  };

  const nextCipher = () => {
    if (lesson.cipherWords && currentCipherIndex < lesson.cipherWords.length - 1) {
      loadCipherWord(currentCipherIndex + 1);
    }
  };

  const prevCipher = () => {
    if (currentCipherIndex > 0) {
      loadCipherWord(currentCipherIndex - 1);
    }
  };

  const getGameTile = (text: string): TileData => {
    const parsed = parseWordToTiles(text);
    if (parsed.length === 1) return parsed[0];
    return { text, type: 'syllable' };
  };

  const clearMarkings = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setDecorations([]);
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

  const handleTileClick = (text: string) => {
    setBoardText(prev => prev + text);
  };

  const clearBoard = () => {
    setBoardText('');
    setDecorations([]); 
    clearMarkings(); 
  };
  
  const backspace = () => setBoardText(prev => prev.slice(0, -1));

  const addToSlides = () => {
    if (!boardText.trim() || !onUpdateLesson) return;
    const newSlide: Slide = { id: generateId(), type: 'word', title: '', content: boardText };
    const updatedLesson = { ...lesson, slides: [...(lesson.slides || []), newSlide] };
    onUpdateLesson(updatedLesson);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2000);
  };

  const saveToInventory = () => {
    if (!boardText.trim() || !onAddToInventory) return;
    onAddToInventory(boardText);
    setInventoryFeedback(true);
    setTimeout(() => setInventoryFeedback(false), 2000);
  };

  const addDecoration = (text: string, type: 'symbol' | 'syllableType') => {
    const container = containerRef.current;
    const newDec: Decoration = {
      id: generateId(),
      text,
      type,
      x: container ? (container.offsetWidth - 140) : 600,
      y: 100
    };
    setDecorations(prev => [...prev, newDec]);
    setActiveDropdown(null);
  };

  const handleDecDragEnd = (id: string, pos: { x: number, y: number }) => {
    setDecorations(prev => prev.map(d => d.id === id ? { ...d, x: pos.x, y: pos.y } : d));
  };

  const removeDecoration = (id: string) => {
    setDecorations(prev => prev.filter(d => d.id !== id));
  };

  const parsedTiles = parseWordToTiles(boardText);

  const tileBanks = {
    vowels: ['a', 'e', 'i', 'o', 'u', 'y'],
    digraphs: ['sh', 'ch', 'th', 'wh', 'ck'],
    welded: ['all', 'am', 'an', 'ang', 'ing', 'ong', 'ung', 'ank', 'ink', 'onk', 'unk'],
    consonants: ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'qu', 'r', 's', 't', 'v', 'w', 'x', 'z']
  };

  const renderTileBank = (title: string, items: string[], typeOverride?: TileData['type']) => (
    <div className="mb-4">
      <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map(item => {
          const type = typeOverride || parseWordToTiles(item)[0]?.type || 'consonant';
          return (
            <button
              key={item}
              onClick={() => handleTileClick(item)}
              className={`h-10 min-w-[2.5rem] px-2 rounded border-b-2 shadow-sm font-bold text-lg hover:-translate-y-1 transition-transform ${getTileColor(type)}`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-[#fdf6e3]">
      <div className="h-16 bg-stone-900 border-b-4 border-red-900 flex items-center justify-between px-6 shadow-md z-30 flex-shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold text-[#fdf6e3] flex items-center gap-3 font-serif uppercase tracking-wider">
            {isSpelling ? <Edit3 className="w-6 h-6 text-red-500" /> : <BookOpen className="w-6 h-6 text-red-500" />}
            {isSpelling ? "Teach Concepts (Spelling)" : "Teach Concepts (Reading)"}
          </h2>

          {mode === 'board' && (
            <div className="hidden lg:flex items-center gap-2 border-l border-stone-700 pl-6">
               <div className="relative">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === 'symbols' ? null : 'symbols')}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold uppercase transition-colors ${activeDropdown === 'symbols' ? 'bg-red-800 text-white shadow' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
                  >
                     Symbols <ChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === 'symbols' ? 'rotate-180' : ''}`} />
                  </button>
                  {activeDropdown === 'symbols' && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-stone-800 border border-stone-700 rounded-lg shadow-2xl p-2 z-[60] animate-in zoom-in-95 origin-top-left flex flex-col gap-1">
                       {WRS_SYMBOLS.map(sym => (
                         <button 
                           key={sym.char}
                           onClick={() => addDecoration(sym.char, 'symbol')}
                           className="flex items-center justify-between px-3 py-2 hover:bg-stone-700 rounded text-stone-200 group"
                         >
                            <span className="text-2xl font-bold font-serif leading-none text-red-500">{sym.char}</span>
                            <span className="text-[10px] uppercase font-bold text-stone-500 group-hover:text-stone-300">{sym.label}</span>
                         </button>
                       ))}
                    </div>
                  )}
               </div>

               <div className="relative">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === 'syllableTypes' ? null : 'syllableTypes')}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold uppercase transition-colors ${activeDropdown === 'syllableTypes' ? 'bg-red-800 text-white shadow' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
                  >
                     Syllable Types <ChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === 'syllableTypes' ? 'rotate-180' : ''}`} />
                  </button>
                  {activeDropdown === 'syllableTypes' && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-stone-800 border border-stone-700 rounded-lg shadow-2xl p-2 z-[60] animate-in zoom-in-95 origin-top-left flex flex-col gap-1">
                       {SYLLABLE_TYPES.map(type => (
                         <button 
                           key={type}
                           onClick={() => addDecoration(type, 'syllableType')}
                           className="flex items-center gap-3 px-3 py-2 hover:bg-stone-700 rounded text-stone-200"
                         >
                            <span className="text-xl font-black font-serif italic text-red-500 w-8 text-center">{type}</span>
                            <span className="text-[10px] uppercase font-bold text-stone-500">Label</span>
                         </button>
                       ))}
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-4">
          {mode === 'board' && (
            <div className="flex bg-stone-800 p-1 rounded-lg gap-1 border border-stone-600 mr-4">
               <button onClick={() => setTool('cursor')} className={`p-2 rounded ${tool === 'cursor' ? 'bg-[#fdf6e3] text-stone-900' : 'text-stone-400 hover:text-white'}`}><MousePointer2 className="w-4 h-4" /></button>
               <button onClick={() => setTool('pen-blue')} className={`p-2 rounded ${tool === 'pen-blue' ? 'bg-indigo-900 text-indigo-300 ring-1 ring-indigo-500' : 'text-stone-400 hover:text-indigo-300'}`}><PenTool className="w-4 h-4" /></button>
               <button onClick={() => setTool('pen-red')} className={`p-2 rounded ${tool === 'pen-red' ? 'bg-red-900 text-red-300 ring-1 ring-red-500' : 'text-stone-400 hover:text-red-300'}`}><PenTool className="w-4 h-4" /></button>
               <div className="w-px h-6 bg-stone-600 mx-1 self-center" />
               <button onClick={clearMarkings} className="p-2 rounded text-stone-400 hover:text-white hover:bg-red-900 transition-colors" title="Clear Canvas and Symbols"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}

          <div className="flex bg-stone-800 p-1 rounded-lg gap-1 border border-stone-600">
             <button onClick={() => setMode('board')} className={`flex items-center gap-2 px-3 py-2 rounded ${mode === 'board' ? 'bg-red-900 text-white shadow' : 'text-stone-400 hover:text-white'}`}><Grid3X3 className="w-4 h-4" /><span className="text-xs font-bold uppercase hidden md:inline">Board</span></button>
             {hasCipher && (
               <button onClick={() => setMode('cipher')} className={`flex items-center gap-2 px-3 py-2 rounded ${mode === 'cipher' ? 'bg-red-900 text-white shadow' : 'text-stone-400 hover:text-white'}`}><Gamepad2 className="w-4 h-4" /><span className="text-xs font-bold uppercase hidden md:inline">Cipher</span></button>
             )}
             {hasSlides && !isSpelling && (
               <button onClick={() => setMode('slides')} className={`flex items-center gap-2 px-3 py-2 rounded ${mode === 'slides' ? 'bg-red-900 text-white shadow' : 'text-stone-400 hover:text-white'}`}><MonitorPlay className="w-4 h-4" /><span className="text-xs font-bold uppercase hidden md:inline">Slides</span></button>
             )}
             <button onClick={() => setMode('notes')} className={`flex items-center gap-2 px-3 py-2 rounded ${mode === 'notes' ? 'bg-red-900 text-white shadow' : 'text-stone-400 hover:text-white'}`}><BookOpen className="w-4 h-4" /><span className="text-xs font-bold uppercase hidden md:inline">Notes</span></button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {mode === 'slides' && <Slideshow slides={lesson.slides} googleSlidesUrl={lesson.googleSlidesUrl} />}
        {mode === 'notes' && (
          <GenericText 
            title={isSpelling ? "Spelling Concepts" : "Reading Concepts"} 
            description="Teacher reference."
            content={isSpelling ? (lesson.conceptNotes7 || "No spelling notes provided.") : (lesson.conceptNotes || "No reading notes provided.")}
            list={lesson.affixPractice.map(a => `${a.type.toUpperCase()}: ${a.text} (e.g. ${a.examples})`)}
          />
        )}
        {mode === 'cipher' && (
           <div className="h-full bg-stone-900 flex flex-col items-center justify-center p-8 relative overflow-hidden">
               <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')] pointer-events-none"></div>
               <button onClick={prevCipher} disabled={currentCipherIndex === 0} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-4 rounded-full bg-stone-800/50 text-stone-400 hover:text-white hover:bg-stone-700 disabled:opacity-0 transition-all"><ChevronLeft className="w-8 h-8" /></button>
               <button onClick={nextCipher} disabled={!lesson.cipherWords || currentCipherIndex >= lesson.cipherWords.length - 1} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-4 rounded-full bg-stone-800/50 text-stone-400 hover:text-white hover:bg-stone-700 disabled:opacity-0 transition-all"><ChevronRight className="w-8 h-8" /></button>
               <div className="max-w-5xl w-full z-10 flex flex-col items-center">
                  <div className="flex flex-wrap items-end justify-center gap-2 mb-12">
                     {cipherSegments.map((seg, idx) => {
                       if (seg.type === 'static') {
                         return seg.tiles.map((t, tIdx) => (
                           <div key={`${idx}-${tIdx}`} className="pointer-events-none"><Tile data={t} size="lg" /></div>
                         ));
                       } else {
                         const usersChoice = userAnswers[seg.id];
                         const isCorrect = gameStatus === 'correct' || (gameStatus === 'incorrect' && usersChoice === seg.correctText);
                         const isIncorrect = gameStatus === 'incorrect' && usersChoice !== seg.correctText;
                         const displayText = gameStatus === 'incorrect' ? seg.correctText : usersChoice;
                         return (
                           <div key={idx} className="relative">
                             <div onClick={() => handleBlankClick(seg.id, seg.correctText)} className={`min-w-[6rem] h-32 border-4 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-all bg-stone-800 ${usersChoice ? 'border-transparent bg-transparent' : 'border-stone-600 hover:border-stone-400 hover:bg-stone-700'} ${isCorrect || (gameStatus === 'incorrect' && usersChoice === seg.correctText) ? 'ring-4 ring-green-500 rounded-xl' : ''} ${isIncorrect ? 'ring-4 ring-red-500 rounded-xl' : ''} ${activeBlankId === seg.id ? 'ring-4 ring-yellow-400 rounded-xl' : ''}`}>
                               {displayText ? <div className="pointer-events-none"><Tile data={getGameTile(displayText)} size="lg" /></div> : <span className="text-stone-600 font-black text-6xl">_</span>}
                             </div>
                             {activeBlankId === seg.id && (
                               <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 bg-stone-100 p-4 rounded-xl shadow-2xl border-4 border-stone-800 z-50 flex gap-2 animate-in slide-in-from-top-2">
                                  {cipherOptions.map((opt, optIdx) => (
                                    <button key={optIdx} onClick={() => handleOptionSelect(opt)} className="transform transition-transform hover:scale-110 active:scale-95"><Tile data={getGameTile(opt)} size="md" /></button>
                                  ))}
                                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-stone-100 transform rotate-45 border-t-4 border-l-4 border-stone-800"></div>
                               </div>
                             )}
                           </div>
                         );
                       }
                     })}
                  </div>
                  <div className="flex gap-4">
                     {gameStatus === 'playing' && <button onClick={checkCipher} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold uppercase tracking-widest shadow-lg animate-bounce">Check Answer</button>}
                     {gameStatus === 'correct' && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-green-400 font-bold text-2xl uppercase tracking-widest animate-pulse flex items-center gap-2"><Check className="w-8 h-8" /> Correct!</div>
                            <button onClick={nextCipher} disabled={!lesson.cipherWords || currentCipherIndex >= lesson.cipherWords.length - 1} className="px-8 py-3 bg-stone-100 hover:bg-white text-stone-900 rounded-lg font-bold uppercase tracking-widest shadow-lg flex items-center gap-2">Next Puzzle <Check className="w-5 h-5 text-green-600" /></button>
                        </div>
                     )}
                     {gameStatus === 'incorrect' && (
                       <div className="flex flex-col items-center gap-4">
                          <div className="text-red-400 font-bold text-xl uppercase tracking-widest flex items-center gap-2"><X className="w-6 h-6" /> Incorrect</div>
                          <button onClick={() => loadCipherWord(currentCipherIndex)} className="px-6 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded font-bold uppercase">Try Again</button>
                       </div>
                     )}
                  </div>
               </div>
               <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
                  {lesson.cipherWords?.map((_, i) => (
                    <div 
                      key={i} 
                      onClick={() => loadCipherWord(i)} 
                      className={`w-3 h-3 rounded-full cursor-pointer transition-colors ${i === currentCipherIndex ? 'bg-red-600' : 'bg-stone-700 hover:bg-stone-500'}`} 
                    />
                  ))}
               </div>
           </div>
        )}

        {mode === 'board' && (
          <div className="h-full flex flex-col bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')] relative">
            <div ref={containerRef} className="flex-1 relative border-b-4 border-stone-800 bg-stone-100/50 shadow-inner overflow-hidden">
               <div className="absolute inset-0 z-40 pointer-events-none">
                 {decorations.map((dec) => (
                   <Draggable
                     key={dec.id}
                     initialPos={{ x: dec.x, y: dec.y }}
                     onDragEnd={(p) => handleDecDragEnd(dec.id, p)}
                     className="pointer-events-auto"
                   >
                     <div 
                       onDoubleClick={() => removeDecoration(dec.id)}
                       className={`
                         cursor-grab active:cursor-grabbing select-none transition-all hover:scale-110 relative group
                         text-red-950 font-black 
                         ${dec.type === 'syllableType' ? 'text-5xl font-serif italic' : 'text-8xl font-serif leading-none'}
                       `}
                       style={{ 
                         WebkitTextStroke: '2px white',
                         textShadow: '0px 4px 6px rgba(0,0,0,0.4)'
                       }}
                       title="Double click to delete"
                     >
                       {dec.text}
                       <button 
                          onClick={() => removeDecoration(dec.id)}
                          className="absolute -top-4 -right-4 bg-red-800 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border-2 border-white pointer-events-auto"
                       >
                          <X className="w-3 h-3" />
                       </button>
                     </div>
                   </Draggable>
                 ))}
               </div>

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

               <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 pointer-events-none">
                  <div ref={tilesContainerRef} className="pointer-events-auto min-h-[12rem] w-full max-w-5xl bg-white/80 rounded-xl border-2 border-stone-300 p-8 shadow-sm transition-all flex items-center justify-center overflow-hidden">
                      {parsedTiles.length === 0 ? (
                        <span className="text-stone-300 italic text-2xl font-serif">Enter text below to build tiles...</span>
                      ) : (
                        <div ref={tilesContentRef} className="flex flex-nowrap items-center justify-center gap-0 transition-transform duration-200 origin-center" style={{ transform: `scale(${scale})`, width: 'max-content', flexShrink: 0 }}>
                          {parsedTiles.map((t, i) => (<Tile key={i} data={t} size="lg" />))}
                        </div>
                      )}
                  </div>
                  <div className="mt-8 w-full max-w-2xl flex flex-col gap-2 pointer-events-auto relative z-30">
                    <div className="flex gap-4 items-center">
                      <input 
                        type="text" 
                        value={boardText} 
                        onChange={(e) => setBoardText(e.target.value.replace(/_/g, '{ }'))} 
                        className="flex-1 text-5xl font-bold p-6 rounded-xl border-4 border-stone-300 focus:border-red-800 outline-none font-serif text-center shadow-inner bg-white h-24" 
                        placeholder="Type..." 
                        autoFocus 
                      />
                      <button onClick={backspace} className="bg-stone-200 hover:bg-stone-300 text-stone-700 h-24 w-20 rounded border border-stone-300 shadow-sm flex items-center justify-center" title="Backspace"><Delete className="w-8 h-8" /></button>
                      <button onClick={clearBoard} className="bg-red-100 hover:bg-red-200 text-red-800 h-24 w-20 rounded border border-red-200 shadow-sm flex items-center justify-center" title="Clear Board"><Eraser className="w-8 h-8" /></button>
                      <button onClick={addToSlides} disabled={!boardText.trim()} className={`h-24 w-20 rounded border shadow-sm transition-all flex items-center justify-center ${addedFeedback ? 'bg-green-100 text-green-800 border-green-200' : 'bg-stone-800 hover:bg-stone-700 text-white border-stone-800 disabled:opacity-50 disabled:bg-stone-300 disabled:text-stone-500 disabled:border-stone-300'}`} title="Add word to Slideshow">{addedFeedback ? <span className="font-bold text-xs">Added!</span> : <PlusCircle className="w-8 h-8" />}</button>
                      {onAddToInventory && (
                        <button onClick={saveToInventory} disabled={!boardText.trim()} className={`h-24 w-20 rounded border shadow-sm transition-all flex items-center justify-center ${inventoryFeedback ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-600 disabled:opacity-50 disabled:bg-stone-300 disabled:text-stone-500 disabled:border-stone-300'}`} title="Save to Group Inventory">{inventoryFeedback ? <span className="font-bold text-xs">Saved!</span> : <Save className="w-8 h-8" />}</button>
                      )}
                    </div>
                  </div>
               </div>
            </div>
            <div className="h-[40%] bg-[#fdf6e3] p-6 overflow-y-auto border-t border-stone-300 relative z-30">
               <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                 <div className="mb-4">
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Blanks</h4>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleTileClick('{ }')} className={`h-10 min-w-[2.5rem] px-2 rounded border-b-2 shadow-sm font-bold text-lg hover:-translate-y-1 transition-transform ${getTileColor('consonant')}`} title="Blank Consonant" />
                      <button onClick={() => handleTileClick('[ ]')} className={`h-10 min-w-[2.5rem] px-2 rounded border-b-2 shadow-sm font-bold text-lg hover:-translate-y-1 transition-transform ${getTileColor('vowel')}`} title="Blank Vowel" />
                      <button onClick={() => handleTileClick('/ /')} className={`h-10 min-w-[2.5rem] px-2 rounded border-b-2 shadow-sm font-bold text-lg hover:-translate-y-1 transition-transform ${getTileColor('welded')}`} title="Blank Welded" />
                      <button onClick={() => handleTileClick('| |')} className={`h-10 min-w-[2.5rem] px-2 rounded border-b-2 shadow-sm font-bold text-lg hover:-translate-y-1 transition-transform ${getTileColor('syllable')}`} title="Blank Syllable (White)" />
                      <button onClick={() => handleTileClick('< >')} className={`h-10 min-w-[2.5rem] px-2 rounded border-b-2 shadow-sm font-bold text-lg hover:-translate-y-1 transition-transform ${getTileColor('suffix')}`} title="Blank Affix (Yellow)" />
                    </div>
                 </div>
                 {renderTileBank('Vowels', tileBanks.vowels, 'vowel')}
                 {renderTileBank('Digraphs', tileBanks.digraphs, 'digraph')}
                 {renderTileBank('Welded Sounds', tileBanks.welded, 'welded')}
                 {renderTileBank('Consonants', tileBanks.consonants, 'consonant')}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeachConcepts;
