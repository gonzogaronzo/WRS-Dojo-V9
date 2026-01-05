import React, { useState, useRef, useEffect } from 'react';
import { WordCard } from '../../types';
import { Shuffle, LayoutGrid, Users, Sword, Scroll, User, X, Book, Eye, EyeOff, Layers, Save, ArrowDown, Hand, Trophy, Grid3X3, SplitSquareHorizontal, RefreshCcw, Gamepad2, ChevronDown, Check, AlertCircle, Brain, Ban, Coins, ArrowRight, Flag } from 'lucide-react';
import Draggable from '../interactive/Draggable';
import { parseWordToTiles, getTileColor, generateId } from '../../utils';

interface WordCardsProps {
  cards: WordCard[];
  hfw?: string[];
  students?: string[]; // Optional roster from Briefing
  onAddToInventory?: (text: string) => void;
}

interface CardState {
  x: number;
  y: number;
  faceUp: boolean;
  zIndex: number;
  inDeck: boolean; // If true, it's hidden in the draw pile
}

// Baseball State Interfaces
type TeamColor = 'red' | 'blue';

interface BaseballState {
  redScore: number;
  blueScore: number;
  currentTeam: TeamColor;
  outs: number;
  strikes: number; 
  runners: [boolean, boolean, boolean]; // [1st, 2nd, 3rd] - occupied or not
  inning: number;
  isBottom: boolean; // false = Top (Red), true = Bottom (Blue)
  gameOver: boolean;
  message: string; 
  messageColor: string;
  batterIndexRed: number;
  batterIndexBlue: number;
  showFireworks: boolean;
}

// OOPS Game State
interface OopsState {
  active: boolean;
  playerScores: number[];
  currentPlayerIndex: number;
  turnScore: number;
  isBust: boolean;
  lastDrawnCardId: string | null;
  winner: number | null; // Index of winner
}

type TatamiGameType = 'standard' | 'oops' | 'sorting' | 'memory';

const TATAMI_GAMES = [
  { id: 'standard', label: 'Freeplay', icon: LayoutGrid, desc: 'Open Table' },
  { id: 'oops', label: 'OOPS!', icon: AlertCircle, desc: 'First to 10 Points' },
  { id: 'sorting', label: 'Sorting', icon: SplitSquareHorizontal, desc: 'Categorize cards' },
  { id: 'memory', label: 'Memory', icon: Brain, desc: 'Find pairs' },
];

// Robust Shuffle Helper (Fisher-Yates)
function robustShuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- PERSISTENCE KEY ---
const GAME_STORAGE_KEY = 'wrs_active_game_state_v1';

