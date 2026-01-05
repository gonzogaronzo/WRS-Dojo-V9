
import React, { useState, useEffect } from 'react';
import LessonForm from './components/LessonForm';
import Layout from './components/Layout';
import GroupDashboard from './components/GroupDashboard';
import { Lesson, LessonPart, GroupProfile, StudentProfile, DojoMasterData, LessonHistoryEntry } from './types';
import { Save, RefreshCw, CheckCircle } from 'lucide-react';
import { generateId } from './utils';

// Modules
import MissionBriefing from './components/modules/MissionBriefing'; 
import QuickDrill from './components/modules/QuickDrill';
import GenericText from './components/modules/GenericText';
import WordCards from './components/modules/WordCards';
import Dictation from './components/modules/Dictation';
import SentenceReading from './components/modules/SentenceReading';
import TeachConcepts from './components/modules/TeachConcepts';
import Spelling from './components/modules/Spelling';
import WordlistReading from './components/modules/WordlistReading';
import PassageReading from './components/modules/PassageReading';

const STORAGE_KEY = 'wrs_dojo_master_v2';

const App: React.FC = () => {
  const [groups, setGroups] = useState<GroupProfile[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupProfile | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentPart, setCurrentPart] = useState<LessonPart>(LessonPart.Briefing);
  const [mode, setMode] = useState<'dashboard' | 'edit' | 'run'>('dashboard');
  const [sessionStudentIds, setSessionStudentIds] = useState<string[]>([]);
  const [showSaveToast, setShowSaveToast] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data: DojoMasterData = JSON.parse(saved);
        setGroups(data.groups || []);
        setStudents(data.students || []);
        
        if (data.activeSession && data.activeSession.lesson) {
          const recover = confirm(`Ongoing mission found: Step ${data.activeSession.lesson.step}.${data.activeSession.lesson.substep}. Resume progress?`);
          if (recover) {
            setCurrentLesson(data.activeSession.lesson);
            setCurrentPart(data.activeSession.currentPart);
            setSessionStudentIds(data.activeSession.studentIds || []);
            const g = data.groups.find(group => group.id === data.activeSession?.groupId);
            if (g) setActiveGroup(g);
            setMode('run');
          } else {
            saveMasterData(data.groups, data.students, null);
          }
        }
      } catch (e) {
        console.error("Failed to parse Dojo data", e);
      }
    }
  }, []);

  const saveMasterData = (updatedGroups: GroupProfile[], updatedStudents: StudentProfile[], activeSess: DojoMasterData['activeSession'] | null = null) => {
    const data: DojoMasterData = {
      groups: updatedGroups,
      students: updatedStudents,
      cipherPresets: JSON.parse(localStorage.getItem('wrs_cipher_presets_v3') || '[]'),
      activeSession: activeSess || undefined
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setGroups(updatedGroups);
    setStudents(updatedStudents);
  };

  useEffect(() => {
    if (mode === 'run' && currentLesson && activeGroup) {
      const activeSess = {
        lesson: currentLesson,
        currentPart,
        groupId: activeGroup.id,
        studentIds: sessionStudentIds
      };
      saveMasterData(groups, students, activeSess);
    }
  }, [currentPart, currentLesson, sessionStudentIds, mode]);

  const handleUpdateActiveGroup = (updatedGroup: GroupProfile) => {
    setActiveGroup(updatedGroup);
    const newGroups = groups.map(g => g.id === updatedGroup.id ? updatedGroup : g);
    saveMasterData(newGroups, students, mode === 'run' && currentLesson ? {
      lesson: currentLesson,
      currentPart,
      groupId: updatedGroup.id,
      studentIds: sessionStudentIds
    } : null);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
  };

  const handleUpdateStudents = (updatedStudents: StudentProfile[]) => {
    setStudents(updatedStudents);
    saveMasterData(groups, updatedStudents, mode === 'run' && currentLesson ? {
      lesson: currentLesson,
      currentPart,
      groupId: activeGroup?.id || '',
      studentIds: sessionStudentIds
    } : null);
  };

  const handleBriefingStart = (data: { date: string; studentIds: string[] }) => {
    setSessionStudentIds(data.studentIds);
    if (activeGroup) {
      const updatedGroup = { 
        ...activeGroup, 
        studentIds: data.studentIds,
        lastLessonDate: data.date 
      };
      handleUpdateActiveGroup(updatedGroup);
    }
    
    const updatedStudents = students.map(s => {
       if (data.studentIds.includes(s.id)) {
          return { ...s, attendanceCount: (s.attendanceCount || 0) + 1, lastSeen: data.date };
       }
       return s;
    });
    handleUpdateStudents(updatedStudents);
    
    setCurrentPart(LessonPart.Part1); 
  };

  const handleCompleteMission = () => {
    if (!activeGroup || !currentLesson) return;
    
    const now = new Date().toLocaleDateString();
    const historyEntry: LessonHistoryEntry = {
      id: generateId(),
      lessonId: currentLesson.id,
      title: currentLesson.title,
      date: now,
      studentIds: sessionStudentIds,
      notes: "Mission successfully completed."
    };

    // 1. Update Group History
    const updatedGroup = {
      ...activeGroup,
      history: [historyEntry, ...activeGroup.history]
    };

    // 2. Update Individual Student History
    const updatedStudents = students.map(s => {
      if (sessionStudentIds.includes(s.id)) {
        return {
          ...s,
          history: [{ 
            date: now, 
            lessonTitle: currentLesson.title, 
            step: `${currentLesson.step}.${currentLesson.substep}` 
          }, ...(s.history || [])]
        };
      }
      return s;
    });
    
    handleUpdateStudents(updatedStudents);
    handleUpdateActiveGroup(updatedGroup);
    saveMasterData(groups.map(g => g.id === updatedGroup.id ? updatedGroup : g), updatedStudents, null);
    setMode('dashboard');
    alert("Mission Archived! Data synced to individual ninja dossiers.");
  };

  const addToInventory = (items: string[], type: 'sound' | 'hfw') => {
    if (!activeGroup) return;
    const currentInventory = { ...activeGroup.inventory };
    let changed = false;

    items.forEach(item => {
      const list = type === 'sound' ? currentInventory.learnedSounds : currentInventory.learnedHFW;
      if (!list.includes(item)) {
        list.push(item);
        changed = true;
      }
    });

    if (changed) {
      handleUpdateActiveGroup({ ...activeGroup, inventory: currentInventory });
      
      const updatedStudents = students.map(s => {
        if (sessionStudentIds.includes(s.id)) {
          const mastered = type === 'sound' ? [...(s.masteredSounds || [])] : [...(s.masteredHFW || [])];
          items.forEach(i => { if(!mastered.includes(i)) mastered.push(i); });
          return type === 'sound' ? { ...s, masteredSounds: mastered } : { ...s, masteredHFW: mastered };
        }
        return s;
      });
      handleUpdateStudents(updatedStudents);
    }
  };

  const renderModule = () => {
    if (!currentLesson) return null;
    const sessionStudents = students.filter(s => sessionStudentIds.includes(s.id)).map(s => s.name);
    
    switch (currentPart) {
      case LessonPart.Briefing:
        return (
          <MissionBriefing 
            onStart={(d) => handleBriefingStart({ date: d.date, studentIds: d.students })} 
            initialStudentIds={sessionStudentIds} 
            activeGroup={activeGroup || undefined} 
            allStudents={students}
            onUpdateGroup={handleUpdateActiveGroup} 
            onUpdateAllStudents={handleUpdateStudents}
          />
        );
      case LessonPart.Part1: return <QuickDrill sounds={currentLesson.quickDrill} />;
      case LessonPart.Part2: return <TeachConcepts lesson={currentLesson} onUpdateLesson={setCurrentLesson} onAddToInventory={(text) => addToInventory([text], 'sound')} />;
      case LessonPart.Part3: return <WordCards cards={currentLesson.wordCards} hfw={currentLesson.hfwList} students={sessionStudents} onAddToInventory={(text) => addToInventory([text], 'hfw')} />;
      case LessonPart.Part4:
        const readingCards = (currentLesson.wordListReadingAuto ?? true) 
          ? currentLesson.wordCards 
          : (currentLesson.wordListReading || []).map((text, i) => ({ id: `custom-${i}`, text, type: 'regular' as const }));
        return <WordlistReading cards={readingCards} students={sessionStudents} />;
      case LessonPart.Part5: return <SentenceReading sentences={currentLesson.sentences} />;
      case LessonPart.Part6: return <QuickDrill sounds={currentLesson.quickDrillReverse?.length ? currentLesson.quickDrillReverse : currentLesson.quickDrill} isReverse={true} />;
      case LessonPart.Part7: return <TeachConcepts lesson={currentLesson} isSpelling={true} onUpdateLesson={setCurrentLesson} onAddToInventory={(text) => addToInventory([text], 'sound')} />;
      case LessonPart.Part8: return <Spelling data={currentLesson.dictation} />;
      case LessonPart.Part9: return <PassageReading text={currentLesson.passage || ""} />;
      case LessonPart.Part10: return (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-white text-center">
           <CheckCircle className="w-24 h-24 text-green-500 mb-6 animate-bounce" />
           <h2 className="text-4xl font-black font-serif text-stone-900 uppercase tracking-widest mb-4">Final Stage Reached</h2>
           <p className="text-stone-500 max-w-lg mb-8 font-serif italic text-lg">"The mission is complete. The Ninjas have sharpened their skills."</p>
           <div className="flex gap-4">
              <button onClick={handleCompleteMission} className="px-10 py-5 bg-stone-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-green-700 transition-colors shadow-2xl">Archive Mission & Close Session</button>
           </div>
        </div>
      );
      default: return <div>Module Under Construction</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 relative">
      {showSaveToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4">
           <div className="bg-stone-900 text-white px-6 py-3 rounded-full shadow-2xl border border-stone-700 flex items-center gap-3">
             <div className="bg-green-500 rounded-full p-1"><Save className="w-3 h-3 text-white" /></div>
             <span className="font-bold text-sm uppercase tracking-wider">Securely Committed to Local Records</span>
           </div>
        </div>
      )}

      {mode === 'dashboard' ? (
        <GroupDashboard 
          groups={groups} 
          students={students}
          activeGroup={activeGroup}
          onSelectGroup={(g) => { setActiveGroup(g); if(g) setSessionStudentIds(g.studentIds); }} 
          onUpdateGroups={(gs) => saveMasterData(gs, students, null)}
          onUpdateStudents={(ss) => saveMasterData(groups, ss, null)}
          onLaunchLesson={(l) => { setCurrentLesson(l); setMode('run'); setCurrentPart(LessonPart.Briefing); }}
          onEditLesson={(l) => { setCurrentLesson(l); setMode('edit'); }}
          onCreateLesson={() => { setCurrentLesson(null); setMode('edit'); }}
        />
      ) : mode === 'edit' ? (
        <div className="relative">
          <div className="absolute top-4 left-4 z-50">
             <button onClick={() => setMode('dashboard')} className="bg-stone-800 text-white px-4 py-2 rounded shadow hover:bg-stone-700 text-xs font-bold uppercase tracking-widest">&larr; Return to Dojo</button>
          </div>
          <LessonForm 
            initialLesson={currentLesson || undefined} 
            activeGroup={activeGroup || undefined}
            onSave={(l) => {
              if(!activeGroup) return;
              const updated = { ...activeGroup, savedLessons: [...activeGroup.savedLessons.filter(sl => sl.id !== l.id), l] };
              handleUpdateActiveGroup(updated);
              setCurrentLesson(l);
              setMode('dashboard');
            }} 
          />
        </div>
      ) : (
        currentLesson && (
          <Layout lesson={currentLesson} currentPart={currentPart} onChangePart={setCurrentPart} onExit={() => setMode('edit')} onDashboard={() => setMode('dashboard')}>
            {renderModule()}
          </Layout>
        )
      )}
    </div>
  );
};

export default App;
