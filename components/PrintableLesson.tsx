
import React from 'react';
import { createPortal } from 'react-dom';
import { Lesson, GroupProfile } from '../types';
import { Scroll, X, Printer as PrinterIcon } from 'lucide-react';

interface PrintableLessonProps {
  lesson: Lesson;
  group?: GroupProfile;
  onClose: () => void;
}

const PrintableLesson: React.FC<PrintableLessonProps> = ({ lesson, group, onClose }) => {
  
  return createPortal(
    <div className="printable-lesson-overlay fixed inset-0 z-[9999] bg-stone-900/90 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:block">
      
      {/* SCREEN-ONLY CONTROLS */}
      <div className="absolute top-4 right-4 flex gap-4 print:hidden">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-white text-stone-900 px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-stone-100 transition-colors"
        >
          <PrinterIcon className="w-5 h-5" /> Print Now
        </button>
        <button 
          onClick={onClose}
          className="bg-stone-800 text-stone-400 p-3 rounded-full hover:text-white hover:bg-red-900 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* THE SCROLL (PAPER VIEW) */}
      <div className="bg-white text-black w-full max-w-[8.5in] min-h-[11in] shadow-2xl overflow-y-auto max-h-full p-8 md:p-12 print:max-h-none print:shadow-none print:w-full print:max-w-none print:p-0 print:overflow-visible rounded-sm mx-auto">
        
        {/* PRINT CSS: Force hide everything else */}
        <style>{`
          @media print {
            body > *:not(.printable-lesson-overlay) { display: none !important; }
            .printable-lesson-overlay { 
              display: block !important; 
              position: absolute !important; 
              top: 0 !important; 
              left: 0 !important; 
              width: 100% !important; 
              height: auto !important;
              background: white !important;
              z-index: 99999 !important;
            }
            @page { margin: 0.5in; size: portrait; }
            /* Hide scrollbars */
            ::-webkit-scrollbar { display: none; }
          }
        `}</style>

        <div className="space-y-6 font-serif">
          
          {/* HEADER */}
          <header className="border-b-4 border-black pb-4 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-widest flex items-center gap-2">
                <Scroll className="w-8 h-8" /> Lesson Plan
              </h1>
              <div className="text-sm font-bold uppercase tracking-wide mt-1 text-stone-600">
                WRS Lesson Pathway
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">Step {lesson.step}.{lesson.substep}</div>
              <div className="text-sm font-medium">{group?.name || '______________________'}</div>
              <div className="text-xs text-stone-500 mt-1">Date: ________________</div>
            </div>
          </header>

          {/* TWO COLUMN LAYOUT FOR EARLY PARTS */}
          <div className="grid grid-cols-2 gap-8">
            
            {/* LEFT COL */}
            <div className="space-y-6">
              {/* Part 1 */}
              <section className="break-inside-avoid">
                <h3 className="font-bold border-b-2 border-stone-300 mb-2 uppercase text-sm">1. Quick Drill (Sounds)</h3>
                <p className="text-sm leading-relaxed font-sans">
                  {lesson.quickDrill.join(', ') || '(Using standard deck)'}
                </p>
              </section>

              {/* Part 2 */}
              <section className="break-inside-avoid">
                <h3 className="font-bold border-b-2 border-stone-300 mb-2 uppercase text-sm">2. Teach Concepts</h3>
                <div className="min-h-[4rem] text-sm text-stone-800 italic bg-stone-50 p-2 border border-stone-200 print:bg-transparent print:border-none print:p-0 font-sans whitespace-pre-wrap">
                  {lesson.conceptNotes || 'No notes.'}
                </div>
                <div className="mt-4 border-b border-stone-200 h-8"></div>
              </section>

              {/* Part 3 */}
              <section className="break-inside-avoid">
                <h3 className="font-bold border-b-2 border-stone-300 mb-2 uppercase text-sm">3. Word Cards</h3>
                <div className="text-xs font-bold uppercase text-stone-500 mb-1">Real Words</div>
                <p className="text-sm mb-2 font-sans">
                  {lesson.wordCards.filter(c => c.type === 'regular').map(c => c.text).join(', ')}
                </p>
                <div className="text-xs font-bold uppercase text-stone-500 mb-1">Nonsense</div>
                <p className="text-sm font-sans">
                  {lesson.wordCards.filter(c => c.type === 'nonsense').map(c => c.text).join(', ')}
                </p>
              </section>
            </div>

            {/* RIGHT COL */}
            <div className="space-y-6">
               {/* Part 4 & 5 */}
               <section className="break-inside-avoid">
                <h3 className="font-bold border-b-2 border-stone-300 mb-2 uppercase text-sm">4 & 5. Reading</h3>
                <div className="text-xs text-stone-500 mb-1">Check for fluency and prosody.</div>
                <ul className="list-disc pl-4 text-sm font-sans space-y-1">
                  {lesson.sentences.slice(0, 4).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                  {lesson.sentences.length > 4 && <li className="list-none italic text-xs">...and {lesson.sentences.length - 4} more</li>}
                </ul>
              </section>

              {/* Part 6 */}
              <section className="break-inside-avoid">
                <h3 className="font-bold border-b-2 border-stone-300 mb-2 uppercase text-sm">6. Reverse Drill</h3>
                <p className="text-sm font-sans">
                  {lesson.quickDrillReverse?.join(', ') || '(Same as Part 1)'}
                </p>
              </section>

              {/* Part 7 */}
              <section className="break-inside-avoid">
                <h3 className="font-bold border-b-2 border-stone-300 mb-2 uppercase text-sm">7. Spelling Concept</h3>
                <div className="text-sm italic mb-2 whitespace-pre-wrap font-sans">{lesson.conceptNotes7}</div>
                {lesson.cipherWords && lesson.cipherWords.length > 0 && (
                  <div className="text-xs font-mono bg-stone-100 p-2 print:bg-transparent">
                    Words: {lesson.cipherWords.join(', ')}
                  </div>
                )}
              </section>
            </div>
          </div>

          {/* PART 8: DICTATION (FULL WIDTH SCORECARD) */}
          <section className="break-inside-avoid mt-6 border-t-4 border-black pt-4">
            <h3 className="font-bold text-lg mb-4 uppercase flex justify-between">
              <span>8. Dictation</span>
              <span className="text-xs font-normal normal-case text-stone-500 print:hidden">Use this grid to mark errors</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              
              {/* Sounds */}
              <div className="border border-stone-400 p-2">
                <strong className="block text-xs uppercase mb-1 border-b border-stone-200">1. Sounds</strong>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {lesson.dictation.sounds.map((s, i) => (
                    <div key={i} className="flex flex-col items-center">
                       <span className="font-bold font-sans">{s}</span>
                       <div className="w-4 h-4 border border-stone-400 mt-1"></div>
                    </div>
                  ))}
                  {/* Fill empty */}
                  {Array.from({length: Math.max(0, 5 - lesson.dictation.sounds.length)}).map((_, i) => (
                     <div key={`e-${i}`} className="h-8 bg-stone-100 print:border print:border-stone-200"></div>
                  ))}
                </div>
              </div>

              {/* Real Words */}
              <div className="border border-stone-400 p-2">
                <strong className="block text-xs uppercase mb-1 border-b border-stone-200">2. Real Words</strong>
                <div className="space-y-2 mt-2">
                  {lesson.dictation.realWords.map((w, i) => (
                     <div key={i} className="flex justify-between items-end border-b border-stone-200 border-dotted">
                        <span className="font-sans">{w}</span>
                        <div className="w-4 h-4 border border-stone-400"></div>
                     </div>
                  ))}
                </div>
              </div>

               {/* Elements / Nonsense */}
               <div className="border border-stone-400 p-2">
                <strong className="block text-xs uppercase mb-1 border-b border-stone-200">3 & 4. Elements & Nonsense</strong>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      {lesson.dictation.wordElements.map((w, i) => (
                        <div key={i} className="flex justify-between border-b border-stone-200 border-dotted text-xs py-1">
                            <span>{w}</span><div className="w-3 h-3 border border-stone-400"></div>
                        </div>
                      ))}
                   </div>
                   <div>
                      {lesson.dictation.nonsenseWords.map((w, i) => (
                        <div key={i} className="flex justify-between border-b border-stone-200 border-dotted text-xs py-1">
                            <span>{w}</span><div className="w-3 h-3 border border-stone-400"></div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              {/* Phrases / Sentences */}
              <div className="border border-stone-400 p-2">
                <strong className="block text-xs uppercase mb-1 border-b border-stone-200">5 & 6. Phrases & Sentences</strong>
                <div className="space-y-2 mt-1">
                   {lesson.dictation.phrases.map((p, i) => (
                      <div key={i} className="text-xs truncate">{p}</div>
                   ))}
                   {lesson.dictation.sentences.map((s, i) => (
                      <div key={i} className="text-xs truncate border-b border-stone-100">{s}</div>
                   ))}
                </div>
              </div>

            </div>
          </section>

          {/* NOTES AREA */}
          <section className="break-inside-avoid mt-8 border-t-2 border-stone-300 pt-4">
            <h3 className="font-bold uppercase text-sm mb-8">Observations / Next Steps</h3>
            <div className="space-y-8">
               <div className="border-b border-stone-400 h-1"></div>
               <div className="border-b border-stone-400 h-1"></div>
               <div className="border-b border-stone-400 h-1"></div>
            </div>
          </section>

        </div>
      </div>
    </div>,
    document.body
  );
};

export default PrintableLesson;