const WordCards: React.FC<WordCardsProps> = ({ cards, hfw = [], students = [], onAddToInventory }) => {
  const [mode, setMode] = useState<'duel' | 'tabletop' | 'baseball'>('duel');
  const [filter, setFilter] = useState<'all' | 'decodable' | 'hfw'>('all');
  
  const [activeCards, setActiveCards] = useState<WordCard[]>([]);
  
  // === TABLETOP STATE ===
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [topZ, setTopZ] = useState(100); // Start high
  const [dealFaceUp, setDealFaceUp] = useState(true); // Dealer setting
  const [showZones, setShowZones] = useState(false); // Sorting Zones variation
  const [tatamiGame, setTatamiGame] = useState<TatamiGameType>('standard');
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);

  // === OOPS STATE ===
  const [oopsState, setOopsState] = useState<OopsState>({
    active: false,
    playerScores: [],
    currentPlayerIndex: 0,
    turnScore: 0,
    isBust: false,
    lastDrawnCardId: null,
    winner: null
  });

  // === DUEL STATE ===
  const [numPlayers, setNumPlayers] = useState<number>(students.length > 0 ? students.length : 0);
  const [playerHands, setPlayerHands] = useState<(WordCard | null)[]>([]);
  
  // Queue for Infinite Dealing (Duel) and Pitching (Baseball)
  const [drawPile, setDrawPile] = useState<WordCard[]>([]);
  
  const [focusedCard, setFocusedCard] = useState<WordCard | null>(null);
  const [saveFeedback, setSaveFeedback] = useState(false);

  // === BASEBALL STATE ===
  const [bbState, setBbState] = useState<BaseballState>({
    redScore: 0,
    blueScore: 0,
    currentTeam: 'red',
    outs: 0,
    strikes: 0,
    runners: [false, false, false],
    inning: 1,
    isBottom: false,
    gameOver: false,
    message: "Play Ball!",
    messageColor: "text-white",
    batterIndexRed: 0,
    batterIndexBlue: 0,
    showFireworks: false
  });
  const [pitchCard, setPitchCard] = useState<WordCard | null>(null);

  // Helper to filter master list
  const getFilteredCards = (): WordCard[] => {
    const generatedHfwCards: WordCard[] = hfw.map((word, idx) => ({
      id: `hfw-${idx}-${word}`,
      text: word,
      type: 'hfw'
    }));

    if (filter === 'hfw') return generatedHfwCards;
    if (filter === 'decodable') return cards.filter(c => c.type !== 'hfw');
    return [...cards, ...generatedHfwCards];
  };

  // --- PERSISTENCE: LOAD ---
  useEffect(() => {
    const saved = localStorage.getItem(GAME_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.activeCards && parsed.activeCards.length > 0) {
           setActiveCards(parsed.activeCards as WordCard[]);
           if (parsed.oopsState) setOopsState(parsed.oopsState);
           if (parsed.bbState) setBbState(parsed.bbState);
           if (parsed.mode) setMode(parsed.mode);
           if (parsed.tatamiGame) setTatamiGame(parsed.tatamiGame);
           if (parsed.drawPile) setDrawPile(parsed.drawPile as WordCard[]);
           initializeTabletop(parsed.activeCards as WordCard[]);
           return;
        }
      } catch (e) {
        console.error("Failed to load game state", e);
      }
    }

    const filtered = getFilteredCards();
    const shuffled = robustShuffle(filtered);
    
    setActiveCards(shuffled);
    setDrawPile(shuffled); 
    
    const currentCount = numPlayers > 0 ? numPlayers : (students.length > 0 ? students.length : 0);
    setPlayerHands(new Array(currentCount).fill(null));
    
    initializeTabletop(shuffled);
    setShowZones(false);
    setTatamiGame('standard'); 
    resetBaseball();

  }, [cards, hfw, students, filter]);

  // --- PERSISTENCE: SAVE ---
  useEffect(() => {
    if (activeCards.length === 0) return;
    const stateToSave = { activeCards, oopsState, bbState, mode, tatamiGame, drawPile };
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [activeCards, oopsState, bbState, mode, tatamiGame, drawPile]);


  const shuffleCards = () => {
    const filtered = getFilteredCards();
    const shuffled = robustShuffle(filtered);
    setActiveCards(shuffled);
    setDrawPile(shuffled);
    setPlayerHands(new Array(numPlayers).fill(null));
    initializeTabletop(shuffled);
    if (mode === 'baseball' && !pitchCard && !bbState.gameOver) nextPitch(shuffled);
    if (tatamiGame === 'oops') initOopsGame(shuffled);
  };

  const initializeTabletop = (currentCards: WordCard[]) => {
    const newStates: Record<string, CardState> = {};
    currentCards.forEach(c => {
      newStates[c.id] = {
        x: 0, 
        y: 0,
        faceUp: false,
        zIndex: 1,
        inDeck: true
      };
    });
    setCardStates(newStates);
    setTopZ(100);
  };

  const handleGameSelect = (gameId: string) => {
    setIsGameMenuOpen(false);
    if (gameId === 'runner') {
       setMode('baseball');
       resetBaseball();
       if(!pitchCard) nextPitch();
       return;
    }
    setTatamiGame(gameId as TatamiGameType);
    if (gameId === 'oops') {
       initOopsGame();
    } else {
       if (tatamiGame === 'oops') {
          const filtered = getFilteredCards();
          const shuffled = robustShuffle(filtered);
          setActiveCards(shuffled);
          initializeTabletop(shuffled);
       }
       setOopsState(prev => ({ ...prev, active: false }));
    }
    setShowZones(gameId === 'sorting');
  };

  const initOopsGame = (baseCardsInput?: WordCard[]) => {
    const base = baseCardsInput || getFilteredCards();
    const oopsCount = Math.ceil(base.length * 0.25);
    const oopsCards: WordCard[] = Array.from({ length: oopsCount }).map((_, i) => ({
      id: `oops-${generateId()}-${i}`,
      text: "OOPS!",
      type: 'nonsense'
    }));
    const gameDeck = robustShuffle([...base, ...oopsCards]);
    setActiveCards(gameDeck);
    initializeTabletop(gameDeck);
    setOopsState({
      active: true,
      playerScores: new Array(Math.max(numPlayers, 1)).fill(0),
      currentPlayerIndex: 0,
      turnScore: 0,
      isBust: false,
      lastDrawnCardId: null,
      winner: null
    });
  };

  const handleOopsDraw = () => {
     if (!containerRef.current) return;
     const { width, height } = containerRef.current.getBoundingClientRect();
     const deckCards = activeCards.filter(c => cardStates[c.id]?.inDeck);
     if (deckCards.length === 0) return;
     let card = deckCards[deckCards.length - 1]; 
     if (oopsState.turnScore === 0 && card.text === "OOPS!") {
        for (let i = deckCards.length - 2; i >= 0; i--) {
           if (deckCards[i].text !== "OOPS!") {
              card = deckCards[i];
              break;
           }
        }
     }
     const isOops = card.text === "OOPS!";
     const CARD_WIDTH = 160; 
     const CARD_HEIGHT = 100;
     const jitterX = (Math.random() * 4) - 2;
     const jitterY = (Math.random() * 4) - 2;
     const newZ = topZ + 1;
     setCardStates(prev => ({
       ...prev,
       [card.id]: {
         x: (width / 2) - (CARD_WIDTH / 2) + jitterX, 
         y: (height / 2) - (CARD_HEIGHT / 2) + 140 + jitterY,
         faceUp: true,
         zIndex: newZ,
         inDeck: false
       }
     }));
     setTopZ(newZ);
     if (isOops) {
        setOopsState(prev => ({ ...prev, turnScore: 0, isBust: true, lastDrawnCardId: card.id }));
     } else {
        setOopsState(prev => ({ ...prev, turnScore: prev.turnScore + 1, lastDrawnCardId: card.id }));
     }
  };

  const recycleTableCards = () => {
    const onTableIds = new Set(Object.keys(cardStates).filter(id => !cardStates[id].inDeck));
    const cardsOnTable = activeCards.filter(c => onTableIds.has(c.id));
    const cardsInDeck = activeCards.filter(c => !onTableIds.has(c.id));
    const newOrder = [...cardsOnTable, ...cardsInDeck];
    setActiveCards(newOrder);
    setCardStates(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (!next[key].inDeck) {
          next[key].inDeck = true;
          next[key].faceUp = false;
        }
      });
      return next;
    });
  };

  const handleOopsBank = () => {
     recycleTableCards();
     setOopsState(prev => {
        const newScores = [...prev.playerScores];
        const currentScore = newScores[prev.currentPlayerIndex] + prev.turnScore;
        newScores[prev.currentPlayerIndex] = currentScore;
        if (currentScore >= 10) return { ...prev, playerScores: newScores, turnScore: 0, winner: prev.currentPlayerIndex };
        const nextPlayer = (prev.currentPlayerIndex + 1) % prev.playerScores.length;
        return { ...prev, playerScores: newScores, currentPlayerIndex: nextPlayer, turnScore: 0, isBust: false, lastDrawnCardId: null };
     });
  };

  const handleOopsNextTurn = () => {
     recycleTableCards();
     setOopsState(prev => {
        const nextPlayer = (prev.currentPlayerIndex + 1) % prev.playerScores.length;
        return { ...prev, currentPlayerIndex: nextPlayer, turnScore: 0, isBust: false, lastDrawnCardId: null };
     });
  };

  const handleDragEnd = (id: string, pos: { x: number, y: number }) => {
    setCardStates(prev => ({ ...prev, [id]: { ...prev[id], x: pos.x, y: pos.y, zIndex: topZ + 1 } }));
    setTopZ(z => z + 1);
  };

  const bringToFront = (id: string) => {
    setCardStates(prev => ({ ...prev, [id]: { ...prev[id], zIndex: topZ + 1 } }));
    setTopZ(z => z + 1);
  };

  const toggleFlip = (id: string) => {
    setCardStates(prev => ({ ...prev, [id]: { ...prev[id], faceUp: !prev[id].faceUp, zIndex: topZ + 1 } }));
    setTopZ(z => z + 1);
  };

  const dealToPlayers = () => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const count = numPlayers || 4; 
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.40; 
    const deckCards = activeCards.filter(c => cardStates[c.id]?.inDeck);
    if (deckCards.length === 0) return;
    setCardStates(prev => {
      const next = { ...prev };
      let newZ = topZ;
      for (let i = 0; i < count; i++) {
        if (deckCards.length === 0) break;
        const card = deckCards.pop()!;
        newZ++;
        const angle = (i * (360 / count)) * (Math.PI / 180);
        const adjustedAngle = angle + (Math.PI / 2); 
        next[card.id] = {
          x: centerX + (Math.cos(adjustedAngle) * radius) - 60,
          y: centerY + (Math.sin(adjustedAngle) * radius) - 40,
          faceUp: dealFaceUp,
          zIndex: newZ,
          inDeck: false
        };
      }
      return next;
    });
    setTopZ(z => z + count);
  };

  const dealCommon = (count: number) => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const deckCards = activeCards.filter(c => cardStates[c.id]?.inDeck);
    setCardStates(prev => {
      const next = { ...prev };
      let newZ = topZ;
      for (let i = 0; i < count; i++) {
        if (deckCards.length === 0) break;
        const card = deckCards.pop()!;
        newZ += 1;
        next[card.id] = {
          x: (width / 2) - 60 + (Math.random() * 40 - 20),
          y: (height / 2) + 90 + (Math.random() * 40 - 20),
          faceUp: dealFaceUp,
          zIndex: newZ,
          inDeck: false
        };
      }
      return next;
    });
    setTopZ(z => z + count);
  };

  const arrangeGrid = (forceFaceUp: boolean) => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const cardsToGrid = activeCards; 
    if (cardsToGrid.length === 0) return;
    const cols = Math.ceil(Math.sqrt(cardsToGrid.length));
    const rows = Math.ceil(cardsToGrid.length / cols);
    const cardW = 140; 
    const cardH = 100; 
    const startX = (width - (cols * cardW)) / 2 + 20; 
    const startY = (height - (rows * cardH)) / 2 + 20;
    setCardStates(prev => {
      const next = { ...prev };
      let newZ = topZ;
      cardsToGrid.forEach((card, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        newZ++;
        next[card.id] = { x: startX + (col * cardW), y: startY + (row * cardH), faceUp: forceFaceUp, zIndex: newZ, inDeck: false };
      });
      return next;
    });
    setTopZ(z => z + cardsToGrid.length);
  };

  const flipAllBoard = (faceUp: boolean) => {
    setCardStates(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => { if (!next[key].inDeck) next[key].faceUp = faceUp; });
      return next;
    });
  };

  const gatherAll = () => initializeTabletop(activeCards);

  const startDuel = (players: number) => {
    setNumPlayers(players);
    setPlayerHands(new Array(players).fill(null));
    const filtered = getFilteredCards();
    const shuffled = robustShuffle(filtered);
    setDrawPile(shuffled);
    setActiveCards(shuffled);
  };

  const dealRound = () => {
    let currentPile = [...drawPile];
    const cardsOnTable = playerHands.filter((c): c is WordCard => c !== null);
    currentPile = [...currentPile, ...cardsOnTable];
    const newHands: (WordCard | null)[] = [];
    for (let i = 0; i < numPlayers; i++) {
      if (currentPile.length > 0) newHands.push(currentPile.shift()!); 
      else newHands.push(null);
    }
    setPlayerHands(newHands);
    setDrawPile(currentPile);
  };

  const clearCard = (playerIndex: number) => {
    const cardToRemove = playerHands[playerIndex];
    if (!cardToRemove) return;
    const newHands = [...playerHands];
    newHands[playerIndex] = null;
    setPlayerHands(newHands);
    setDrawPile(prev => [...prev, cardToRemove]);
    setFocusedCard(null);
  };
  
  const handleSaveToInventory = () => {
    if (focusedCard && onAddToInventory) {
      onAddToInventory(focusedCard.text);
      setSaveFeedback(true);
      setTimeout(() => setSaveFeedback(false), 2000);
    }
  };

  const resetBaseball = () => {
    setBbState({
      redScore: 0, blueScore: 0, currentTeam: 'red', outs: 0, strikes: 0, runners: [false, false, false],
      inning: 1, isBottom: false, gameOver: false, message: "Play Ball!", messageColor: "text-white",
      batterIndexRed: 0, batterIndexBlue: 0, showFireworks: false
    });
    setPitchCard(null);
  };

  const nextPitch = (pool = drawPile) => {
    let nextPool = [...pool];
    if (nextPool.length === 0) nextPool = robustShuffle(activeCards);
    const card = nextPool.pop() || null;
    setDrawPile(nextPool);
    setPitchCard(card);
  };
  
  const getCurrentBatterName = () => {
    const isRed = bbState.currentTeam === 'red';
    const idx = isRed ? bbState.batterIndexRed : bbState.batterIndexBlue;
    if (students.length === 0) return `${isRed ? 'Red' : 'Blue'} Batter ${idx + 1}`;
    const redRoster = students.filter((_, i) => i % 2 === 0);
    const blueRoster = students.filter((_, i) => i % 2 !== 0);
    const roster = isRed ? redRoster : blueRoster;
    if (roster.length === 0) return `${isRed ? 'Red' : 'Blue'} Batter`;
    return roster[idx % roster.length];
  };

  const switchTeams = () => {
    setBbState(prev => {
      const isRedNow = prev.currentTeam === 'red';
      return {
        ...prev,
        currentTeam: isRedNow ? 'blue' : 'red',
        inning: isRedNow ? prev.inning : prev.inning + 1,
        isBottom: isRedNow,
        outs: 0, strikes: 0, runners: [false, false, false],
        message: "Switch Sides!", messageColor: "text-yellow-400", showFireworks: false
      };
    });
  };

  const handleHit = () => {
    if (!pitchCard) return;
    setBbState(prev => {
      const isGrandSlamCondition = prev.runners[0] && prev.runners[1] && prev.runners[2];
      if (isGrandSlamCondition) {
        setTimeout(() => switchTeams(), 3000);
        return {
          ...prev,
          redScore: prev.currentTeam === 'red' ? prev.redScore + 4 : prev.redScore,
          blueScore: prev.currentTeam === 'blue' ? prev.blueScore + 4 : prev.blueScore,
          message: "GRAND SLAM!", messageColor: "text-purple-400", showFireworks: true,
          batterIndexRed: prev.currentTeam === 'red' ? prev.batterIndexRed + 1 : prev.batterIndexRed,
          batterIndexBlue: prev.currentTeam === 'blue' ? prev.batterIndexBlue + 1 : prev.batterIndexBlue,
        };
      }
      let runsToAdd = 0;
      const newRunners = [...prev.runners] as [boolean, boolean, boolean];
      if (newRunners[2]) { runsToAdd++; newRunners[2] = false; }
      if (newRunners[1]) { newRunners[2] = true; newRunners[1] = false; }
      if (newRunners[0]) { newRunners[1] = true; }
      newRunners[0] = true;
      return {
        ...prev,
        redScore: prev.currentTeam === 'red' ? prev.redScore + runsToAdd : prev.redScore,
        blueScore: prev.currentTeam === 'blue' ? prev.blueScore + runsToAdd : prev.blueScore,
        strikes: 0, runners: newRunners,
        message: runsToAdd > 0 ? "RBI Hit!" : "Nice Hit!", messageColor: "text-green-400",
        batterIndexRed: prev.currentTeam === 'red' ? prev.batterIndexRed + 1 : prev.batterIndexRed,
        batterIndexBlue: prev.currentTeam === 'blue' ? prev.batterIndexBlue + 1 : prev.batterIndexBlue,
        showFireworks: false
      };
    });
    nextPitch();
  };

  const handleStrike = () => {
    if (!pitchCard) return;
    setBbState(prev => {
      const newStrikes = prev.strikes + 1;
      if (newStrikes >= 3) {
        const newOuts = prev.outs + 1;
        const nextRedIdx = prev.currentTeam === 'red' ? prev.batterIndexRed + 1 : prev.batterIndexRed;
        const nextBlueIdx = prev.currentTeam === 'blue' ? prev.batterIndexBlue + 1 : prev.batterIndexBlue;
        if (newOuts >= 3) {
           setTimeout(() => switchTeams(), 1500);
           return { ...prev, outs: 3, strikes: 0, message: "3 Outs! Switch!", messageColor: "text-red-500", batterIndexRed: nextRedIdx, batterIndexBlue: nextBlueIdx };
        }
        return { ...prev, strikes: 0, outs: newOuts, message: "You're Out!", messageColor: "text-red-500", batterIndexRed: nextRedIdx, batterIndexBlue: nextBlueIdx };
      }
      return { ...prev, strikes: newStrikes, message: "Strike!", messageColor: "text-amber-500" };
    });
    if (bbState.strikes >= 2) nextPitch(); 
  };

  const renderCardVisual = (card: WordCard, isFaceUp: boolean = true, classNameOverride?: string) => {
    if (card.text === "OOPS!" && isFaceUp) {
      return (
        <div className={`relative bg-red-600 border-4 border-white rounded shadow-md flex flex-col items-center justify-center p-2 animate-in zoom-in ${classNameOverride || 'w-40 h-24'}`}>
           <AlertCircle className="text-white w-10 h-10 mb-1" />
           <span className="text-white font-black uppercase text-2xl tracking-widest">OOPS!</span>
           <div className="absolute inset-0 border-4 border-dashed border-red-800 opacity-50 rounded"></div>
        </div>
      );
    }
    if (!isFaceUp) {
      return (
        <div className={`bg-red-900 border-2 border-white rounded shadow-md flex items-center justify-center relative overflow-hidden ${classNameOverride || 'w-40 h-24'}`}>
           <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')]"></div>
           <div className="w-16 h-16 border-4 border-red-800 rounded-full opacity-50"></div>
        </div>
      );
    }
    const tiles = parseWordToTiles(card.text);
    const isSingleTile = tiles.length === 1;
    let cardBgClass = 'bg-white border-stone-300';
    let displayText = card.text;
    if (isSingleTile && card.type !== 'hfw') {
      displayText = tiles[0].text;
      cardBgClass = getTileColor(tiles[0].type);
    }
    const classes = classNameOverride || 'h-full min-h-[4rem] min-w-[6rem]';
    let fontSizeClass = 'text-4xl md:text-5xl';
    if (displayText.length > 12) fontSizeClass = 'text-2xl md:text-3xl';
    else if (displayText.length > 8) fontSizeClass = 'text-3xl md:text-4xl';
    return (
      <div className={`relative ${cardBgClass} border-2 shadow-sm rounded inline-flex items-center justify-center px-4 py-1 ${classes}`}>
        <span className={`${fontSizeClass} font-black font-sans tracking-tighter leading-none whitespace-nowrap ${card.type === 'hfw' ? 'text-red-600' : 'text-black'}`}>
          {displayText}
        </span>
      </div>
    );
  };

  if (cards.length === 0 && hfw.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#fdf6e3] text-stone-500">
        <Scroll className="w-16 h-16 mb-4 opacity-20" />
        <p className="font-serif italic">The scroll is blank. (No cards configured)</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#fdf6e3] font-sans relative select-none">
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500 max-w-[95vw] overflow-x-auto p-2 scrollbar-hide pointer-events-auto">
         <div className="flex bg-stone-900/95 backdrop-blur-md rounded-full border border-stone-700 p-2 shadow-2xl gap-2 flex-shrink-0">
           <div className="flex bg-stone-800 rounded-full border border-stone-600 p-1">
             <button onClick={() => setMode('duel')} className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full transition-all ${mode === 'duel' ? 'bg-red-900 text-white shadow-md transform scale-105' : 'text-stone-400 hover:text-white'}`}>
               <Users className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-wider hidden md:inline">Duel</span>
             </button>
             <button onClick={() => setMode('tabletop')} className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full transition-all ${mode === 'tabletop' ? 'bg-red-900 text-white shadow-md transform scale-105' : 'text-stone-400 hover:text-white'}`}>
               <LayoutGrid className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-wider hidden md:inline">Tatami</span>
             </button>
           </div>
           <div className="w-px h-8 bg-stone-700 mx-1 self-center opacity-50"></div>
           <div className="flex bg-stone-800 rounded-full border border-stone-600 p-1">
             <button onClick={() => setFilter('all')} className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${filter === 'all' ? 'bg-stone-100 text-stone-900 shadow-md' : 'text-stone-400 hover:text-white'}`} title="All Cards"><Layers className="w-4 h-4" /></button>
             <button onClick={() => setFilter('decodable')} className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${filter === 'decodable' ? 'bg-emerald-100 text-emerald-900 shadow-md' : 'text-stone-400 hover:text-white'}`} title="Regular/Nonsense Only"><Book className="w-4 h-4" /></button>
             <button onClick={() => setFilter('hfw')} className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${filter === 'hfw' ? 'bg-red-100 text-red-900 shadow-md' : 'text-stone-400 hover:text-white'}`} title="High Frequency Words Only"><Eye className="w-4 h-4" /></button>
           </div>
           <div className="w-px h-8 bg-stone-700 mx-1 self-center opacity-50"></div>
           <button onClick={shuffleCards} className="p-4 bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 rounded-full border border-stone-600 transition-colors" title="Reshuffle"><Shuffle className="w-6 h-6" /></button>
         </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeCards.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')] text-stone-400">
             <div className="p-8 border-2 border-dashed border-stone-300 rounded-2xl flex flex-col items-center">
                <Scroll className="w-12 h-12 mb-2 opacity-50" />
                <p className="font-serif italic text-lg">No cards match the "{filter}" filter.</p>
                <button onClick={() => setFilter('all')} className="mt-4 text-sm font-bold text-red-800 hover:underline uppercase tracking-widest">Reset Filter</button>
             </div>
           </div>
        ) : (
          <>
            {mode === 'duel' && (
              <div className="h-full w-full bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')] flex flex-col">
                {numPlayers === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8">
                    <h3 className="text-3xl font-serif font-bold text-stone-800 mb-8">Prepare for Duel</h3>
                    <div className="grid grid-cols-3 gap-6 mb-8">
                      {[1, 2, 3, 4, 5, 6].map(n => (
                        <button key={n} onClick={() => startDuel(n)} className="w-28 h-28 bg-stone-100 border-2 border-stone-300 hover:border-red-600 hover:bg-white rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm transition-all">
                          <User className="w-8 h-8 text-stone-400 group-hover:text-red-600" /><span className="font-bold text-3xl text-stone-700">{n}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col p-4 pb-28">
                    <div className="h-[20%] flex items-center justify-center relative">
                        <div onClick={dealRound} className="cursor-pointer group relative w-32 aspect-[2.5/3.5] bg-red-900 rounded-xl shadow-xl border-2 border-white flex flex-col items-center justify-center hover:-translate-y-1 transition-transform z-20">
                          <span className="text-red-100 font-serif font-bold text-lg leading-none">DEAL</span>
                          <span className="text-red-300 text-[10px] uppercase tracking-widest mt-1">{drawPile.length} Left</span>
                        </div>
                    </div>
                    <div className="flex-1 flex items-end justify-center w-full px-4 gap-4">
                      {playerHands.map((card, idx) => (
                        <div key={idx} className="flex-1 h-full flex flex-col justify-end min-w-0 max-w-md relative">
                          <div className="absolute bottom-0 left-2 right-2 top-10 bg-stone-900/5 rounded-t-xl border-x border-t border-stone-900/10 pointer-events-none"></div>
                          <div className="flex-1 flex items-center justify-center pb-16 px-1 z-10">
                              {card ? (
                                <div onClick={() => setFocusedCard(card)} className="shadow-md hover:shadow-2xl transition-transform hover:-translate-y-2 cursor-pointer origin-bottom">
                                  {renderCardVisual(card, true, "w-64 md:w-80 h-40 md:h-48 rounded-xl border-4 border-stone-200 bg-white")}
                                </div>
                              ) : (
                                <div className="w-64 md:w-80 h-40 md:h-48 border-4 border-dashed border-stone-300 rounded-xl flex items-center justify-center opacity-50">
                                  <span className="text-stone-400 text-sm font-bold uppercase tracking-widest">Wait</span>
                                </div>
                              )}
                          </div>
                          <div className="w-full bg-stone-900 text-white py-3 text-center rounded shadow-lg border-b-4 border-red-800 z-20">
                              <div className="text-xl font-black font-serif uppercase tracking-widest truncate px-2 text-[#fdf6e3]">
                                {students && students[idx] ? students[idx] : `Ninja ${idx + 1}`}
                              </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'tabletop' && (
              <div ref={containerRef} className="h-full w-full relative overflow-hidden bg-[#e6dcc3] shadow-inner" style={{ backgroundImage: 'radial-gradient(circle, #d6cbb3 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
                {tatamiGame !== 'standard' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <span className="text-8xl md:text-9xl font-black uppercase text-stone-900/5 font-serif -rotate-12 select-none">{tatamiGame}</span>
                  </div>
                )}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-0 pointer-events-none">
                   <div className="w-32 h-44 border-4 border-dashed border-stone-300 rounded-xl flex items-center justify-center bg-stone-100/50">
                      <span className="text-stone-300 font-bold uppercase text-xs">Deck</span>
                   </div>
                </div>
                {Array.from({ length: Math.max(numPlayers, 4) }).map((_, i, arr) => {
                   const count = arr.length;
                   const angleDeg = (i * (360 / count)) + 90; 
                   const isCurrent = oopsState.active && oopsState.currentPlayerIndex === i;
                   return (
                     <div key={i} className={`absolute flex flex-col items-center justify-center gap-4 w-64 h-48 pointer-events-none transition-all duration-500 ${isCurrent ? 'scale-110 z-10' : 'opacity-70'}`} style={{ left: '50%', top: '50%', transform: `translate(-50%, -50%) rotate(${angleDeg}deg) translateY(40vmin) rotate(-${angleDeg}deg)` }}>
                        <div className={`px-6 py-3 rounded-full text-3xl font-black font-serif shadow-xl whitespace-nowrap z-10 border-4 transition-colors ${isCurrent ? 'bg-red-800 text-white animate-pulse border-red-500' : 'bg-stone-900 text-stone-300 border-stone-700'}`}>
                           {students[i] || `Ninja ${i + 1}`}
                           {isCurrent && <span className="ml-2 text-yellow-300">★</span>}
                        </div>
                        <div className={`w-32 h-24 border-2 rounded-lg shadow-inner flex items-center justify-center transition-colors relative ${isCurrent ? 'border-red-400 bg-red-100/30' : 'border-stone-300 bg-stone-200/30'}`}>
                           {oopsState.active && (
                              <div className="text-center">
                                 <div className="text-[10px] uppercase font-bold text-stone-500">Bank</div>
                                 <div className="text-4xl font-black text-stone-800">{oopsState.playerScores[i] || 0}</div>
                              </div>
                           )}
                           {oopsState.winner === i && <div className="absolute -top-10 animate-bounce"><Trophy className="w-12 h-12 text-yellow-500 drop-shadow-lg" /></div>}
                        </div>
                     </div>
                   );
                })}

                {oopsState.active && oopsState.winner === null && (
                   <div className="absolute top-20 right-4 md:right-10 w-48 bg-white/90 backdrop-blur border-2 border-stone-800 rounded-lg shadow-xl p-4 z-40">
                      <div className="flex justify-between items-center mb-2 border-b pb-1">
                         <h4 className="text-xs font-bold uppercase text-stone-500">Current Turn</h4>
                         <span className="text-[10px] font-bold text-red-800 uppercase flex items-center gap-1"><Flag className="w-3 h-3"/> Goal: 10</span>
                      </div>
                      <div className="flex justify-between items-center mb-4">
                         <span className="font-bold text-stone-800">At Risk:</span>
                         <span className={`text-2xl font-black ${oopsState.isBust ? 'text-red-600' : 'text-green-600'}`}>{oopsState.turnScore}</span>
                      </div>
                      {oopsState.isBust ? (
                         <div className="text-center">
                            <div className="text-red-600 font-bold uppercase text-sm mb-2 animate-bounce">OOPS! BUSTED!</div>
                            <button onClick={handleOopsNextTurn} className="w-full bg-stone-800 text-white py-2 rounded font-bold uppercase text-xs hover:bg-stone-700">Next Player</button>
                         </div>
                      ) : (
                         <div className="space-y-2">
                            <button onClick={handleOopsDraw} className="w-full bg-green-600 text-white py-2 rounded font-bold uppercase text-xs hover:bg-green-500 shadow flex items-center justify-center gap-2"><ArrowDown className="w-4 h-4" /> Draw Card</button>
                            <button onClick={handleOopsBank} disabled={oopsState.turnScore === 0} className="w-full bg-amber-500 text-white py-2 rounded font-bold uppercase text-xs hover:bg-amber-400 shadow disabled:opacity-50 disabled:bg-stone-300 flex items-center justify-center gap-2"><Coins className="w-4 h-4" /> Bank Points</button>
                         </div>
                      )}
                   </div>
                )}

                {oopsState.winner !== null && (
                   <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in">
                      <div className="bg-white p-8 rounded-2xl shadow-2xl text-center border-8 border-yellow-400 max-w-md w-full relative overflow-hidden">
                         <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')]"></div>
                         <div className="relative z-10">
                            <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4 drop-shadow-md animate-bounce" />
                            <h2 className="text-4xl font-black uppercase tracking-widest text-stone-900 mb-2">Victory!</h2>
                            <p className="text-xl font-serif text-stone-600 mb-8">{students[oopsState.winner] || `Ninja ${oopsState.winner + 1}`} wins the match!</p>
                            <button onClick={() => initOopsGame()} className="w-full bg-red-800 hover:bg-red-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2"><RefreshCcw className="w-5 h-5" /> New Game</button>
                         </div>
                      </div>
                   </div>
                )}

                {activeCards.filter(c => cardStates[c.id]?.inDeck).length > 0 && (
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-44 cursor-pointer group z-20" onClick={() => { if (oopsState.active && !oopsState.isBust && oopsState.winner === null) handleOopsDraw(); else if (!oopsState.active) dealCommon(1); }} title="Click to deal card to center">
                      <div className="absolute top-0 left-0 w-full h-full bg-red-900 rounded-xl border-2 border-white shadow-xl transform rotate-3 group-hover:rotate-6 transition-transform"></div>
                      <div className="absolute top-0 left-0 w-full h-full bg-red-800 rounded-xl border-2 border-white shadow-lg transform -rotate-2 group-hover:-rotate-3 transition-transform"></div>
                      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')] bg-red-800 rounded-xl border-2 border-white shadow-2xl flex flex-col items-center justify-center gap-2">
                         <div className="w-20 h-20 rounded-full border-4 border-red-900/30"></div>
                         <span className="text-red-100 font-bold font-serif text-2xl">{activeCards.filter(c => cardStates[c.id]?.inDeck).length}</span>
                      </div>
                   </div>
                )}

                {showZones && (
                  <div className="absolute inset-0 flex pointer-events-none animate-in fade-in duration-500 z-0">
                     <div className="w-[45%] h-full bg-emerald-500/10 border-r-4 border-emerald-500/20 flex flex-col items-center justify-center p-8"><div className="border-4 border-dashed border-emerald-600/30 w-full h-full rounded-3xl flex items-center justify-center"><span className="text-6xl font-black text-emerald-800/10 uppercase -rotate-45">Real</span></div></div>
                     <div className="flex-1"></div>
                     <div className="w-[45%] h-full bg-red-500/10 border-l-4 border-red-500/20 flex flex-col items-center justify-center p-8"><div className="border-4 border-dashed border-red-600/30 w-full h-full rounded-3xl flex items-center justify-center"><span className="text-6xl font-black text-red-800/10 uppercase rotate-45">Nonsense</span></div></div>
                  </div>
                )}

                <div className="absolute top-0 left-0 right-0 p-2 z-50 flex items-center justify-between pointer-events-none">
                    <div className="pointer-events-auto relative">
                       <button onClick={() => setIsGameMenuOpen(!isGameMenuOpen)} className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl border-b-4 border-stone-700 hover:bg-stone-800 shadow-xl transition-all active:scale-95">
                          <Gamepad2 className="w-5 h-5 text-red-500" /><div className="flex flex-col items-start"><span className="text-[10px] uppercase text-stone-400 leading-none">Game Type</span><span className="font-bold uppercase leading-none">{TATAMI_GAMES.find(g => g.id === tatamiGame)?.label || tatamiGame}</span></div><ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isGameMenuOpen ? 'rotate-180' : ''}`} />
                       </button>
                       {isGameMenuOpen && (
                          <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 origin-top-left flex flex-col z-[100]">
                             <div className="px-4 py-2 bg-stone-50 border-b border-stone-100 text-xs font-bold text-stone-500 uppercase">Select Game Mode</div>
                             {TATAMI_GAMES.map(g => (
                               <button key={g.id} onClick={() => handleGameSelect(g.id)} className={`flex items-start gap-3 px-4 py-3 text-left transition-colors ${tatamiGame === g.id ? 'bg-stone-100' : 'hover:bg-stone-50'}`}><div className={`p-2 rounded-lg ${tatamiGame === g.id ? 'bg-red-900 text-white' : 'bg-stone-200 text-stone-500'}`}><g.icon className="w-4 h-4" /></div><div><div className={`font-bold text-sm ${tatamiGame === g.id ? 'text-stone-900' : 'text-stone-600'}`}>{g.label}</div><div className="text-xs text-stone-400 leading-tight">{g.desc}</div></div>{tatamiGame === g.id && <Check className="w-4 h-4 text-green-600 ml-auto self-center" />}</button>
                             ))}
                             <div className="h-px bg-stone-100 my-1"></div>
                             <button onClick={() => handleGameSelect('runner')} className="flex items-start gap-3 px-4 py-3 text-left hover:bg-emerald-50 transition-colors group"><div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200"><Trophy className="w-4 h-4" /></div><div><div className="font-bold text-sm text-emerald-900">Runner</div><div className="text-xs text-emerald-600 leading-tight">Baseball Mode</div></div><ArrowDown className="w-4 h-4 text-emerald-400 ml-auto self-center -rotate-90 group-hover:translate-x-1 transition-transform" /></button>
                          </div>
                       )}
                    </div>
                    {!oopsState.active && (
                      <div className="flex items-center gap-2 shrink-0 pointer-events-auto bg-stone-900/90 backdrop-blur text-white p-2 rounded-xl border-b-4 border-red-900 shadow-xl">
                        <button onClick={() => setDealFaceUp(!dealFaceUp)} className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold uppercase border ${dealFaceUp ? 'bg-white text-stone-900 border-white' : 'bg-red-900 text-white border-red-700'}`}>{dealFaceUp ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}{dealFaceUp ? "Face Up" : "Hidden"}</button>
                        <div className="w-px h-6 bg-stone-700 mx-1"></div>
                        <button onClick={() => dealToPlayers()} className="flex items-center gap-1 px-3 py-1 bg-stone-700 hover:bg-stone-600 rounded text-xs font-bold uppercase"><Hand className="w-3 h-3" /> Deal 1</button>
                        <button onClick={() => dealCommon(1)} className="flex items-center gap-1 px-3 py-1 bg-stone-700 hover:bg-stone-600 rounded text-xs font-bold uppercase"><ArrowDown className="w-3 h-3" /> Center</button>
                        <div className="w-px h-6 bg-stone-700 mx-1"></div>
                        <div className="flex gap-1">
                            <button onClick={() => arrangeGrid(true)} className="p-2 hover:bg-stone-700 rounded text-stone-400 hover:text-white flex items-center gap-1" title="Grid Layout (Face Up)"><Grid3X3 className="w-4 h-4" /></button>
                            <button onClick={() => arrangeGrid(false)} className="p-2 hover:bg-stone-700 rounded text-stone-400 hover:text-white flex items-center gap-1" title="Grid Layout (Face Down / Memory)"><Grid3X3 className="w-4 h-4" /></button>
                            <button onClick={() => setShowZones(!showZones)} className={`p-2 rounded flex items-center gap-1 ${showZones ? 'bg-stone-600 text-white' : 'hover:bg-stone-700 text-stone-400 hover:text-white'}`} title="Toggle Sorting Zones"><SplitSquareHorizontal className="w-4 h-4" /></button>
                        </div>
                        <div className="w-px h-6 bg-stone-700 mx-1"></div>
                        <button onClick={() => flipAllBoard(true)} className="p-2 hover:bg-stone-700 rounded text-stone-400 hover:text-white" title="Reveal All"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => flipAllBoard(false)} className="p-2 hover:bg-stone-700 rounded text-stone-400 hover:text-white" title="Hide All"><EyeOff className="w-4 h-4" /></button>
                        <button onClick={gatherAll} className="p-2 hover:bg-red-900 rounded text-stone-400 hover:text-white" title="Gather All"><RefreshCcw className="w-4 h-4" /></button>
                      </div>
                    )}
                </div>
                {activeCards.map(card => {
                  const state = cardStates[card.id];
                  if (!state || state.inDeck) return null;
                  const wrapperStyle = tatamiGame === 'oops' ? { width: '160px', height: '100px', zIndex: state.zIndex } : { zIndex: state.zIndex };
                  return (
                    <Draggable key={card.id} initialPos={{ x: state.x, y: state.y }} onDragEnd={(pos) => handleDragEnd(card.id, pos)} className="cursor-grab active:cursor-grabbing" style={wrapperStyle}>
                      <div onMouseDown={() => bringToFront(card.id)} onDoubleClick={() => toggleFlip(card.id)} className={`shadow-lg hover:shadow-2xl hover:scale-105 transition-transform ${tatamiGame === 'oops' ? 'w-full h-full' : ''}`}>
                          {renderCardVisual(card, state.faceUp, tatamiGame === 'oops' ? 'w-full h-full' : undefined)}
                      </div>
                    </Draggable>
                  );
                })}
              </div>
            )}

            {mode === 'baseball' && (
              <div className="h-full w-full bg-emerald-800 relative flex flex-col overflow-hidden">
                 {bbState.showFireworks && (
                   <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden flex items-center justify-center">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                          <h1 className={`text-9xl font-black uppercase italic tracking-tighter animate-bounce ${bbState.currentTeam === 'red' ? 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]' : 'text-blue-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]'}`}>GRAND SLAM!</h1>
                      </div>
                      {bbState.currentTeam === 'red' ? (
                        <><div className="absolute animate-ping w-32 h-32 bg-red-500 rounded-full opacity-75 top-1/4 left-1/4"></div><div className="absolute animate-ping w-24 h-24 bg-orange-500 rounded-full opacity-75 top-1/3 right-1/4 delay-100"></div><div className="absolute animate-ping w-48 h-48 bg-red-600 rounded-full opacity-75 bottom-1/3 left-1/2 delay-200"></div><div className="absolute animate-ping w-16 h-16 bg-amber-500 rounded-full opacity-75 top-1/2 right-1/3 delay-300"></div></>
                      ) : (
                        <><div className="absolute animate-ping w-32 h-32 bg-blue-500 rounded-full opacity-75 top-1/4 left-1/4"></div><div className="absolute animate-ping w-24 h-24 bg-cyan-400 rounded-full opacity-75 top-1/3 right-1/4 delay-100"></div><div className="absolute animate-ping w-48 h-48 bg-blue-600 rounded-full opacity-75 bottom-1/3 left-1/2 delay-200"></div><div className="absolute animate-ping w-16 h-16 bg-indigo-400 rounded-full opacity-75 top-1/2 right-1/3 delay-300"></div></>
                      )}
                   </div>
                 )}
                 <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/black-felt.png")' }}></div>
                 <div className="absolute top-4 left-4 right-4 h-24 bg-stone-900 border-4 border-stone-400 rounded-lg shadow-2xl flex items-center justify-between px-6 z-10">
                    <div className="flex flex-col flex-1"><div className="flex items-center gap-2"><h2 className="text-yellow-400 font-mono text-xs uppercase tracking-widest">Base Runner</h2><span className="text-[10px] text-stone-500 font-mono">INNING {bbState.inning} {bbState.isBottom ? '▼' : '▲'}</span></div><div className={`text-2xl font-black uppercase font-serif tracking-widest ${bbState.messageColor} animate-pulse`}>{bbState.message}</div></div>
                    <div className="flex items-center gap-6 font-mono text-yellow-400">
                       <div className={`text-center px-4 py-1 rounded transition-colors ${bbState.currentTeam === 'red' ? 'bg-red-900/50 ring-2 ring-red-600' : ''}`}><div className="text-[10px] uppercase text-stone-500">HOME (RED)</div><div className="text-4xl">{bbState.redScore}</div></div>
                       <div className={`text-center px-4 py-1 rounded transition-colors ${bbState.currentTeam === 'blue' ? 'bg-blue-900/50 ring-2 ring-blue-600' : ''}`}><div className="text-[10px] uppercase text-stone-500">GUEST (BLUE)</div><div className="text-4xl">{bbState.blueScore}</div></div>
                       <div className="w-px h-12 bg-stone-700 mx-2"></div>
                       <div className="flex flex-col gap-1 justify-center">
                          <div className="flex items-center gap-2"><span className="text-[10px] w-6 text-stone-500">STRIKE</span><div className={`w-3 h-3 rounded-full ${bbState.strikes >= 1 ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-stone-700'}`}></div><div className={`w-3 h-3 rounded-full ${bbState.strikes >= 2 ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-stone-700'}`}></div></div>
                          <div className="flex items-center gap-2"><span className="text-[10px] w-6 text-stone-500">OUT</span><div className={`w-3 h-3 rounded-full ${bbState.outs >= 1 ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-stone-700'}`}></div><div className={`w-3 h-3 rounded-full ${bbState.outs >= 2 ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-stone-700'}`}></div></div>
                       </div>
                    </div>
                 </div>
                 <div className="flex-1 relative flex items-center justify-center mt-12">
                    <div className="relative w-[500px] h-[500px] transform rotate-45 mt-20">
                       <div className="absolute inset-0 bg-stone-300/20 border-[40px] border-amber-800/40 rounded-lg"></div>
                       <div className={`absolute top-0 right-0 w-16 h-16 bg-white transform translate-x-1/2 -translate-y-1/2 shadow-xl border-4 border-stone-300 z-10 flex items-center justify-center ${bbState.runners[0] ? 'ring-4 ring-yellow-400' : ''}`}><span className="-rotate-45 font-bold text-stone-400 text-xs">1st</span>{bbState.runners[0] && <div className={`absolute w-12 h-12 rounded-full shadow-lg border-2 border-white ${bbState.currentTeam === 'red' ? 'bg-red-600' : 'bg-blue-600'} z-20`}></div>}</div>
                       <div className={`absolute top-0 left-0 w-16 h-16 bg-white transform -translate-x-1/2 -translate-y-1/2 shadow-xl border-4 border-stone-300 z-10 flex items-center justify-center ${bbState.runners[1] ? 'ring-4 ring-yellow-400' : ''}`}><span className="-rotate-45 font-bold text-stone-400 text-xs">2nd</span>{bbState.runners[1] && <div className={`absolute w-12 h-12 rounded-full shadow-lg border-2 border-white ${bbState.currentTeam === 'red' ? 'bg-red-600' : 'bg-blue-600'} z-20`}></div>}</div>
                       <div className={`absolute bottom-0 left-0 w-16 h-16 bg-white transform -translate-x-1/2 translate-y-1/2 shadow-xl border-4 border-stone-300 z-10 flex items-center justify-center ${bbState.runners[2] ? 'ring-4 ring-yellow-400' : ''}`}><span className="-rotate-45 font-bold text-stone-400 text-xs">3rd</span>{bbState.runners[2] && <div className={`absolute w-12 h-12 rounded-full shadow-lg border-2 border-white ${bbState.currentTeam === 'red' ? 'bg-red-600' : 'bg-blue-600'} z-20`}></div>}</div>
                       <div className="absolute bottom-0 right-0 w-16 h-16 bg-white transform translate-x-1/2 translate-y-1/2 shadow-xl border-4 border-stone-300 z-10 clip-path-home-plate flex items-center justify-center"><span className="-rotate-45 font-bold text-stone-400 text-xs">Home</span>{!bbState.gameOver && pitchCard && (<div className="absolute w-10 h-10 bg-red-600 rounded-full shadow-lg border-2 border-white animate-bounce z-20"></div>)}</div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                       {bbState.gameOver ? (
                         <div className="bg-stone-900 text-white p-8 rounded-xl shadow-2xl border-4 border-red-500 text-center animate-in zoom-in"><h2 className="text-4xl font-black uppercase tracking-widest text-red-500 mb-4">Game Over</h2><div className="text-2xl font-serif">Final Score<br/><span className="text-red-400">{bbState.redScore}</span> - <span className="text-blue-400">{bbState.blueScore}</span></div><button onClick={() => { resetBaseball(); nextPitch(); }} className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 rounded text-white font-bold uppercase tracking-widest">New Game</button></div>
                       ) : ( pitchCard ? ( <div className="transform transition-all duration-300 hover:scale-110">{renderCardVisual(pitchCard, true)}</div> ) : ( <button onClick={() => nextPitch()} className="px-6 py-3 bg-stone-800 text-white font-bold uppercase tracking-widest rounded-lg shadow-xl hover:bg-stone-700">Pitch Ball</button> ) )}
                    </div>
                 </div>
                 {!bbState.gameOver && !bbState.showFireworks && (
                   <div className="absolute bottom-20 left-0 right-0 flex items-end justify-center gap-12 z-30 px-4">
                      <button onClick={handleStrike} className="w-24 h-24 rounded-full bg-red-600 hover:bg-red-500 border-4 border-red-800 shadow-2xl flex flex-col items-center justify-center group active:scale-95 transition-transform"><X className="w-8 h-8 text-white group-hover:scale-125 transition-transform" /><span className="text-white font-black uppercase tracking-widest mt-1 text-[10px] shadow-black drop-shadow-md">Strike</span></button>
                      <div className="mb-4 flex flex-col items-center animate-in slide-in-from-bottom-4"><div className={`text-xs font-bold uppercase mb-1 shadow-black drop-shadow-md px-3 py-1 rounded-full border border-stone-600 ${bbState.currentTeam === 'red' ? 'bg-red-800 text-red-100' : 'bg-blue-800 text-blue-100'}`}>{bbState.currentTeam} Team Batting</div><div className={`bg-white border-4 border-stone-900 px-6 py-3 rounded-xl font-black uppercase text-2xl shadow-xl transform -skew-x-6 min-w-[240px] text-center text-stone-900 relative overflow-hidden`}><div className={`absolute left-0 top-0 bottom-0 w-4 ${bbState.currentTeam === 'red' ? 'bg-red-600' : 'bg-blue-600'}`}></div>{getCurrentBatterName()}</div></div>
                      <button onClick={handleHit} className="w-24 h-24 rounded-full bg-emerald-600 hover:bg-emerald-500 border-4 border-emerald-800 shadow-2xl flex flex-col items-center justify-center group active:scale-95 transition-transform"><Trophy className="w-8 h-8 text-white group-hover:scale-125 transition-transform" /><span className="text-white font-black uppercase tracking-widest mt-1 text-[10px] shadow-black drop-shadow-md">Hit</span></button>
                   </div>
                 )}
              </div>
            )}

            {focusedCard && (
                  <div className="absolute inset-0 z-50 bg-stone-900/95 backdrop-blur-md flex items-center justify-center p-8">
                    <div className="relative w-full max-w-7xl bg-[#fdf6e3] rounded-lg shadow-2xl p-8 flex flex-col items-center border-4 border-stone-800 min-h-[50vh] justify-center">
                      <button onClick={() => setFocusedCard(null)} className="absolute top-4 right-4 p-4 hover:bg-stone-200 rounded-full text-stone-500"><X className="w-10 h-10" /></button>
                      <div className="flex-1 flex items-center justify-center">{renderCardVisual(focusedCard, true, "w-[30rem] md:w-[40rem] aspect-[1.6] rounded-xl shadow-2xl bg-white border-4 border-stone-200")}</div>
                      <div className="mt-12 flex gap-4">
                        {onAddToInventory && ( <button onClick={handleSaveToInventory} className={`px-10 py-6 rounded-lg font-bold text-xl uppercase tracking-widest shadow-xl transform transition-transform hover:scale-105 flex items-center gap-3 ${saveFeedback ? 'bg-amber-100 text-amber-800' : 'bg-amber-600 text-white hover:bg-amber-500'} `}>{saveFeedback ? (<>Saved <Save className="w-6 h-6" /></>) : (<>Save to Squad <Save className="w-6 h-6" /></>)}</button> )}
                        <button onClick={() => { const idx = playerHands.findIndex(c => c?.id === focusedCard.id); if (idx >= 0) clearCard(idx); }} className="bg-red-800 text-white px-10 py-6 rounded-lg font-bold text-xl uppercase tracking-widest hover:bg-red-900 shadow-xl transform transition-transform hover:scale-105 flex items-center gap-3"><Sword className="w-6 h-6" /> Clear Card</button>
                      </div>
                    </div>
                  </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WordCards;