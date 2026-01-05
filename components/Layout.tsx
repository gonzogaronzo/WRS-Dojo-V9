import React from 'react';
import { Lesson, LESSON_PARTS, LessonPart } from '../types';
import { 
  Grid, BookOpen, Layers, List, AlignLeft, RotateCcw, PenTool, Edit3, FileText, Headphones, 
  Menu, X, Home, Scroll, Map, Download, Edit
} from 'lucide-react';
import Timer from './interactive/Timer';

interface LayoutProps {
  lesson: Lesson;
  currentPart: LessonPart;
  onChangePart: (part: LessonPart) => void;
  onExit: () => void;
  onDashboard?: () => void; // New prop for going back to the Dojo
  onExport?: () => void;
  children: React.ReactNode;
}

const IconMap: Record<string, React.FC<any>> = {
  Grid, BookOpen, Layers, List, AlignLeft, RotateCcw, PenTool, Edit3, FileText, Headphones, Map
};

const Layout: React.FC<LayoutProps> = ({ lesson, currentPart, onChangePart, onExit, onDashboard, onExport, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-[#fdf6e3] overflow-hidden font-sans">
      
      {/* Mobile Header */}
      <div className="md:hidden h-16 bg-stone-900 border-b border-stone-800 flex items-center justify-between px-4 z-20 text-[#fdf6e3]">
        <span className="font-bold font-serif tracking-wide truncate pr-4">{lesson.title || 'Mission'}</span>
        <div className="flex items-center gap-1">
          {onExport && (
            <button 
              onClick={onExport} 
              className="p-2 text-stone-400 hover:text-[#fdf6e3] transition-colors"
              title="Save Progress"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar (The Scroll) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-stone-900 text-stone-400 transform transition-transform duration-300 ease-out shadow-2xl
        md:relative md:translate-x-0 flex flex-col border-r-4 border-stone-950
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="h-20 flex items-center px-6 border-b border-stone-800 bg-stone-950 relative overflow-hidden">
          {/* Decorative Circle */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-900 rounded-full opacity-20"></div>
          
          <div>
            <h1 className="font-bold text-[#fdf6e3] text-xl tracking-widest uppercase font-serif">Dyslexia Dojo</h1>
            <p className="text-xs text-stone-500 uppercase tracking-widest">WRS Dojo</p>
          </div>
        </div>

        {/* Lesson Info */}
        <div className="p-6 border-b border-stone-800 bg-stone-900/50">
           <div className="flex items-center gap-3 mb-2">
             <Scroll className="w-5 h-5 text-red-700" />
             <h2 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Current Mission</h2>
           </div>
           <p className="text-[#fdf6e3] font-serif font-bold text-lg truncate leading-tight">{lesson.title}</p>
           <p className="text-stone-500 text-xs mt-1">Step {lesson.step}.{lesson.substep}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent">
          {LESSON_PARTS.map((part) => {
            const Icon = IconMap[part.icon];
            const isActive = currentPart === part.id;
            return (
              <button
                key={part.id}
                onClick={() => {
                  onChangePart(part.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-6 py-4 text-sm font-bold transition-all duration-200 group relative
                  ${isActive 
                    ? 'bg-red-900/20 text-[#fdf6e3]' 
                    : 'hover:bg-stone-800 hover:text-[#fdf6e3]'
                  }`}
              >
                {/* Active Indicator Bar */}
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-700 shadow-[0_0_10px_rgba(185,28,28,0.5)]"></div>}
                
                <Icon className={`w-5 h-5 ${isActive ? 'text-red-500' : 'text-stone-600 group-hover:text-stone-400'}`} />
                <span className="uppercase tracking-wider font-serif">
                   {/* Handle generic titles or the Part 0 title which doesn't split nicely */}
                   {part.id === LessonPart.Briefing ? "Briefing" : part.title.split('. ')[1]}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Docked Timer */}
        <Timer variant="docked" />

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950 space-y-2">
          {onExport && (
            <button 
              onClick={onExport}
              className="flex items-center gap-3 text-stone-500 hover:text-[#fdf6e3] transition-colors text-sm w-full px-4 py-2 hover:bg-stone-900 rounded"
              title="Save current progress to JSON"
            >
              <Download className="w-4 h-4" />
              <span className="uppercase tracking-widest text-xs font-bold">Save Progress</span>
            </button>
          )}
          
          <button 
            onClick={onExit}
            className="flex items-center gap-3 text-stone-500 hover:text-[#fdf6e3] transition-colors text-sm w-full px-4 py-2 hover:bg-stone-900 rounded"
          >
            <Edit className="w-4 h-4" />
            <span className="uppercase tracking-widest text-xs font-bold">Modify Scroll</span>
          </button>

          {onDashboard && (
            <button 
              onClick={onDashboard}
              className="flex items-center gap-3 text-stone-500 hover:text-[#fdf6e3] transition-colors text-sm w-full px-4 py-2 hover:bg-stone-900 rounded"
            >
              <Home className="w-4 h-4" />
              <span className="uppercase tracking-widest text-xs font-bold">Return to Temple</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.1)]">
        {/* Children render here */}
        {children}
        
        {/* Navigation Footer - Hide on Briefing Page if desired, but good for skipping */}
        {currentPart !== LessonPart.Briefing && (
          <div className="h-16 bg-[#fdf6e3] border-t border-[#e6dcc3] flex items-center justify-between px-8 text-stone-600 shadow-lg z-10">
             <button 
               onClick={() => onChangePart(Math.max(LessonPart.Briefing, currentPart - 1))}
               className="text-sm font-bold uppercase tracking-widest hover:text-red-800 disabled:opacity-30 transition-colors flex items-center gap-2"
             >
               &larr; Prev
             </button>
             
             <div className="flex flex-col items-center">
               <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Stage</span>
               <span className="font-serif font-bold text-stone-800">{currentPart} / 10</span>
             </div>

             <button 
               onClick={() => onChangePart(Math.min(10, currentPart + 1))}
               disabled={currentPart === 10}
               className="text-sm font-bold uppercase tracking-widest hover:text-red-800 disabled:opacity-30 transition-colors flex items-center gap-2"
             >
               Next &rarr;
             </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Layout;