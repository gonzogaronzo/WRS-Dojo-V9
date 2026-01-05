
export interface WordCard {
  id: string;
  text: string;
  type: 'regular' | 'nonsense' | 'hfw';
}

export interface AffixEntry {
  id: string;
  text: string;
  type: 'root' | 'prefix' | 'suffix';
  examples: string;
}

export interface DictationSection {
  sounds: string[];
  realWords: string[];
  wordElements: string[];
  nonsenseWords: string[];
  phrases: string[];
  sentences: string[];
}

export interface Slide {
  id: string;
  type: 'text' | 'image' | 'word';
  title: string;
  content: string; 
}

export interface Lesson {
  id: string;
  title: string; 
  step: string;
  substep: string;
  conceptNotes: string;
  conceptNotes7?: string; 
  cipherWords?: string[]; 
  cipherDistractors?: string[];
  googleSlidesUrl?: string;
  slides: Slide[];
  quickDrill: string[];
  quickDrillReverse?: string[];
  wordCards: WordCard[];
  wordListReading?: string[];
  wordListReadingAuto?: boolean;
  sentences: string[];
  dictation: DictationSection;
  hfwList: string[];
  affixPractice: AffixEntry[];
  passage?: string;
  lastUpdated?: string;
}

export interface LessonHistoryEntry {
  id: string;
  lessonId: string;
  title: string;
  date: string;
  studentIds: string[];
  notes?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  masteredSounds: string[];
  masteredHFW: string[];
  attendanceCount: number;
  lastSeen?: string;
  notes: string;
  history: { date: string; lessonTitle: string; step: string }[]; // Individual log
}

export interface GroupProfile {
  id: string;
  name: string;
  studentIds: string[]; 
  inventory: {
    learnedSounds: string[];
    learnedHFW: string[];
  };
  lastLessonDate?: string;
  jobs?: Record<string, string>;
  savedLessons: Lesson[];
  history: LessonHistoryEntry[];
}

export interface DojoMasterData {
  groups: GroupProfile[];
  students: StudentProfile[];
  cipherPresets: any[];
  activeSession?: {
    lesson: Lesson;
    currentPart: number;
    groupId: string;
    studentIds: string[];
  };
}

export enum LessonPart {
  Briefing = 0,
  Part1 = 1,
  Part2 = 2,
  Part3 = 3,
  Part4 = 4,
  Part5 = 5,
  Part6 = 6,
  Part7 = 7,
  Part8 = 8,
  Part9 = 9,
  Part10 = 10
}

export const LESSON_PARTS = [
  { id: LessonPart.Briefing, title: "0. Mission Briefing", icon: "Map" },
  { id: LessonPart.Part1, title: "1. Quick Drill (Sounds)", icon: "Grid" },
  { id: LessonPart.Part2, title: "2. Teach Concepts (Reading)", icon: "BookOpen" },
  { id: LessonPart.Part3, title: "3. Word Cards", icon: "Layers" },
  { id: LessonPart.Part4, title: "4. Wordlist Reading", icon: "List" },
  { id: LessonPart.Part5, title: "5. Sentence Reading", icon: "AlignLeft" },
  { id: LessonPart.Part6, title: "6. Quick Drill (Rev)", icon: "RotateCcw" },
  { id: LessonPart.Part7, title: "7. Teach Concepts (Spelling)", icon: "Edit3" },
  { id: LessonPart.Part8, title: "8. Written Work (Dictation)", icon: "PenTool" },
  { id: LessonPart.Part9, title: "9. Passage Reading", icon: "FileText" },
  { id: LessonPart.Part10, title: "10. Listening Comp", icon: "Headphones" },
];
