

import { Lesson } from './types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export interface TileData {
  text: string;
  type: 'consonant' | 'vowel' | 'vowelTeam' | 'digraph' | 'welded' | 'suffix' | 'rControl' | 'prefix' | 'syllable' | 'space';
}

// Simplified logic to parse a word into tiles
// Prioritizes explicit overrides first, then standard WRS phoneme detection
export const parseWordToTiles = (word: string): TileData[] => {
  const tiles: TileData[] = [];
  let remaining = word; 

  // WRS-Standard Welded Sounds (Green Cards)
  const weldedSounds = [
    'all', 'am', 'an', 'ang', 'ing', 'ong', 'ung', 'ank', 'ink', 'onk', 'unk', 
    'ild', 'ind', 'old', 'ost', 'olt', 'ive'
  ];
  
  // Vowel Teams (Salmon Cards)
  const vowelTeams = [
    'eigh', 'igh',
    'ai', 'ay', 'ee', 'ea', 'ey', 'oi', 'oy', 'oa', 'oe', 'ow', 'ou', 'oo', 'ue', 'ew', 'au', 'aw', 'ie', 'ei', 'ui'
  ];
  
  // Digraphs & Trigraphs (Ivory Cards)
  const digraphs = ['sh', 'ch', 'th', 'wh', 'ck', 'ph', 'qu', 'wr', 'kn', 'gn', 'mb', 'tch', 'dge'];
  
  const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
  
  const rControlled = ['ar', 'or', 'er', 'ir', 'ur'];

  while (remaining.length > 0) {
    
    // --- 0. SPACE (Separator) ---
    if (remaining.startsWith(' ')) {
        tiles.push({ text: '', type: 'space' });
        remaining = remaining.slice(1);
        continue;
    }

    // --- 1. SYLLABLE CARD: |text| (White, large, no hyphens) ---
    // Matches |text| at start, allows empty or spaces now: | |
    const syllableMatch = remaining.match(/^\|([^|]*)\|/);
    if (syllableMatch) {
        tiles.push({ text: syllableMatch[1], type: 'syllable' });
        remaining = remaining.substring(syllableMatch[0].length);
        continue;
    }

    // --- 1.5. AFFIX OVERRIDE: <text> (Yellow) ---
    // Explicit Affix card wrapper
    if (remaining.startsWith('<')) {
        const close = remaining.indexOf('>');
        if (close !== -1) {
            tiles.push({ text: remaining.substring(1, close), type: 'suffix' }); // Reuse suffix type for Yellow color
            remaining = remaining.substring(close + 1);
            continue;
        }
    }

    // --- 2. SUFFIX: -text (Yellow, includes hyphen) ---
    // Matches -text at start (and either end of string or followed by space/separator)
    // We look for -text 
    const suffixMatch = remaining.match(/^-([a-zA-Z0-9]+)/);
    if (suffixMatch) {
        tiles.push({ text: suffixMatch[0], type: 'suffix' });
        remaining = remaining.substring(suffixMatch[0].length);
        continue;
    }

    // --- 3. PREFIX: text- (Yellow, includes hyphen) ---
    const prefixMatch = remaining.match(/^([a-zA-Z0-9]+)-/);
    if (prefixMatch) {
        tiles.push({ text: prefixMatch[0], type: 'prefix' });
        remaining = remaining.substring(prefixMatch[0].length);
        continue;
    }

    // --- 4. VOWEL OVERRIDE: [text] (Peach) ---
    if (remaining.startsWith('[')) {
        const close = remaining.indexOf(']');
        if (close !== -1) {
            tiles.push({ text: remaining.substring(1, close), type: 'vowel' });
            remaining = remaining.substring(close + 1);
            continue;
        }
    }

    // --- 5. CONSONANT OVERRIDE: {text} (Ivory) ---
    if (remaining.startsWith('{')) {
        const close = remaining.indexOf('}');
        if (close !== -1) {
            tiles.push({ text: remaining.substring(1, close), type: 'consonant' });
            remaining = remaining.substring(close + 1);
            continue;
        }
    }

    // --- 6. WELDED OVERRIDE: /text/ (Green) ---
    if (remaining.startsWith('/')) {
        const close = remaining.indexOf('/', 1); // search from index 1
        if (close !== -1) {
            tiles.push({ text: remaining.substring(1, close), type: 'welded' });
            remaining = remaining.substring(close + 1);
            continue;
        }
    }

    // --- AUTO PARSING (Standard Logic) ---
    const current = remaining.toLowerCase();
    let matched = false;

    // Check for Welded Sounds
    for (const welded of weldedSounds) {
      if (current.startsWith(welded)) {
        tiles.push({ text: remaining.substring(0, welded.length), type: 'welded' });
        remaining = remaining.slice(welded.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Check for Vowel Teams
    for (const vt of vowelTeams) {
      if (current.startsWith(vt)) {
        tiles.push({ text: remaining.substring(0, vt.length), type: 'vowelTeam' });
        remaining = remaining.slice(vt.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;
    
    // Check for R-Controlled
    for (const rc of rControlled) {
      if (current.startsWith(rc)) {
        tiles.push({ text: remaining.substring(0, rc.length), type: 'rControl' }); 
        remaining = remaining.slice(rc.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Check for Digraphs
    for (const digraph of digraphs) {
      if (current.startsWith(digraph)) {
        tiles.push({ text: remaining.substring(0, digraph.length), type: 'digraph' });
        remaining = remaining.slice(digraph.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Single Letters
    const char = remaining[0];
    const charLower = char.toLowerCase();
    if (vowels.includes(charLower)) {
      tiles.push({ text: char, type: 'vowel' });
    } else {
      // Default fallback
      tiles.push({ text: char, type: 'consonant' });
    }
    remaining = remaining.slice(1);
  }

  return tiles;
};

export const getTileColor = (type: TileData['type']): string => {
  // STRICT HEX CODES FROM DESIGN REPORT
  // Ivory: #FFF8E7
  // Peach: #FFD6B5
  // Green: #A6D785
  // Yellow: #FFF275
  
  switch (type) {
    case 'vowel': 
    case 'vowelTeam':
    case 'rControl':
      return 'bg-[#FFD6B5] border-[#EBC2A1] text-black'; // Peach
      
    case 'welded': 
      return 'bg-[#A6D785] border-[#95C674] text-black'; // Green
      
    case 'suffix': 
    case 'prefix':
      return 'bg-[#FFF275] border-[#EBE064] text-black'; // Yellow
    
    case 'syllable':
      return 'bg-white border-[#CCCCCC] text-black min-w-[5rem]'; // White Syllable Card
      
    case 'space':
      return 'bg-transparent border-transparent shadow-none'; // Invisible

    case 'digraph': 
    case 'consonant': 
    default:
      return 'bg-[#FFF8E7] border-[#E6DFC0] text-black'; // Ivory
  }
};

/**
 * CSV Parsing Helper
 * Splits a line by comma, respecting quoted strings.
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // Handle double quotes inside quotes "" -> "
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(s => s.trim().replace(/^"|"$/g, '').trim()); // Clean quotes
};

/**
 * Enhanced Text Parser for Google Docs / Copy-Paste / CSV
 * Robustly handles headers, lists, loose formatting, and CSV data.
 */
export const parseLessonText = (text: string, targetStep?: string, targetSubstep?: string): Partial<Lesson> => {
  const extracted: Partial<Lesson> = {
    dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
    quickDrill: [],
    hfwList: [],
    wordCards: [],
    sentences: []
  };

  // --- CSV DETECTOR ---
  // If the first line looks like a CSV header or starts with ",,"
  const lines = text.split('\n');
  const firstLine = lines[0].trim();
  const isCSV = firstLine.startsWith(',,') || (firstLine.includes(',') && lines.length > 2);

  if (isCSV) {
    // 1. Find Header Row
    // Usually row 0, but sometimes row 1 if pasted weirdly.
    const headerRow = parseCSVLine(firstLine);
    
    // Map headers to indices
    const indices: Record<string, number> = {};
    headerRow.forEach((h, i) => {
      const cleanH = h.toLowerCase().trim();
      indices[cleanH] = i;
    });

    // 2. Find Data Row based on Target Step/Substep
    let dataRow: string[] | null = null;
    const targetIdentifier = targetStep && targetSubstep ? `${targetStep}.${targetSubstep}` : null;
    
    // Start searching from row 1
    for (let i = 1; i < lines.length; i++) {
       const row = parseCSVLine(lines[i]);
       if (row.length < 2) continue; // Empty row

       // Check first column (often 1.1, 1.2) or "Lesson Plan" column
       const col0 = row[0]?.trim();
       const colLessonPlan = indices['lesson plan'] !== undefined ? row[indices['lesson plan']]?.trim() : '';

       if (targetIdentifier) {
          if (col0 === targetIdentifier || colLessonPlan.startsWith(targetIdentifier)) {
             dataRow = row;
             break;
          }
       } else {
          // If no target specified, just take the first valid data row
          if (col0 || colLessonPlan) {
             dataRow = row;
             break;
          }
       }
    }

    if (dataRow) {
       // --- EXTRACT FROM CSV ROW ---
       
       // Helper to get data by loosely matching header name
       const getCol = (possibleHeaders: string[]): string => {
         for (const h of possibleHeaders) {
            const idx = indices[h.toLowerCase()];
            if (idx !== undefined && dataRow![idx]) return dataRow![idx];
         }
         return '';
       };
       
       const getList = (possibleHeaders: string[]): string[] => {
          const raw = getCol(possibleHeaders);
          return raw ? raw.split(/,|\n/).map(s => s.trim()).filter(Boolean) : [];
       };

       // HFW
       extracted.hfwList = getList(['new sight words', 'sight words']);

       // Quick Drill (Sounds)
       // Usually in "New Sound Cards" or "PA Drill"
       extracted.quickDrill = getList(['new sound cards', 'pa drill', 'spelling sounds']);

       // Word Cards (Merge Vocab columns)
       const vocab1 = getList(['new vocab words']);
       const vocab2 = getList(['vocab from sentences']);
       const vocab3 = getList(['vocab from connected text']);
       const allVocab = [...vocab1, ...vocab2, ...vocab3];
       extracted.wordCards = allVocab.map(w => ({ id: generateId(), text: w, type: 'regular' }));

       // Sentences
       // Sometimes they are newline separated, sometimes comma? Usually newline/period in CSV cells.
       const rawSentences = getCol(['sentences', 'reading sentences']);
       if (rawSentences) {
          extracted.sentences = rawSentences.split('\n').map(s => s.trim()).filter(s => s.length > 5);
       }

       // Passage
       extracted.passage = getCol(['connected text', 'reader']);

       // Dictation
       // This is the tricky one. It might contain a full text block.
       const dictationText = getCol(['dictation']);
       if (dictationText) {
          // Recursively call the text parser on just this cell's content!
          const dictationData = parseLessonText(dictationText);
          if (dictationData.dictation) {
             extracted.dictation = dictationData.dictation;
          }
       }

       // Step/Substep (if not already set)
       if (!extracted.step && targetStep) extracted.step = targetStep;
       if (!extracted.substep && targetSubstep) extracted.substep = targetSubstep;
       
       return extracted;
    }
  }

  // --- STANDARD TEXT PARSER (Fallback or Recursive) ---

  // 1. Detect Step/Substep (e.g., "3.1" or "Step 3.1" or "3.1 Lesson")
  const stepMatch = text.match(/\bStep\s*(\d+)\.(\d+)\b/i) || text.match(/\b(\d+)\.(\d+)\b/);
  if (stepMatch) {
    extracted.step = stepMatch[1];
    extracted.substep = stepMatch[2];
  }

  // Helper: Strip bullets but PRESERVE numbering (we might need it for dictation)
  const cleanLine = (l: string) => {
    return l
      .trim()
      .replace(/^[-*•➢]\s+/, '')     // Bullets
      .replace(/[\[\]]/g, '')        // Checkboxes
      .replace(/\t/g, ' ');          // Table tabs to spaces
  };
  
  // Split into lines
  const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Helper to extract a list of items from a line
  const extractList = (str: string): string[] => {
    // If it has a colon separator "Sounds: a, b, c", grab the part after colon
    if (str.includes(':')) {
       str = str.split(/:(.+)/)[1] || '';
    }
    
    // Remove leading numbers "1. ", "2. "
    str = str.replace(/^\d+[\.)]\s*/, '');

    const candidates = str.split(/,|;|\t|\s{2,}/);
    return candidates
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.toLowerCase().includes('word count'));
  };

  let currentSection: 
    'none' | 'quickDrill' | 'hfw' | 'wordCards' | 'sentences' | 'dictation' | 'passage' 
    = 'none';

  // Dictation Sub-mode
  let dictationSubMode: 'none' | 'sounds' | 'real' | 'elements' | 'nonsense' | 'phrases' | 'sentences' = 'none';

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const line = cleanLine(rawLine); // Cleaned of bullets/tabs
    const lower = line.toLowerCase();

    // --- SECTION DETECTION HEADERS ---

    // Part 1: Quick Drill
    if (lower.includes('quick drill') || lower.includes('visual drill') || lower.includes('part 1')) {
      currentSection = 'quickDrill';
      const content = line.split(/:/)[1]; 
      if (content && content.trim()) {
         extracted.quickDrill = [...(extracted.quickDrill || []), ...extractList(content)];
      }
      continue;
    }

    // Part 3: Word Cards / Reading Words
    if (lower.includes('word cards') || lower.includes('word list') || lower.includes('part 3') || lower.includes('words for reading')) {
      currentSection = 'wordCards';
      const content = line.split(/:/)[1];
      if (content && content.trim()) {
         const words = extractList(content);
         const newCards = words.map(w => ({ id: generateId(), text: w, type: 'regular' as const }));
         extracted.wordCards = [...(extracted.wordCards || []), ...newCards];
      }
      continue;
    }

    // High Frequency Words
    if (lower.includes('sight words') || lower.includes('hfw') || lower.includes('high frequency')) {
       currentSection = 'hfw';
       const content = line.split(/:/)[1];
       if (content && content.trim()) {
         extracted.hfwList = [...(extracted.hfwList || []), ...extractList(content)];
       }
       continue;
    }

    // Part 5: Sentences (Reading)
    if (lower.includes('sentences for reading') || lower.includes('part 5') || lower.includes('reading sentences')) {
       currentSection = 'sentences';
       continue;
    }

    // Part 8: Dictation
    if (lower.includes('dictation') || lower.includes('part 8')) {
       currentSection = 'dictation';
       dictationSubMode = 'none'; 
       continue;
    }
    
    // Part 9: Passage
    if (lower.includes('passage') || lower.includes('story') || lower.includes('part 9')) {
       currentSection = 'passage';
       continue;
    }


    // --- CONTENT PARSING BASED ON SECTION ---

    if (currentSection === 'quickDrill') {
      if (!line.includes(':') && !line.toLowerCase().includes('part')) {
        extracted.quickDrill = [...(extracted.quickDrill || []), ...extractList(line)];
      }
    }

    else if (currentSection === 'hfw') {
       if (!line.includes(':')) {
         extracted.hfwList = [...(extracted.hfwList || []), ...extractList(line)];
       }
    }

    else if (currentSection === 'wordCards') {
       if (!line.includes(':')) {
          const words = extractList(line);
          const newCards = words.map(w => ({ id: generateId(), text: w, type: 'regular' as const }));
          extracted.wordCards = [...(extracted.wordCards || []), ...newCards];
       }
    }

    else if (currentSection === 'sentences') {
       // Just add the line if it looks like a sentence (has spaces, longer than 5 chars)
       if (line.length > 5 && line.includes(' ') && !lower.includes('part 6')) {
          extracted.sentences?.push(line);
       }
    }

    else if (currentSection === 'passage') {
       extracted.passage = (extracted.passage || '') + line + '\n\n';
    }

    else if (currentSection === 'dictation') {
       if (!extracted.dictation) continue;

       // DETECT DICTATION SUB-SECTIONS (Strict Order or Explicit Headers)
       
       let contentToProcess = line;
       let detectedSubMode = dictationSubMode;

       // Check Explicit Headers first
       // "Sound" or "Sounds:"
       if (lower.startsWith('sound') || lower.includes('sounds:') || lower.includes('sounds')) detectedSubMode = 'sounds';
       else if (lower.startsWith('real') || lower.includes('real words:') || lower.includes('words')) detectedSubMode = 'real';
       else if (lower.startsWith('element') || lower.includes('word elements:') || lower.includes('welded')) detectedSubMode = 'elements';
       else if (lower.startsWith('nonsense') || lower.includes('nonsense words:')) detectedSubMode = 'nonsense';
       else if (lower.startsWith('phrase') || lower.includes('phrases:')) detectedSubMode = 'phrases';
       else if (lower.startsWith('sentence') || lower.includes('sentences:')) detectedSubMode = 'sentences';

       // Check Numeric Headers (1. 2. 3. 4. 5. 6.) if explicit text failed
       // We use the rawLine to check for "1." before it was potentially stripped (though we were careful above)
       if (detectedSubMode === dictationSubMode) {
          if (rawLine.match(/^1[\.)]/)) detectedSubMode = 'sounds';
          else if (rawLine.match(/^2[\.)]/)) detectedSubMode = 'real';
          else if (rawLine.match(/^3[\.)]/)) detectedSubMode = 'elements';
          else if (rawLine.match(/^4[\.)]/)) detectedSubMode = 'nonsense';
          else if (rawLine.match(/^5[\.)]/)) detectedSubMode = 'phrases';
          else if (rawLine.match(/^6[\.)]/)) detectedSubMode = 'sentences';
       }
       
       // Update global state
       dictationSubMode = detectedSubMode;

       // Extract content (remove header parts if they exist)
       if (contentToProcess.includes(':')) {
          contentToProcess = contentToProcess.split(/:(.+)/)[1] || '';
       } else {
          // Remove leading numbers "1. "
          contentToProcess = contentToProcess.replace(/^\d+[\.)]\s*/, '');
       }

       if (contentToProcess && contentToProcess.trim()) {
           const items = extractList(contentToProcess);
           
           if (dictationSubMode === 'sounds') extracted.dictation.sounds.push(...items);
           else if (dictationSubMode === 'real') extracted.dictation.realWords.push(...items);
           else if (dictationSubMode === 'nonsense') extracted.dictation.nonsenseWords.push(...items);
           else if (dictationSubMode === 'elements') extracted.dictation.wordElements.push(...items);
           else if (dictationSubMode === 'phrases') extracted.dictation.phrases.push(...items);
           else if (dictationSubMode === 'sentences') {
              // For sentences, don't split by comma
              // Remove numbering like "1. " or "1) "
              const cleanSentence = contentToProcess.trim().replace(/^\d+[\.)]\s*/, '');
              // Ignore lines that are just headers
              if (cleanSentence.length > 5 && !cleanSentence.toLowerCase().includes('sentences')) {
                 extracted.dictation.sentences.push(cleanSentence);
              }
           }
       }
    }
  }

  return extracted;
};
