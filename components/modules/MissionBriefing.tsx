
import React, { useState, useEffect } from 'react';
import { Calendar, UserPlus, User, X, ArrowRight, Sword, Crown, Bell, Clock, Briefcase, RotateCw, Fingerprint } from 'lucide-react';
import { GroupProfile, StudentProfile } from '../../types';
import { generateId } from '../../utils';

interface MissionBriefingProps {
  onStart: (data: { date: string; students: string[] }) => void;
  initialStudentIds?: string[];
  activeGroup?: GroupProfile;
  allStudents: StudentProfile[];
  onUpdateGroup?: (group: GroupProfile) => void;
  onUpdateAllStudents?: (students: StudentProfile[]) => void;
}

const JOBS = [
  { id: 'gemstones', title: 'Gemstones', icon: Crown },
  { id: 'timer', title: 'Timer', icon: Clock },
  { id: 'schedule', title: 'Schedule', icon: Briefcase },
  { id: 'bell', title: 'Bell', icon: Bell },
];

const MissionBriefing: React.FC<MissionBriefingProps> = ({ onStart, initialStudentIds = [], activeGroup, allStudents, onUpdateGroup, onUpdateAllStudents }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(initialStudentIds);
  const [newStudentName, setNewStudentName] = useState('');
  
  const [jobAssignments, setJobAssignments] = useState<Record<string, string>>(activeGroup?.jobs || {});

  const currentStudents = allStudents.filter(s => selectedStudentIds.includes(s.id));

  const addStudent = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newStudentName.trim()) {
      const newStudent: StudentProfile = {
        id: generateId(),
        name: newStudentName.trim(),
        masteredSounds: [],
        masteredHFW: [],
        attendanceCount: 0,
        notes: '',
        history: []
      };
      
      const updatedAll = [...allStudents, newStudent];
      if(onUpdateAllStudents) onUpdateAllStudents(updatedAll);
      
      setSelectedStudentIds(prev => [...prev, newStudent.id]);
      setNewStudentName('');
    }
  };

  const removeStudentFromSession = (id: string) => {
    setSelectedStudentIds(prev => prev.filter(sid => sid !== id));
    
    const newJobs = { ...jobAssignments };
    Object.keys(newJobs).forEach(key => { if (newJobs[key] === id) delete newJobs[key]; });
    setJobAssignments(newJobs);
  };

  const assignJob = (jobId: string, studentId: string) => {
    const newJobs = { ...jobAssignments, [jobId]: studentId };
    setJobAssignments(newJobs);
    if (activeGroup && onUpdateGroup) onUpdateGroup({ ...activeGroup, jobs: newJobs });
  };

  const rotateJobs = () => {
    if (selectedStudentIds.length === 0) return;
    const newJobs: Record<string, string> = {};
    JOBS.forEach((job, i) => {
       const currentHolderId = jobAssignments[job.id];
       let nextIndex = 0;
       if (currentHolderId) {
         const currentIdx = selectedStudentIds.indexOf(currentHolderId);
         if (currentIdx !== -1) nextIndex = (currentIdx + 1) % selectedStudentIds.length;
       } else {
         nextIndex = i % selectedStudentIds.length;
       }
       newJobs[job.id] = selectedStudentIds[nextIndex];
    });
    setJobAssignments(newJobs);
    if (activeGroup && onUpdateGroup) onUpdateGroup({ ...activeGroup, jobs: newJobs });
  };

  return (
    <div className="h-full w-full bg-[#fdf6e3] flex flex-col items-center justify-center p-8 font-sans overflow-y-auto">
      <div className="max-w-5xl w-full bg-white shadow-2xl border-4 border-stone-800 rounded-lg overflow-hidden flex flex-col md:flex-row">
        
        <div className="flex-1 bg-stone-900 p-8 text-white relative border-r-4 border-stone-800">
           <div className="relative z-10">
             <div className="flex items-center gap-3 mb-8">
                <Sword className="w-8 h-8 text-red-600" />
                <h1 className="text-2xl font-bold font-serif tracking-widest uppercase">Mission Briefing</h1>
             </div>

             <div className="mb-8">
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Mission Date
                </label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-stone-800 border border-stone-600 rounded p-3 font-serif text-lg font-bold text-white focus:border-red-600 outline-none" />
             </div>

             <div className="mb-8">
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" /> Active Ninjas
                </label>
                
                <form onSubmit={addStudent} className="flex gap-2 mb-4">
                  <input type="text" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="New Ninja Name..." className="flex-1 bg-stone-800 border border-stone-600 rounded p-2 text-sm outline-none focus:border-red-600" />
                  <button type="submit" disabled={!newStudentName.trim()} className="bg-red-800 text-white px-3 rounded hover:bg-red-700 disabled:opacity-50"><UserPlus className="w-5 h-5" /></button>
                </form>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {currentStudents.map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-stone-800 p-3 rounded border border-stone-700 group">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded bg-stone-700 flex items-center justify-center text-xs font-black text-stone-400">{s.name.charAt(0)}</div>
                         <span className="font-bold text-sm tracking-wide">{s.name}</span>
                      </div>
                      <button onClick={() => removeStudentFromSession(s.id)} className="text-stone-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {currentStudents.length === 0 && <div className="text-stone-600 italic text-xs text-center py-8 border-2 border-dashed border-stone-700 rounded uppercase tracking-widest">No Ninjas Active</div>}
                </div>
             </div>
             
             <button onClick={() => onStart({ date, students: selectedStudentIds })} disabled={selectedStudentIds.length === 0} className="w-full bg-red-800 text-white py-5 rounded-xl font-bold text-xl uppercase tracking-widest hover:bg-red-900 transition-all hover:scale-[1.02] shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale">Deploy Squad <ArrowRight className="w-6 h-6" /></button>
           </div>
        </div>

        <div className="flex-1 bg-[#fdf6e3] p-8 relative">
           <div className="flex justify-between items-center mb-8">
              <h2 className="text-stone-800 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-red-800" /> Tactical Assignments
              </h2>
              <button onClick={rotateJobs} className="flex items-center gap-2 text-[10px] font-black bg-stone-900 text-white px-4 py-2 rounded-full hover:bg-red-900 transition-colors uppercase tracking-widest shadow-md"><RotateCw className="w-3 h-3" /> Rotate Roles</button>
           </div>

           <div className="grid grid-cols-1 gap-6">
              {JOBS.map(job => (
                <div key={job.id} className="bg-white p-5 rounded-xl shadow-sm border-2 border-stone-200 flex items-center justify-between group hover:border-red-800 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-stone-100 rounded-lg text-stone-600 group-hover:text-red-800 group-hover:bg-red-50 transition-colors">
                        <job.icon className="w-6 h-6" />
                      </div>
                      <span className="font-black text-stone-800 font-serif uppercase tracking-wider text-sm">{job.title}</span>
                   </div>
                   
                   <select 
                     value={jobAssignments[job.id] || ''}
                     onChange={(e) => assignJob(job.id, e.target.value)}
                     className="bg-stone-50 border-2 border-stone-200 rounded-lg px-4 py-2 text-sm font-bold text-stone-900 outline-none focus:border-red-800 w-48 appearance-none"
                   >
                     <option value="">Unassigned</option>
                     {currentStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
              ))}
           </div>

           <div className="mt-12 p-6 bg-white/50 border-4 border-dotted border-stone-300 rounded-2xl">
              <div className="flex items-center gap-2 mb-2 text-stone-400"><Fingerprint className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Sensei's Directive</span></div>
              <p className="text-stone-600 text-sm italic leading-relaxed">"A squad is only as strong as its weakest link. Assign roles based on discipline and merit."</p>
           </div>
        </div>

      </div>
    </div>
  );
};

export default MissionBriefing;
