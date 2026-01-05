import React, { useState, useRef, useEffect } from 'react';
import { Lesson, WordCard, Slide, GroupProfile, LESSON_PARTS, LessonPart } from '../types';
import { generateId, parseLessonText } from '../utils';
import { Plus, Trash2, Save, FileText, Image as ImageIcon, Type, MonitorPlay, Presentation, LayoutTemplate, Import, Check, Download, Upload, FolderOpen, Sparkles, Scroll, X, Users, RefreshCw, Layers, List, RotateCcw, Edit3, Gamepad2, Printer, HelpCircle, Grid3X3, ArrowRight, Wand2, Settings, Zap, ListPlus, Terminal } from 'lucide-react';
import PrintableLesson from './PrintableLesson';
import TeachConcepts from './modules/TeachConcepts';

interface LessonFormProps {
  initialLesson?: Lesson;
  activeGroup?: GroupProfile;
  onSave: (lesson: Lesson) => void;
  onUpdateGroup?: (group: GroupProfile) => void;
}

const emptyLesson: Lesson = {
  id: '',
  title: '',
  step: '1',
  substep: '1',
  conceptNotes: '',
  conceptNotes7: '',
  cipherWords: [],
  cipherDistractors: [],
  googleSlidesUrl: '',
  slides: [],
  quickDrill: [],
  quickDrillReverse: [],
  wordCards: [],
  wordListReading: [],
  wordListReadingAuto: true,
  sentences: [],
  dictation: {
    sounds: [],
    realWords: [],
    wordElements: [],
    nonsenseWords: [],
    phrases: [],
    sentences: []
  },
  hfwList: [],
  affixPractice: [],
  passage: ''
};

interface CipherPreset {
  label: string;
  pattern: string;
  desc: string;
}

const DEFAULT_CIPHER_PRESETS: CipherPreset[] = [
  { label: '/k/', pattern: '/k/', desc: '[c|k|ck]' },
  { label: '/j/', pattern: '/j/', desc: '[j|g|dge]' },
  { label: '/ch/', pattern: '/ch/', desc: '[ch|tch]' },
  { label: '/f/', pattern: '/f/', desc: '[f|ff|ph]' },
  { label: '/s/', pattern: '/s/', desc: '[s|ss|c]' },
  { label: '/z/', pattern: '/z/', desc: '[z|zz|s]' },
  { label: '/er/', pattern: '/er/', desc: '[er|ir|ur]' },
  { label: '/ā/', pattern: '/ā/', desc: '[a-e|ai|ay]' },
  { label: '/ē/', pattern: '/ē/', desc: '[e-e|ee|ea|y]' },
  { label: '/ī/', pattern: '/ī/', desc: '[i-e|igh|y]' },
  { label: '/ō/', pattern: '/ō/', desc: '[o-e|oa|ow]' },
  { label: '/ū/', pattern: '/ū/', desc: '[u-e|oo|ue|ew]' },
  { label: '/oi/', pattern: '/oi/', desc: '[oi|oy]' },
  { label: '/ow/', pattern: '/ow/', desc: '[ou|ow]' },
  { label: '/au/', pattern: '/au/', desc: '[au|aw]' },
  { label: '/shun/', pattern: '/shun/', desc: '[tion|sion|cian]' },
  { label: '/cher/', pattern: '/cher/', desc: '[ture|cher]' }
];

const sampleLesson: Lesson = {
  id: 'sample-123',
  title: 'Step 3.1 Lesson',
  step: '3',
  substep: '1',
  conceptNotes: 'Focus on dividing multisyllabic words with closed syllables. Remind students to locate the vowels first.',
  conceptNotes7: 'Spelling Focus: Using K vs CK at the end of multisyllabic words.',
  cipherWords: ['/k/lap', 'ba ck/k/', 'ca tch/ch/', 'ma/j/ic'],
  cipherDistractors: [],
  googleSlidesUrl: '',
  quickDrill: ['a', 'i', 'o', 'u', 'sh', 'ch', 'th', 'ck', 'all', 'am', 'an', 'ing'],
  hfwList: ['full', 'pull', 'month', 'love'],
  wordCards: [
    { id: 'wc1', text: 'catnip', type: 'regular' },
    { id: 'wc2', text: 'goblin', type: 'regular' },
    { id: 'wc3', text: 'batfish', type: 'nonsense' },
    { id: 'wc4', text: 'sunfish', type: 'regular' },
    { id: 'wc5', text: 'rel-ish', type: 'regular' },
    { id: 'wc6', text: 'pub-lish', type: 'regular' },
    { id: 'wc7', text: 'mascot', type: 'regular' }
  ],
  sentences: [
    'The goblin had a red hat.',
    'Did you publish the list?',
    'The sunfish is in the net.'
  ],
  dictation: {
    sounds: ['a', 'u', 'ank', 'th', 'qu'],
    realWords: ['stung', 'skunk', 'vanish', 'livid', 'toxic'],
    wordElements: ['in', 'ex', 'dis', 'non', 'un'],
    nonsenseWords: ['zall', 'mish', 'baff'],
    phrases: ['fast ship', 'big fish', 'red hat'],
    sentences: ['Justin must dust the cobweb.', 'Ed went to the cabin by the pond.', 'Did the cat nap on the mat?']
  },
  affixPractice: [],
  passage: 'The goblin sat on the rock.\n\nHe had a big red hat on his head.\n\nThe cat ran to the goblin to get the hat.',
  slides: [
    { id: 's1', type: 'text', title: 'Step 3.1 Introduction', content: 'Today we will look at words with TWO syllables.\n\nRule: Find the vowels first.' },
    { id: 's2', type: 'word', title: '', content: 'ship' },
    { id: 's3', type: 'word', title: '', content: 'ball' },
    { id: 's4', type: 'word', title: '', content: 'vol-ca-no' },
    { id: 's5', type: 'word', title: '', content: 'mag-net' }
  ]
};

