
import React, { useState, useEffect } from 'react';
import { WordCard } from '../../types';
import { Users, ArrowRight, ArrowLeft, RefreshCw, Scroll, User } from 'lucide-react';

interface WordlistReadingProps {
  cards: WordCard[];
  students?: string[];
}

const WordlistReading: React.FC<WordlistReadingProps> = ({ cards, students = [] }) => {
  // State
  const [numPlayers, setNumPlayers] = useState<number>(students.length > 0 ? students.length : 0);
  const [distribution, setDistribution] = useState<WordCard[][]>([]); // Array of arrays (one list per student)
  const [page, setPage] = useState(0);
  
  // Constants
  const WORDS_PER_PAGE = 5;
  const TARGET_TOTAL_WORDS = 15; // 3 pages of 5

  // Initialize or Reset Distribution
  const initializeDistribution = (count: number) => {
    if (cards.length === 0) return;

    const newDistribution: WordCard[][] = [];
    
    // We need enough words for (count * TARGET_TOTAL_WORDS)
    // We create a massive pool by repeating the source cards if necessary
    let pool = [...cards];
    while (pool.length < count * TARGET_TOTAL_WORDS) {
      pool = [...pool, ...cards];
    }
    
    // Shuffle the pool
    pool.sort(() => Math.random() - 0.5);

    // Distribute to students
    for (let i = 0; i < count; i++) {
      // Give each student a slice of the pool
      // If we run out (unlikely with the while loop above), we wrap around
      const studentList: WordCard[] = [];
      for (let j = 0; j < TARGET_TOTAL_WORDS; j++) {
         // Pick from pool or random pick from source if pool exhausted
         const card = pool.pop() || cards[Math.floor(Math.random() * cards.length)];
         studentList.push(card);
      }
      newDistribution.push(studentList);
    }

    setDistribution(newDistribution);
    setPage(0);
  };

  // Initial Setup if students exist
  useEffect(() => {
    if (students.length > 0) {
      initializeDistribution(students.length);
    }
  }, [students, cards]);

  const handleStart = (n: number) => {
    setNumPlayers(n);
    initializeDistribution(n);
  };

  const nextPage = () => {
    // Check if we have more words defined
    const maxPages = Math.ceil(TARGET_TOTAL_WORDS / WORDS_PER_PAGE);
    if (page < maxPages - 1) {
      setPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (page > 0) {
      setPage(prev => prev - 1);
    }
  };

  // Dynamic Font Sizing based on column count
  const getFontSize = () => {
    if (numPlayers <= 2) return 'text-4xl md:text-5xl';
    if (numPlayers <= 4) return 'text-2xl md:text-3xl';
    return 'text-xl';
  };

  if (cards.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-stone-400 italic">
        <Scroll className="w-16 h-16 mb-4 opacity-20" />
        No words in this lesson to read.
      </div>
    );
  }

  // --- SETUP VIEW ---
  if (numPlayers === 0) {
    return (
      <div className="h-full flex flex-col bg-[#fdf6e3] font-sans items-center justify-center p-8">
         <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-stone-800 mb-2">Wordlist Reading</h2>
            <p className="text-stone-500 uppercase tracking-widest text-sm">How many ninjas are reading today?</p>
         </div>
         
         <div className="grid grid-cols-3 gap-6 mb-8">
           {[1, 2, 3, 4, 5, 6].map(n => (
             <button 
               key={n}
               onClick={() => handleStart(n)}
               className="w-24 h-24 bg-stone-100 border-2 border-stone-300 hover:border-red-600 hover:bg-white rounded-xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm hover:shadow-lg group"
             >
               <User className="w-8 h-8 text-stone-400 group-hover:text-red-600" />
               <span className="font-bold text-2xl text-stone-700 group-hover:text-red-800">{n}</span>
             </button>
           ))}
         </div>
      </div>
    );
  }

  // --- MAIN VIEW ---
  return (
    <div className="h-full flex flex-col bg-[#fdf6e3] font-sans">
      
      {/* Header / Controls */}
      <div className="h-20 bg-stone-900 border-b-4 border-red-900 flex items-center justify-between px-8 shadow-md z-10 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-[#fdf6e3] font-serif uppercase tracking-wider hidden md:block">
            Wordlist Reading
          </h2>
          {/* Pagination Indicators */}
          <div className="flex gap-1">
             {[0, 1, 2].map(i => (
               <div key={i} className={`h-2 w-8 rounded-full transition-colors ${page === i ? 'bg-red-500' : 'bg-stone-700'}`} />
             ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
           {(!students || students.length === 0) && (
             <button onClick={() => setNumPlayers(0)} className="text-xs text-stone-500 hover:text-stone-300 uppercase font-bold mr-4">
               Reset Party
             </button>
           )}
           
           <div className="flex bg-stone-800 p-1 rounded-lg border border-stone-600">
             <button 
               onClick={prevPage} 
               disabled={page === 0}
               className="p-3 text-stone-400 hover:text-white disabled:opacity-20 transition-colors"
             >
               <ArrowLeft className="w-6 h-6" />
             </button>
             <div className="w-px h-8 bg-stone-700 mx-1 self-center"></div>
             <button 
               onClick={nextPage}
               disabled={page >= 2} // Limit to 3 sets (15 words)
               className="p-3 text-white hover:text-red-400 disabled:opacity-20 transition-colors"
             >
               <ArrowRight className="w-6 h-6" />
             </button>
           </div>
           
           <button 
             onClick={() => initializeDistribution(numPlayers)} 
             className="p-3 bg-stone-800 text-stone-400 hover:text-white rounded-lg border border-stone-600"
             title="Reshuffle Words"
           >
             <RefreshCw className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Columns Container */}
      <div className="flex-1 overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')]">
        <div className="h-full w-full flex divide-x-2 divide-stone-300/50">
          
          {distribution.map((studentList, sIdx) => {
            // Slice the 5 words for this page
            const start = page * WORDS_PER_PAGE;
            const currentWords = studentList.slice(start, start + WORDS_PER_PAGE);
            const studentName = (students && students[sIdx]) ? students[sIdx] : `Ninja ${sIdx + 1}`;

            return (
              <div key={sIdx} className="flex-1 flex flex-col min-w-0">
                
                {/* Column Header */}
                <div className="py-4 bg-stone-100/80 border-b border-stone-200 text-center shadow-sm">
                  <span className="font-black font-serif text-stone-900 uppercase tracking-widest text-sm md:text-base px-2 truncate block">
                    {studentName}
                  </span>
                </div>

                {/* Word List */}
                <div className="flex-1 flex flex-col justify-evenly p-4 items-center">
                  {currentWords.map((card, wIdx) => (
                    <div 
                      key={`${sIdx}-${page}-${wIdx}`} 
                      className={`
                        w-full text-center py-2 border-b border-stone-200 last:border-0
                        animate-in fade-in slide-in-from-bottom-2 duration-500
                      `}
                      style={{ animationDelay: `${wIdx * 100}ms` }}
                    >
                      <span className={`font-bold font-serif text-stone-800 ${getFontSize()} leading-tight block break-words`}>
                        {card.text}
                      </span>
                    </div>
                  ))}
                  
                  {/* Fill empty spots if list ends early */}
                  {currentWords.length < WORDS_PER_PAGE && Array.from({ length: WORDS_PER_PAGE - currentWords.length }).map((_, i) => (
                     <div key={`empty-${i}`} className="flex-1" />
                  ))}
                </div>
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
};

export default WordlistReading;
