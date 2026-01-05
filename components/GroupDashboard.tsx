
import React, { useState, useRef } from 'react';
import { GroupProfile, Lesson, StudentProfile } from '../types';
import { generateId } from '../utils';
import { Users, Plus, Trash2, Scroll, ArrowRight, User, X, Save, Download, Upload, HelpCircle, MonitorPlay, Edit, History, Fingerprint, Book, ShieldCheck, Target, Trash, PlusCircle, Calendar } from 'lucide-react';

interface GroupDashboardProps {
  groups: GroupProfile[];
  students: StudentProfile[];
  activeGroup: GroupProfile | null;
  onSelectGroup: (group: GroupProfile | null) => void;
  onUpdateGroups: (groups: GroupProfile[]) => void;
  onUpdateStudents: (students: StudentProfile[]) => void;
  onLaunchLesson: (lesson: Lesson) => void;
  onEditLesson: (lesson: Lesson) => void;
  onCreateLesson: () => void;
}

const GroupDashboard: React.FC<GroupDashboardProps> = ({ groups, students, activeGroup, onSelectGroup, onUpdateGroups, onUpdateStudents, onLaunchLesson, onEditLesson, onCreateLesson }) => {
  const [view, setView] = useState<'groups' | 'students' | 'records'>('groups');
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const newGroup: GroupProfile = {
      id: generateId(),
      name: newGroupName.trim(),
      studentIds: [],
      inventory: { learnedSounds: [], learnedHFW: [] },
      jobs: {},
      savedLessons: [],
      history: []
    };
    onUpdateGroups([...groups, newGroup]);
    setNewGroupName('');
    setIsCreating(false);
  };

  const handleBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ groups, students, cipherPresets: JSON.parse(localStorage.getItem('wrs_cipher_presets_v3') || '[]') }, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `wrs_dojo_master_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.groups && json.students) {
          if (confirm("Restore from backup? This will overwrite ALL current local data.")) {
            onUpdateGroups(json.groups);
            onUpdateStudents(json.students);
            alert("Record Office Updated Successfully.");
          }
        }
      } catch (err) { alert('Error parsing backup file'); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-[#fdf6e3] flex flex-col p-8 relative overflow-x-hidden">
      <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row justify-between items-center mb-12 gap-6 border-b-4 border-stone-800 pb-8">
         <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-red-900 rounded-xl shadow-2xl border-4 border-stone-800 flex items-center justify-center rotate-3">
               <span className="text-4xl font-serif font-black">道</span>
            </div>
            <div>
               <h1 className="text-4xl font-black font-serif uppercase tracking-tighter">Dyslexia Dojo</h1>
               <p className="text-stone-500 uppercase tracking-widest text-xs font-bold mt-1">Unified Record Office & Scroll Case</p>
            </div>
         </div>

         <div className="flex gap-2 bg-stone-800 p-1.5 rounded-2xl border border-stone-700 shadow-inner">
            <button onClick={() => { setView('groups'); onSelectGroup(null); }} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'groups' ? 'bg-red-800 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}>Squads</button>
            <button onClick={() => setView('students')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'students' ? 'bg-red-800 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}>Ninjas</button>
         </div>

         <div className="flex gap-3">
            <input type="file" ref={fileInputRef} onChange={handleRestore} className="hidden" accept=".json" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-lg border border-stone-600 text-[10px] font-black uppercase tracking-widest"><Upload className="w-4 h-4" /> Restore</button>
            <button onClick={handleBackup} className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-lg border border-stone-600 text-[10px] font-black uppercase tracking-widest"><Download className="w-4 h-4" /> Secure Backup</button>
         </div>
      </div>

      <div className="max-w-7xl w-full mx-auto flex-1">
        {view === 'groups' && !activeGroup && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in zoom-in-95 duration-500">
              {isCreating ? (
                <form onSubmit={createGroup} className="bg-stone-800 p-8 rounded-2xl border-4 border-dashed border-stone-700 flex flex-col items-center justify-center gap-4">
                   <h3 className="uppercase tracking-widest font-black text-stone-500 text-xs">Establish New Squad</h3>
                   <input autoFocus value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="w-full bg-stone-950 p-4 rounded-xl text-center text-xl font-bold border border-stone-700 outline-none focus:border-red-800" placeholder="Squad Name..." />
                   <div className="flex gap-2 w-full mt-4">
                      <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-3 rounded-lg bg-stone-700 font-bold uppercase text-[10px]">Cancel</button>
                      <button type="submit" className="flex-1 py-3 rounded-lg bg-red-800 font-bold uppercase text-[10px]">Form Squad</button>
                   </div>
                </form>
              ) : (
                <button onClick={() => setIsCreating(true)} className="min-h-[16rem] bg-stone-800/40 p-8 rounded-2xl border-4 border-dashed border-stone-700 flex flex-col items-center justify-center gap-4 hover:border-red-900/50 hover:bg-stone-800/60 transition-all group">
                   <PlusCircle className="w-12 h-12 text-stone-600 group-hover:text-red-700 transition-colors" />
                   <span className="uppercase tracking-widest font-black text-stone-500 text-sm">Form New Squad</span>
                </button>
              )}
              {groups.map(g => (
                <div key={g.id} onClick={() => onSelectGroup(g)} className="relative bg-[#fdf6e3] text-stone-900 p-8 rounded-2xl border-4 border-stone-800 shadow-2xl cursor-pointer hover:-translate-y-2 transition-all group">
                   <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-16 h-16" /></div>
                   <h2 className="text-3xl font-black font-serif mb-2">{g.name}</h2>
                   <div className="flex items-center gap-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {g.studentIds.length} Ninjas</span>
                      <span className="flex items-center gap-1"><Scroll className="w-3 h-3" /> {g.savedLessons.length} Scrolls</span>
                   </div>
                   <div className="mt-8 pt-6 border-t border-stone-200 flex justify-between items-center">
                      <span className="text-red-800 font-black uppercase text-[10px] tracking-widest">Enter Dojo</span>
                      <ArrowRight className="w-5 h-5 text-red-800 group-hover:translate-x-2 transition-transform" />
                   </div>
                </div>
              ))}
           </div>
        )}

        {view === 'groups' && activeGroup && (
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-left-4 duration-500">
              <div className="lg:col-span-4 space-y-6">
                 <div className="bg-[#fdf6e3] text-stone-900 p-8 rounded-2xl border-4 border-stone-800 shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-8">
                       <h2 className="text-4xl font-black font-serif leading-none">{activeGroup.name}</h2>
                       <button onClick={() => onSelectGroup(null)} className="text-stone-300 hover:text-red-800 transition-colors"><X /></button>
                    </div>
                    <div className="space-y-4 mb-8">
                       <div className="flex items-center gap-3 text-stone-500 font-bold uppercase text-[10px] tracking-widest"><ShieldCheck className="w-4 h-4 text-red-800" /> Mastery Inventory</div>
                       <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white p-4 rounded-xl border-2 border-stone-200">
                             <div className="text-[10px] text-stone-400 uppercase font-black">Sounds</div>
                             <div className="text-3xl font-black">{activeGroup.inventory.learnedSounds.length}</div>
                          </div>
                          <div className="bg-white p-4 rounded-xl border-2 border-stone-200">
                             <div className="text-[10px] text-stone-400 uppercase font-black">HFW</div>
                             <div className="text-3xl font-black">{activeGroup.inventory.learnedHFW.length}</div>
                          </div>
                       </div>
                    </div>
                    <button onClick={() => setView('records')} className="w-full py-4 bg-stone-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-900 transition-colors shadow-xl flex items-center justify-center gap-2"><History className="w-4 h-4" /> Mission Vault</button>
                 </div>
              </div>
              <div className="lg:col-span-8 space-y-6">
                 <div className="flex justify-between items-center bg-stone-800/50 p-6 rounded-2xl border border-stone-700">
                    <div className="flex items-center gap-3">
                       <div className="p-3 bg-red-900 rounded-xl"><Scroll className="w-6 h-6 text-white" /></div>
                       <h3 className="font-black uppercase tracking-widest text-lg">Active Scroll Case</h3>
                    </div>
                    <button onClick={onCreateLesson} className="px-6 py-3 bg-red-800 hover:bg-red-700 text-white rounded-xl font-black uppercase text-xs shadow-2xl flex items-center gap-2"><Plus className="w-4 h-4" /> Create New Scroll</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activeGroup.savedLessons.length === 0 ? (
                       <div className="col-span-2 py-20 border-4 border-dashed border-stone-800 rounded-3xl text-center text-stone-600 italic">No Scrolls Prepared. Craft one to begin.</div>
                    ) : (
                       activeGroup.savedLessons.map(lesson => (
                          <div key={lesson.id} className="bg-[#fdf6e3] text-stone-900 p-6 rounded-2xl border-4 border-stone-800 hover:border-red-800 transition-colors shadow-xl group/card">
                             <div className="flex justify-between items-start mb-6">
                                <div>
                                   <span className="bg-red-100 text-red-900 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">Step {lesson.step}.{lesson.substep}</span>
                                   <h4 className="text-2xl font-black font-serif mt-2 group-hover/card:text-red-900 transition-colors">{lesson.title}</h4>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); if(confirm("Incinerate scroll?")) onUpdateGroups(groups.map(gr => gr.id === activeGroup.id ? {...gr, savedLessons: gr.savedLessons.filter(sl => sl.id !== lesson.id)} : gr)); }} className="text-stone-300 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => onLaunchLesson(lesson)} className="flex-1 py-4 bg-stone-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-900 shadow-lg flex items-center justify-center gap-2"><MonitorPlay className="w-4 h-4" /> Deploy</button>
                                <button onClick={() => onEditLesson(lesson)} className="px-4 py-4 border-2 border-stone-300 text-stone-400 rounded-xl hover:text-stone-900 hover:border-stone-900"><Edit className="w-4 h-4" /></button>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </div>
           </div>
        )}

        {view === 'students' && (
           <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-end border-b-2 border-stone-800 pb-6">
                 <div>
                    <h2 className="text-4xl font-black font-serif uppercase tracking-tighter">Ninja Dossiers</h2>
                    <p className="text-stone-500 uppercase tracking-widest text-[10px] font-bold mt-1">Individual Progress Tracking</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                 {students.map(s => (
                    <div key={s.id} onClick={() => setEditingStudent(s)} className="bg-stone-800 p-6 rounded-2xl border-b-4 border-stone-950 hover:bg-stone-700 transition-all cursor-pointer group">
                       <div className="flex items-center gap-4 mb-6">
                          <div className="w-12 h-12 bg-red-900/30 rounded-xl flex items-center justify-center text-red-500 font-black text-xl group-hover:bg-red-900 transition-colors group-hover:text-white">{s.name.charAt(0)}</div>
                          <div>
                             <h4 className="font-black text-lg text-white">{s.name}</h4>
                             <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Attendance: {s.attendanceCount || 0}</p>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase text-stone-500"><span>Mastery Index</span><span>{(s.masteredSounds?.length || 0) + (s.masteredHFW?.length || 0)} Items</span></div>
                          <div className="h-1.5 w-full bg-stone-900 rounded-full overflow-hidden">
                             <div className="h-full bg-red-600 rounded-full" style={{ width: `${Math.min(100, ((s.masteredSounds?.length || 0) + (s.masteredHFW?.length || 0)) * 2)}%` }}></div>
                          </div>
                       </div>
                    </div>
                 ))}
                 <button onClick={() => { const name = prompt("Ninja Name?"); if(name) onUpdateStudents([...students, { id: generateId(), name, masteredSounds: [], masteredHFW: [], attendanceCount: 0, notes: '', history: [] }]); }} className="min-h-[10rem] border-4 border-dashed border-stone-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-stone-600 hover:text-stone-400 hover:border-stone-700 transition-all">
                    <PlusCircle className="w-8 h-8" />
                    <span className="uppercase tracking-widest font-black text-[10px]">Add New Ninja</span>
                 </button>
              </div>
           </div>
        )}

        {view === 'records' && activeGroup && (
           <div className="bg-[#fdf6e3] text-stone-900 rounded-3xl border-4 border-stone-800 shadow-2xl p-10 animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-10">
                 <div className="flex items-center gap-4">
                    <div className="p-4 bg-stone-900 rounded-2xl text-red-700"><Fingerprint className="w-8 h-8" /></div>
                    <div>
                       <h2 className="text-4xl font-black font-serif uppercase tracking-tight">Mission Vault</h2>
                       <p className="text-stone-500 uppercase tracking-widest text-[10px] font-bold">{activeGroup.name} Archive</p>
                    </div>
                 </div>
                 <button onClick={() => setView('groups')} className="text-stone-400 hover:text-red-800 font-black uppercase tracking-widest text-xs flex items-center gap-2">&larr; Back to Dojo</button>
              </div>
              <div className="space-y-4">
                 {activeGroup.history.length === 0 ? (
                    <div className="py-20 text-center text-stone-400 italic font-serif">"The vault is currently empty. Complete missions to log data."</div>
                 ) : (
                    activeGroup.history.map(entry => (
                       <div key={entry.id} className="bg-white p-6 rounded-2xl border-2 border-stone-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-red-800 transition-colors shadow-sm">
                          <div className="flex gap-6 items-center">
                             <div className="p-3 bg-stone-100 rounded-xl text-stone-400 group-hover:text-red-800 transition-colors"><ShieldCheck className="w-6 h-6" /></div>
                             <div>
                                <div className="text-xs font-black text-stone-400 uppercase tracking-widest mb-1">{entry.date}</div>
                                <h4 className="text-xl font-black font-serif">{entry.title}</h4>
                                <div className="flex gap-1 mt-2">
                                   {entry.studentIds.map(sid => {
                                      const s = students.find(st => st.id === sid);
                                      return s ? <span key={sid} className="bg-stone-100 px-2 py-0.5 rounded text-[8px] font-bold uppercase text-stone-500 border border-stone-200">{s.name}</span> : null;
                                   })}
                                </div>
                             </div>
                          </div>
                          <div className="flex-1 max-w-md text-xs italic text-stone-500 font-serif leading-relaxed line-clamp-2">{entry.notes}</div>
                       </div>
                    ))
                 )}
              </div>
           </div>
        )}
      </div>

      {/* Student Record Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-[100] bg-stone-900/95 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
           <div className="bg-[#fdf6e3] w-full max-w-5xl rounded-3xl border-8 border-stone-800 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-8 bg-stone-900 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-red-900 rounded-2xl flex items-center justify-center text-3xl font-black">{editingStudent.name.charAt(0)}</div>
                    <div>
                       <h3 className="text-3xl font-black font-serif uppercase tracking-tight">{editingStudent.name}</h3>
                       <p className="text-stone-500 uppercase tracking-widest text-[10px] font-bold">Ninja Dossier #{editingStudent.id.slice(0,6)}</p>
                    </div>
                 </div>
                 <button onClick={() => setEditingStudent(null)} className="text-stone-400 hover:text-white p-2 transition-colors"><X className="w-8 h-8" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-12 text-stone-900">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-stone-200 flex flex-col items-center justify-center gap-2">
                       <Target className="w-8 h-8 text-red-800" />
                       <span className="text-[10px] font-black uppercase text-stone-400">Total Missions</span>
                       <span className="text-5xl font-black">{editingStudent.attendanceCount || 0}</span>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-stone-200 flex flex-col items-center justify-center gap-2">
                       <Book className="w-8 h-8 text-red-800" />
                       <span className="text-[10px] font-black uppercase text-stone-400">Sound Mastery</span>
                       <span className="text-5xl font-black">{editingStudent.masteredSounds?.length || 0}</span>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-stone-200 flex flex-col items-center justify-center gap-2">
                       <ShieldCheck className="w-8 h-8 text-red-800" />
                       <span className="text-[10px] font-black uppercase text-stone-400">Sight Words</span>
                       <span className="text-5xl font-black">{editingStudent.masteredHFW?.length || 0}</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-4">
                       <h4 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 border-b-2 border-stone-200 pb-2">Mission Log</h4>
                       <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          {(!editingStudent.history || editingStudent.history.length === 0) ? (
                            <p className="italic text-xs text-stone-300">No mission records found.</p>
                          ) : (
                            editingStudent.history.map((h, i) => (
                              <div key={i} className="bg-white p-3 rounded-lg border border-stone-200 flex justify-between items-center">
                                 <div>
                                    <div className="text-[10px] font-black text-red-800 uppercase leading-none mb-1">Step {h.step}</div>
                                    <div className="font-bold text-stone-800 text-sm leading-none">{h.lessonTitle}</div>
                                 </div>
                                 <div className="text-[10px] font-bold text-stone-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {h.date}</div>
                              </div>
                            ))
                          )}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 border-b-2 border-stone-200 pb-2">Teacher Observations</h4>
                       <textarea value={editingStudent.notes} onChange={e => { const updated = {...editingStudent, notes: e.target.value}; setEditingStudent(updated); onUpdateStudents(students.map(s => s.id === editingStudent.id ? updated : s)); }} className="w-full h-40 bg-white p-4 rounded-2xl border-2 border-stone-200 text-sm font-serif italic focus:border-red-800 outline-none shadow-inner" placeholder="Log observations here..." />
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 border-b-2 border-stone-200 pb-2">Sound Registry</h4>
                    <div className="flex flex-wrap gap-2">
                       {(!editingStudent.masteredSounds || editingStudent.masteredSounds.length === 0) ? <p className="italic text-xs text-stone-300">No mastered sounds logged.</p> : editingStudent.masteredSounds.map(s => <span key={s} className="bg-red-100 text-red-900 px-3 py-1.5 rounded-lg font-black text-xs border border-red-200">{s}</span>)}
                    </div>
                 </div>
              </div>
              <div className="p-8 bg-stone-100 border-t border-stone-200 flex justify-between items-center">
                 <button onClick={() => { if(confirm("Banish this ninja? All records will be vaporized.")) { onUpdateStudents(students.filter(s => s.id !== editingStudent.id)); setEditingStudent(null); } }} className="flex items-center gap-2 text-red-800 font-black uppercase text-[10px] tracking-widest hover:underline"><Trash className="w-4 h-4" /> Vaporize Profile</button>
                 <button onClick={() => setEditingStudent(null)} className="px-10 py-4 bg-stone-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-900 shadow-xl transition-all">Close Dossier</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default GroupDashboard;