// --- Managed Input Helpers ---
interface ManagedInputProps {
  values: string[];
  onCommit: (val: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const ManagedStringArrayInput: React.FC<ManagedInputProps> = ({ values, onCommit, className, placeholder, disabled }) => {
  const [localValue, setLocalValue] = useState(values ? values.join(', ') : '');
  useEffect(() => { setLocalValue(values ? values.join(', ') : ''); }, [values]);
  return (
    <input 
      type="text"
      value={localValue}
      onChange={e => setLocalValue(e.target.value)}
      onBlur={() => onCommit(localValue)}
      className={`${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-stone-100' : ''}`}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
};

const ManagedTextArea: React.FC<ManagedInputProps> = ({ values, onCommit, className, placeholder }) => {
  const [localValue, setLocalValue] = useState(values ? values.join('\n') : '');
  useEffect(() => { setLocalValue(values ? values.join('\n') : ''); }, [values]);
  return (
    <textarea 
      value={localValue}
      onChange={e => setLocalValue(e.target.value)}
      onBlur={() => onCommit(localValue)}
      className={className}
      placeholder={placeholder}
    />
  );
};

interface ManagedTextInputProps {
  value: string;
  onCommit: (val: string) => void;
  className?: string;
  placeholder?: string;
}

const ManagedTextInput: React.FC<ManagedTextInputProps> = ({ value, onCommit, className, placeholder }) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value); }, [value]);
  return (
    <textarea 
      value={localValue}
      onChange={e => setLocalValue(e.target.value)}
      onBlur={() => onCommit(localValue)}
      className={className}
      placeholder={placeholder}
    />
  );
};

const LessonForm: React.FC<LessonFormProps> = ({ initialLesson, activeGroup, onSave, onUpdateGroup }) => {
  const [formData, setFormData] = useState<Lesson>(() => {
    if (initialLesson) return initialLesson;
    const base = { ...emptyLesson, id: generateId() };
    if (activeGroup) {
      base.quickDrill = [...activeGroup.inventory.learnedSounds];
      base.hfwList = [...activeGroup.inventory.learnedHFW];
    }
    return base;
  });

  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showSyntaxGuide, setShowSyntaxGuide] = useState(false);
  const [usePart1ForPart6, setUsePart1ForPart6] = useState<boolean>(() => {
    if (!initialLesson) return true;
    return (!initialLesson.quickDrillReverse || initialLesson.quickDrillReverse.length === 0);
  });

  const [cipherPresets, setCipherPresets] = useState<CipherPreset[]>(() => {
    try {
      const saved = localStorage.getItem('wrs_cipher_presets_v3');
      return saved ? JSON.parse(saved) : DEFAULT_CIPHER_PRESETS;
    } catch(e) { return DEFAULT_CIPHER_PRESETS; }
  });
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [newPreset, setNewPreset] = useState<CipherPreset>({ label: '', pattern: '[]', desc: '' });
  const [showMagBoardBuilder, setShowMagBoardBuilder] = useState(false);
  const [cipherPatterns, setCipherPatterns] = useState<string[]>([]);
  const [isBulkCipherMode, setIsBulkCipherMode] = useState(false);
  const [bulkCipherText, setBulkCipherText] = useState('');

  useEffect(() => {
    if (formData.cipherWords && formData.cipherWords.length > 0) {
      setCipherPatterns(formData.cipherWords);
      setBulkCipherText(formData.cipherWords.join('\n'));
    } else {
      setCipherPatterns([]);
      setBulkCipherText('');
    }
  }, [formData.cipherWords]);

  const updateCipherFromPatterns = (newPatterns: string[]) => {
    setCipherPatterns(newPatterns);
    setFormData(prev => ({ ...prev, cipherWords: newPatterns }));
  };

  const handleBulkCipherSubmit = () => {
    const lines = bulkCipherText.split('\n').map(l => l.trim()).filter(Boolean);
    updateCipherFromPatterns(lines);
    setIsBulkCipherMode(false);
  };

  const insertPatternAtCursor = (idx: number, pattern: string) => {
    const newPatterns = [...cipherPatterns];
    // If no active index, add to a new one
    const targetIdx = idx === -1 ? newPatterns.length : idx;
    newPatterns[targetIdx] = (newPatterns[targetIdx] || '') + pattern;
    updateCipherFromPatterns(newPatterns);
  };

  const handleSyncToGroup = (field: 'quickDrill' | 'hfwList') => {
    if (!activeGroup || !onUpdateGroup) return;
    const currentInventory = { ...activeGroup.inventory };
    if (field === 'quickDrill') currentInventory.learnedSounds = [...formData.quickDrill];
    else currentInventory.learnedHFW = [...formData.hfwList];
    onUpdateGroup({ ...activeGroup, inventory: currentInventory });
    alert('Squad Inventory Updated!');
  };

  const updateField = (field: keyof Lesson, value: any) => { setFormData(prev => ({ ...prev, [field]: value })); };
  const handleArrayInput = (field: keyof Lesson, value: string) => { updateField(field, value.split(',').map(s => s.trim()).filter(Boolean)); };
  const handlePart6Input = (val: string) => { setFormData(prev => ({ ...prev, quickDrillReverse: val.split(',').map(s => s.trim()).filter(Boolean) })); };
  const togglePart6Redundancy = () => {
    setUsePart1ForPart6(prev => {
      const next = !prev;
      setFormData(curr => ({ ...curr, quickDrillReverse: next ? [] : [...curr.quickDrill] }));
      return next;
    });
  };

  const handleDictationInput = (subfield: keyof Lesson['dictation'], value: string) => {
    setFormData(prev => ({ ...prev, dictation: { ...prev.dictation, [subfield]: value.split(',').map(s => s.trim()).filter(Boolean) } }));
  };

  const handleWordCardsBulk = (realWords: string, nonsenseWords: string) => {
    const real = realWords.split(/,|\n/).map(s => s.trim()).filter(Boolean);
    const nonsense = nonsenseWords.split(/,|\n/).map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, wordCards: [...real.map(w => ({ id: generateId(), text: w, type: 'regular' as const })), ...nonsense.map(w => ({ id: generateId(), text: w, type: 'nonsense' as const }))] }));
  };

  const addSlide = () => setFormData(prev => ({ ...prev, slides: [...(prev.slides || []), { id: generateId(), title: '', content: '', type: 'word' }] }));
  const updateSlide = (id: string, field: keyof Slide, value: string) => setFormData(prev => ({ ...prev, slides: prev.slides.map(s => s.id === id ? { ...s, [field]: value } : s) }));
  const removeSlide = (id: string) => setFormData(prev => ({ ...prev, slides: prev.slides.filter(s => s.id !== id) }));
  
  const handleGoogleSlidesInput = (input: string) => {
    let url = input.trim();
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) url = `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`;
    updateField('googleSlidesUrl', url);
  };

  const handleSentences = (text: string) => updateField('sentences', text.split('\n').filter(l => l.trim().length > 0));
  const handleImport = () => {
    const parsed = parseLessonText(importText, formData.step, formData.substep);
    setFormData(prev => ({ ...prev, ...parsed }));
    setShowImport(false);
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `wrs_lesson_${formData.step}_${formData.substep}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try { const json = JSON.parse(event.target?.result as string); if (json.id && json.step) setFormData(json); else alert('Invalid format.'); } catch (err) { alert('Error parsing JSON'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  const loadSample = () => setFormData({ ...sampleLesson, id: generateId() });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ ...formData, title: `Step ${formData.step}.${formData.substep} Lesson` }); };
  const scrollToSection = (id: string) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const realWordsString = formData.wordCards.filter(c => c.type === 'regular').map(c => c.text).join(', ');
  const nonsenseWordsString = formData.wordCards.filter(c => c.type === 'nonsense').map(c => c.text).join(', ');

  return (
    <div className="flex gap-6 max-w-7xl mx-auto my-8 px-4">
      <div className="hidden lg:block w-64 flex-shrink-0">
         <div className="sticky top-8 bg-white rounded-xl shadow-lg border border-stone-200 p-4 max-h-[85vh] overflow-y-auto">
             <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 border-b pb-2">Navigation</div>
             <ul className="space-y-1">
               {LESSON_PARTS.slice(1).map((part) => (
                 <li key={part.id}>
                    <button onClick={() => scrollToSection(`section-${part.id}`)} className="w-full text-left px-3 py-2 rounded text-xs font-bold text-stone-600 hover:bg-stone-100 hover:text-red-800 transition-colors flex justify-between group">
                       <span>{part.title}</span>
                       {part.id === LessonPart.Part2 && formData.slides && formData.slides.length > 0 && <span className="bg-red-100 text-red-800 px-1.5 rounded-full text-[10px]">{formData.slides.length}</span>}
                    </button>
                 </li>
               ))}
             </ul>
         </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-[#fdf6e3] rounded-xl shadow-2xl border-t-8 border-stone-800 p-6 md:p-8">
      
      {showPrintPreview && <PrintableLesson lesson={formData} group={activeGroup} onClose={() => setShowPrintPreview(false)} />}
      {showImport && (
        <div className="fixed inset-0 z-[100] bg-stone-900/90 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-stone-100 p-4 border-b border-stone-200 flex justify-between items-center">
                 <h3 className="font-bold text-lg text-stone-800 flex items-center gap-2"><Import className="w-5 h-5 text-red-800" /> Smart Import</h3>
                 <button onClick={() => setShowImport(false)} className="text-stone-400 hover:text-stone-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                 <textarea value={importText} onChange={(e) => setImportText(e.target.value)} className="w-full h-96 p-4 border-2 border-stone-300 rounded focus:border-red-800 outline-none font-mono text-sm whitespace-pre" placeholder="Paste text here..." />
              </div>
              <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-3">
                 <button onClick={() => setShowImport(false)} className="px-4 py-2 rounded text-stone-600 hover:bg-stone-200 font-bold uppercase text-xs">Cancel</button>
                 <button onClick={handleImport} className="px-6 py-2 rounded bg-red-800 hover:bg-red-900 text-white font-bold uppercase text-xs shadow-lg flex items-center gap-2"><Sparkles className="w-4 h-4" /> Process Text</button>
              </div>
           </div>
        </div>
      )}
      
      {showMagBoardBuilder && (
         <div className="fixed inset-0 z-[100] bg-stone-900/95 backdrop-blur-sm flex flex-col">
            <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between border-b border-stone-700">
               <div>
                 <h3 className="text-xl font-bold font-serif flex items-center gap-2"><Grid3X3 className="w-6 h-6 text-red-500" /> Visual Slide Builder</h3>
                 <p className="text-xs text-stone-400">Build your word, then click the "+ Circle" button to add it as a new slide.</p>
               </div>
               <button onClick={() => setShowMagBoardBuilder(false)} className="bg-stone-800 hover:bg-stone-700 p-2 rounded-full text-white"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-hidden">
               <TeachConcepts lesson={formData} onUpdateLesson={(updated) => setFormData(updated)} initialMode="board" />
            </div>
         </div>
      )}

      {showPresetManager && (
         <div className="fixed inset-0 z-[100] bg-stone-900/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
               <div className="bg-stone-100 p-4 border-b border-stone-200 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-stone-800 flex items-center gap-2"><Settings className="w-5 h-5 text-red-800" /> Manage Quick Insert</h3>
                  <button onClick={() => setShowPresetManager(false)} className="text-stone-400 hover:text-stone-800"><X className="w-5 h-5" /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {cipherPresets.map((preset, idx) => (
                     <div key={idx} className="flex items-center gap-3 bg-stone-50 border border-stone-200 p-3 rounded group hover:bg-white hover:shadow-sm transition-all">
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-stone-800">{preset.label}</span>
                              <code className="bg-stone-200 text-stone-600 px-1 rounded text-xs">{preset.pattern}</code>
                           </div>
                           <p className="text-xs text-stone-500 truncate">{preset.desc}</p>
                        </div>
                        <button onClick={() => { setCipherPresets(cipherPresets.filter((_, i) => i !== idx)); localStorage.setItem('wrs_cipher_presets_v3', JSON.stringify(cipherPresets.filter((_, i) => i !== idx))); }} className="text-stone-300 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                     </div>
                  ))}
               </div>
               <div className="p-4 bg-stone-50 border-t border-stone-200">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                     <input className="p-2 border border-stone-300 rounded text-sm" placeholder="Label" value={newPreset.label} onChange={e => setNewPreset(prev => ({ ...prev, label: e.target.value }))} />
                     <input className="p-2 border border-stone-300 rounded text-sm font-mono" placeholder="Pattern" value={newPreset.pattern} onChange={e => setNewPreset(prev => ({ ...prev, pattern: e.target.value }))} />
                  </div>
                  <div className="flex gap-2">
                     <input className="flex-1 p-2 border border-stone-300 rounded text-sm" placeholder="Description" value={newPreset.desc} onChange={e => setNewPreset(prev => ({ ...prev, desc: e.target.value }))} />
                     <button onClick={() => { setCipherPresets([...cipherPresets, newPreset]); localStorage.setItem('wrs_cipher_presets_v3', JSON.stringify([...cipherPresets, newPreset])); setNewPreset({ label: '', pattern: '', desc: '' }); }} className="bg-red-800 text-white px-4 rounded font-bold uppercase text-xs">Add</button>
                  </div>
               </div>
               <div className="p-3 bg-stone-200 border-t border-stone-300 flex justify-end">
                  <button onClick={() => setShowPresetManager(false)} className="bg-stone-800 text-white px-4 py-2 rounded text-xs font-bold uppercase hover:bg-stone-700">Done</button>
               </div>
            </div>
         </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b-2 border-stone-300 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-900 flex items-center gap-3 font-serif"><Scroll className="w-8 h-8 text-red-800" />Lesson Pathway</h2>
          {activeGroup && <p className="text-red-800 font-bold italic text-sm mt-1 flex items-center gap-2"><Users className="w-4 h-4" />Preparing for: {activeGroup.name}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
          <button onClick={loadSample} className="flex items-center gap-2 text-stone-700 hover:text-red-900 px-3 py-2 rounded-lg border border-stone-300 bg-white shadow-sm text-sm font-bold transition-all"><Sparkles className="w-4 h-4" />Demo Scroll</button>
          <button onClick={triggerFileInput} className="flex items-center gap-2 text-stone-600 hover:text-stone-900 px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm font-medium"><FolderOpen className="w-4 h-4" />Open</button>
          <button onClick={handleDownload} className="flex items-center gap-2 text-stone-600 hover:text-stone-900 px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm font-medium"><Download className="w-4 h-4" />Save</button>
          <button onClick={() => setShowPrintPreview(true)} className="flex items-center gap-2 text-stone-600 hover:text-stone-900 px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm font-medium"><Printer className="w-4 h-4" />Print</button>
          <div className="w-px h-8 bg-stone-300 mx-1 hidden md:block" />
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 text-stone-600 hover:text-stone-900 px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm font-medium"><Import className="w-4 h-4" />Import Text</button>
          <button onClick={handleSubmit} className="flex items-center gap-2 bg-red-800 text-[#fdf6e3] px-6 py-2 rounded-lg hover:bg-red-900 transition-all shadow-md font-bold uppercase tracking-wider"><MonitorPlay className="w-4 h-4" />Begin Mission</button>
        </div>
      </div>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded border border-stone-200 shadow-sm">
          <div><label className="block text-sm font-bold text-stone-700 mb-1 uppercase tracking-wide">Step</label><input type="text" value={formData.step} onChange={e => updateField('step', e.target.value)} className="w-full border border-stone-300 rounded-md p-2 focus:ring-2 focus:ring-red-800 outline-none bg-stone-50" /></div>
          <div><label className="block text-sm font-bold text-stone-700 mb-1 uppercase tracking-wide">Substep</label><input type="text" value={formData.substep} onChange={e => updateField('substep', e.target.value)} className="w-full border border-stone-300 rounded-md p-2 focus:ring-2 focus:ring-red-800 outline-none bg-stone-50" /></div>
        </section>

        <section id="section-1" className="bg-white p-6 rounded border border-stone-200 shadow-sm relative scroll-mt-24">
          <div className="flex justify-between items-center mb-2"><label className="block text-sm font-bold text-stone-700 uppercase tracking-wide">Part 1: Quick Drill Sounds</label>{activeGroup && <button type="button" onClick={() => handleSyncToGroup('quickDrill')} className="text-xs text-stone-500 hover:text-red-800 flex items-center gap-1 font-bold uppercase"><RefreshCw className="w-3 h-3" /> Sync to Inventory</button>}</div>
          <ManagedStringArrayInput values={formData.quickDrill} onCommit={(val) => handleArrayInput('quickDrill', val)} className="w-full border border-stone-300 rounded-md p-3 focus:ring-2 focus:ring-red-800 outline-none bg-stone-50 font-mono text-sm" placeholder="e.g., a, b, sh, ch, all, ing" />
        </section>

        <section id="section-2" className="bg-stone-50 p-6 rounded-lg border border-stone-200 scroll-mt-24">
          <div className="flex items-center justify-between mb-4"><label className="text-lg font-bold text-stone-800 flex items-center gap-2 font-serif"><MonitorPlay className="w-5 h-5 text-red-800" />Part 2: Teach Concepts (Reading)</label><button type="button" onClick={() => setShowMagBoardBuilder(true)} className="bg-stone-800 text-white px-4 py-2 rounded shadow hover:bg-red-900 transition-colors text-xs font-bold uppercase flex items-center gap-2"><Grid3X3 className="w-4 h-4" /> Open Mag Board Builder</button></div>
          <div className="mb-6"><label className="block text-sm font-bold text-stone-600 mb-1">Teacher Notes</label><textarea value={formData.conceptNotes} onChange={e => updateField('conceptNotes', e.target.value)} className="w-full border border-stone-300 rounded-md p-2 h-20 focus:ring-2 focus:ring-red-800 outline-none text-sm bg-white" placeholder="Notes for the Magnetic Board session..." /></div>
          <div className="mb-6 bg-white p-4 rounded border border-stone-300"><div className="flex items-center gap-2 mb-2 text-stone-800 font-bold"><Presentation className="w-5 h-5" />Google Slides Integration</div><label className="block text-xs text-stone-500 mb-2">Paste a Google Slides URL to embed a deck.</label><input type="text" value={formData.googleSlidesUrl || ''} onChange={e => handleGoogleSlidesInput(e.target.value)} className="w-full border border-stone-300 rounded-md p-2 focus:ring-2 focus:ring-red-800 outline-none text-sm bg-white text-stone-900 placeholder-stone-400" placeholder="https://docs.google.com/presentation/d/..." /></div>
          {!formData.googleSlidesUrl && (
            <div className="space-y-4 border-t border-stone-300 pt-4">
              <div className="flex justify-between items-center"><label className="block text-sm font-bold text-stone-700">Manual Slide Builder</label><button type="button" onClick={addSlide} className="text-sm bg-stone-800 text-white px-3 py-1.5 rounded-md hover:bg-stone-900 font-medium flex items-center gap-1"><Plus className="w-4 h-4" /> Add Slide</button></div>
              <div className="grid gap-4">
                {formData.slides?.map((slide, index) => (
                  <div key={slide.id} className="bg-white p-4 rounded-lg border border-stone-300 shadow-sm animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Slide {index + 1}</span><button type="button" onClick={() => removeSlide(slide.id)} className="text-stone-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></div>
                    <div className="grid md:grid-cols-12 gap-4">
                      <div className="md:col-span-8 space-y-3">
                        <input type="text" value={slide.title} onChange={e => updateSlide(slide.id, 'title', e.target.value)} placeholder="Slide Title (Optional)" className="w-full border-b border-stone-200 p-2 font-serif font-bold text-stone-800 focus:border-red-800 outline-none" />
                        {slide.type === 'word' ? (
                          <div className="space-y-1">
                             <div className="flex items-center gap-2"><input type="text" value={slide.content} onChange={e => updateSlide(slide.id, 'content', e.target.value)} placeholder="Enter word" className="flex-1 border border-stone-300 rounded p-3 text-lg focus:border-red-800 outline-none bg-stone-50 font-bold" /><button type="button" onClick={() => setShowSyntaxGuide(!showSyntaxGuide)} className={`p-3 rounded border transition-colors ${showSyntaxGuide ? 'bg-stone-200 border-stone-400 text-stone-900' : 'bg-white border-stone-200 text-stone-400 hover:text-stone-700'}`}><HelpCircle className="w-5 h-5" /></button></div>
                             {showSyntaxGuide && <div className="mt-2 p-3 bg-stone-100 rounded border border-stone-200 text-xs text-stone-600 grid grid-cols-2 md:grid-cols-3 gap-2"><div className="flex items-center gap-2"><span className="font-bold bg-white border px-1 rounded">|val| |ley|</span> <span>Syllable</span></div><div className="flex items-center gap-2"><span className="font-bold bg-yellow-100 border border-yellow-300 px-1 rounded">&lt;ing&gt;</span> <span>Suffix</span></div><div className="flex items-center gap-2"><span className="font-bold bg-green-100 border border-green-300 px-1 rounded">/ang/</span> <span>Welded</span></div><div className="flex items-center gap-2"><span className="font-bold bg-orange-100 border border-orange-300 px-1 rounded">[ea]</span> <span>Vowel</span></div><div className="flex items-center gap-2"><span className="font-bold bg-stone-50 border border-stone-300 px-1 rounded">{'{str}'}</span> <span>Consonant</span></div></div>}
                          </div>
                        ) : <textarea value={slide.content} onChange={e => updateSlide(slide.id, 'content', e.target.value)} placeholder={slide.type === 'image' ? "Enter Image URL..." : "Enter text..."} className="w-full border border-stone-300 rounded p-2 text-sm h-24 focus:border-red-800 outline-none resize-none bg-stone-50" />}
                      </div>
                      <div className="md:col-span-4 flex flex-col gap-2"><label className="text-xs text-stone-500 font-bold uppercase">Slide Type</label><div className="flex gap-2"><button type="button" onClick={() => updateSlide(slide.id, 'type', 'word')} className={`flex-1 py-2 rounded border flex flex-col items-center justify-center gap-1 text-xs ${slide.type === 'word' ? 'bg-stone-200 border-stone-400 text-stone-900 font-bold' : 'bg-white border-stone-200 text-stone-500'}`}><LayoutTemplate className="w-4 h-4" /> Word</button><button type="button" onClick={() => updateSlide(slide.id, 'type', 'text')} className={`flex-1 py-2 rounded border flex flex-col items-center justify-center gap-1 text-xs ${slide.type === 'text' ? 'bg-stone-200 border-stone-400 text-stone-900 font-bold' : 'bg-white border-stone-200 text-stone-500'}`}><Type className="w-4 h-4" /> Text</button><button type="button" onClick={() => updateSlide(slide.id, 'type', 'image')} className={`flex-1 py-2 rounded border flex flex-col items-center justify-center gap-1 text-xs ${slide.type === 'image' ? 'bg-stone-200 border-stone-400 text-stone-900 font-bold' : 'bg-white border-stone-200 text-stone-500'}`}><ImageIcon className="w-4 h-4" /> Image</button></div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section id="section-3" className="bg-white p-6 rounded border border-stone-200 shadow-sm scroll-mt-24">
          <div className="mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-red-800" /><label className="block text-sm font-bold text-stone-700 uppercase tracking-wide">Part 3: Word Cards</label></div>
          <div className="grid md:grid-cols-2 gap-6">
            <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wide">Real Words</label><ManagedTextInput value={realWordsString} onCommit={(val) => handleWordCardsBulk(val, nonsenseWordsString)} placeholder="cat, ship" className="w-full h-32 border border-stone-300 rounded p-3 focus:ring-2 focus:ring-red-800 outline-none bg-stone-50 font-medium text-sm" /></div>
            <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wide">Nonsense</label><ManagedTextInput value={nonsenseWordsString} onCommit={(val) => handleWordCardsBulk(realWordsString, val)} placeholder="zib, vosh" className="w-full h-32 border border-stone-300 rounded p-3 focus:ring-2 focus:ring-red-800 outline-none bg-stone-50 font-medium text-sm" /></div>
          </div>
        </section>

        <section id="section-4" className={`p-6 rounded border border-stone-200 shadow-sm scroll-mt-24 ${formData.wordListReadingAuto ? 'bg-stone-50 opacity-90' : 'bg-white'}`}>
           <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><List className="w-5 h-5 text-red-800" /><label className="block text-sm font-bold text-stone-700 uppercase tracking-wide">Part 4: Wordlist Reading</label></div><div className="flex items-center gap-2"><input type="checkbox" id="p4-auto" checked={formData.wordListReadingAuto ?? true} onChange={() => setFormData(prev => ({ ...prev, wordListReadingAuto: !prev.wordListReadingAuto }))} className="w-4 h-4 text-red-800" /><label htmlFor="p4-auto" className="text-xs font-bold text-stone-600 uppercase cursor-pointer">Auto</label></div></div>
           {formData.wordListReadingAuto ? <p className="text-sm text-stone-600 bg-white p-3 rounded border border-stone-200 font-bold">✓ Using Word Cards from Part 3.</p> : <div className="animate-in fade-in"><label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wide">Custom List</label><ManagedTextInput value={formData.wordListReading?.join('\n') || ''} onCommit={(val) => updateField('wordListReading', val.split(/,|\n/).map(s => s.trim()).filter(Boolean))} placeholder="Enter custom words..." className="w-full h-32 border border-stone-300 rounded p-3 outline-none bg-stone-50" /></div>}
        </section>

        <section id="section-5" className="bg-white p-6 rounded border border-stone-200 shadow-sm scroll-mt-24">
          <label className="block text-sm font-bold text-stone-700 mb-2 uppercase tracking-wide">Part 5: Sentences for Reading</label>
          <ManagedTextArea values={formData.sentences} onCommit={handleSentences} className="w-full border border-stone-300 rounded-md p-3 h-24 focus:ring-2 focus:ring-red-800 outline-none bg-stone-50 font-serif text-lg leading-relaxed" placeholder="The cat sat on the mat." />
        </section>

        <section id="section-6" className="bg-white p-6 rounded border border-stone-200 shadow-sm scroll-mt-24">
          <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-red-800" /><label className="block text-sm font-bold text-stone-700 uppercase tracking-wide">Part 6: Quick Drill (Rev)</label></div><div className="flex items-center gap-2"><input type="checkbox" id="p6-sync" checked={usePart1ForPart6} onChange={togglePart6Redundancy} className="w-4 h-4 text-red-800" /><label htmlFor="p6-sync" className="text-xs font-bold text-stone-600 uppercase cursor-pointer">Same as Part 1</label></div></div>
          <ManagedStringArrayInput values={formData.quickDrillReverse || []} onCommit={handlePart6Input} className="w-full border border-stone-300 rounded-md p-3 focus:ring-2 focus:ring-red-800 outline-none bg-stone-50 font-mono text-sm" placeholder={usePart1ForPart6 ? "Auto-synced" : "Custom list..."} disabled={usePart1ForPart6} />
        </section>

        <section id="section-7" className="bg-stone-100 p-6 rounded-lg border border-stone-300 scroll-mt-24">
          <label className="block text-lg font-bold text-stone-800 mb-4 flex items-center gap-2 font-serif"><Edit3 className="w-5 h-5 text-red-800" />Part 7: Teach Concepts (Spelling)</label>
          
          <div className="mb-6"><label className="block text-sm font-bold text-stone-600 mb-1">Teacher Notes</label><textarea value={formData.conceptNotes7 || ''} onChange={e => updateField('conceptNotes7', e.target.value)} className="w-full border border-stone-300 rounded-md p-2 h-20 outline-none text-sm bg-white" placeholder="Notes for Spelling concept..." /></div>

          <div className="bg-stone-900 rounded-xl p-6 border-b-4 border-stone-950 shadow-inner">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <div className="bg-red-900 p-2 rounded-lg"><Gamepad2 className="w-5 h-5 text-white" /></div>
                   <div>
                      <h4 className="text-[#fdf6e3] font-bold uppercase tracking-widest text-sm">Cipher Game Builder</h4>
                      <p className="text-stone-500 text-[10px] uppercase font-bold">Preparation for Part 7</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   <button type="button" onClick={() => setIsBulkCipherMode(!isBulkCipherMode)} className={`flex items-center gap-2 px-3 py-1.5 rounded font-bold uppercase text-[10px] transition-all ${isBulkCipherMode ? 'bg-purple-800 text-white' : 'bg-stone-800 text-stone-400 hover:text-white'}`}><ListPlus className="w-4 h-4" /> {isBulkCipherMode ? 'Return to List' : 'Bulk Entry'}</button>
                   {!isBulkCipherMode && <button type="button" onClick={() => updateCipherFromPatterns([...cipherPatterns, ''])} className="bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded font-bold uppercase text-[10px] flex items-center gap-1"><Plus className="w-4 h-4" /> Add Puzzle</button>}
                </div>
             </div>

             {isBulkCipherMode ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                   <div className="flex items-center gap-2 text-stone-500 text-[10px] uppercase font-bold mb-1"><Terminal className="w-3 h-3" /> Standard Syntax Terminal</div>
                   <textarea value={bulkCipherText} onChange={e => setBulkCipherText(e.target.value)} className="w-full h-64 bg-stone-950 text-emerald-500 font-mono p-4 border border-stone-700 rounded-lg outline-none focus:border-red-800 shadow-inner" placeholder={"/k/lap\nba ck/k/\nca tch/ch/"} />
                   <div className="flex justify-between items-center">
                      <p className="text-stone-500 text-[10px] italic">Paste list here. Use /k/, /ch/, etc. shorthand.</p>
                      <button type="button" onClick={handleBulkCipherSubmit} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded font-black uppercase text-xs shadow-lg">Process Bulk List</button>
                   </div>
                </div>
             ) : (
                <div className="space-y-4">
                   {/* Power-Tap Quick Bar */}
                   <div className="flex flex-wrap gap-2 p-3 bg-stone-950/50 rounded-lg border border-stone-800 mb-4 overflow-x-auto scrollbar-hide">
                      <span className="text-[10px] text-stone-500 font-black uppercase self-center mr-2 flex items-center gap-1"><Zap className="w-3 h-3" /> Quick Tap:</span>
                      {cipherPresets.map(preset => (
                         <button key={preset.label} type="button" onClick={() => insertPatternAtCursor(-1, preset.pattern)} className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-full text-[10px] font-bold border border-stone-700 whitespace-nowrap">{preset.label}</button>
                      ))}
                   </div>

                   <div className="grid grid-cols-1 gap-2">
                      {cipherPatterns.map((pattern, idx) => (
                         <div key={idx} className="flex gap-2 group animate-in slide-in-from-left-2">
                            <div className="bg-stone-800 text-stone-500 w-8 h-10 flex items-center justify-center font-bold rounded text-xs">{idx + 1}</div>
                            <input type="text" value={pattern} onChange={(e) => { const next = [...cipherPatterns]; next[idx] = e.target.value; updateCipherFromPatterns(next); }} className="flex-1 bg-stone-950 text-[#fdf6e3] font-mono p-2 rounded border border-stone-700 outline-none focus:border-red-800 text-sm" placeholder="e.g. /k/lap" />
                            <div className="relative group/wand">
                               <button type="button" className="p-2 border border-stone-700 rounded bg-stone-800 text-stone-500 hover:text-white"><Wand2 className="w-4 h-4" /></button>
                               <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-stone-200 shadow-2xl rounded-lg p-2 z-50 hidden group-hover/wand:block">
                                  {cipherPresets.map((p, pIdx) => ( <button key={pIdx} type="button" onClick={() => insertPatternAtCursor(idx, p.pattern)} className="w-full text-left px-2 py-1.5 hover:bg-blue-50 rounded text-xs flex justify-between items-center"><span className="font-mono font-bold text-blue-700">{p.pattern}</span><span className="text-stone-400">{p.label}</span></button> ))}
                                  <button type="button" onClick={() => setShowPresetManager(true)} className="w-full mt-2 pt-2 border-t text-xs font-bold text-stone-600 p-2 flex items-center gap-2"><Settings className="w-3 h-3" /> Settings</button>
                               </div>
                            </div>
                            <button type="button" onClick={() => updateCipherFromPatterns(cipherPatterns.filter((_, i) => i !== idx))} className="p-2 text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                         </div>
                      ))}
                      {cipherPatterns.length === 0 && <div className="p-8 border-2 border-dashed border-stone-800 rounded-xl text-center text-stone-600 text-xs italic">No puzzles. Use Bulk Entry or Add Puzzle.</div>}
                   </div>
                </div>
             )}
          </div>
        </section>

        <section id="section-8" className="bg-stone-100 p-6 rounded-lg border border-stone-300 space-y-6 scroll-mt-24">
          <label className="block text-lg font-bold text-stone-800 border-b border-stone-300 pb-2 font-serif">Part 8: Written Work (Dictation)</label>
          <div className="grid md:grid-cols-2 gap-6">
            <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wide">Sounds</label><ManagedStringArrayInput values={formData.dictation.sounds} onCommit={(val) => handleDictationInput('sounds', val)} className="w-full border border-stone-300 rounded p-2 text-sm bg-white" /></div>
            <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wide">Real Words</label><ManagedStringArrayInput values={formData.dictation.realWords} onCommit={(val) => handleDictationInput('realWords', val)} className="w-full border border-stone-300 rounded p-2 text-sm bg-white" /></div>
            <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wide">Elements</label><ManagedStringArrayInput values={formData.dictation.wordElements} onCommit={(val) => handleDictationInput('wordElements', val)} className="w-full border border-stone-300 rounded p-2 text-sm bg-white" /></div>
            <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wide">Nonsense</label><ManagedStringArrayInput values={formData.dictation.nonsenseWords} onCommit={(val) => handleDictationInput('nonsenseWords', val)} className="w-full border border-stone-300 rounded p-2 text-sm bg-white" /></div>
            <div className="md:col-span-2"><label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wide">Phrases</label><ManagedStringArrayInput values={formData.dictation.phrases} onCommit={(val) => handleDictationInput('phrases', val)} className="w-full border border-stone-300 rounded p-2 text-sm bg-white" /></div>
            <div className="md:col-span-2"><label className="block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wide">Sentences</label><ManagedTextArea values={formData.dictation.sentences} onCommit={(val) => setFormData(prev => ({ ...prev, dictation: { ...prev.dictation, sentences: val.split('\n').filter(Boolean) } }))} className="w-full border border-stone-300 rounded p-3 h-20 text-sm bg-white" /></div>
          </div>
        </section>

        <section id="section-9" className="bg-white p-6 rounded border border-stone-200 shadow-sm scroll-mt-24">
          <label className="block text-sm font-bold text-stone-700 mb-2 uppercase tracking-wide">Part 9: Passage Reading</label>
          <textarea value={formData.passage || ''} onChange={e => updateField('passage', e.target.value)} className="w-full border border-stone-300 rounded-md p-3 h-40 outline-none bg-stone-50 font-serif text-lg leading-relaxed" placeholder="The cat sat on the mat..." />
        </section>

        <section className="bg-white p-6 rounded border border-stone-200 shadow-sm">
           <div className="flex justify-between items-center mb-2"><label className="block text-sm font-bold text-stone-700 uppercase tracking-wide">HFW / Sight Words</label>{activeGroup && <button type="button" onClick={() => handleSyncToGroup('hfwList')} className="text-xs text-stone-500 hover:text-red-800 font-bold uppercase flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Sync</button>}</div>
           <ManagedStringArrayInput values={formData.hfwList} onCommit={(val) => handleArrayInput('hfwList', val)} className="w-full border border-stone-300 rounded-md p-3 outline-none bg-stone-50" />
        </section>
      </form>
      </div>
      </div>
    </div>
  );
};

export default LessonForm;