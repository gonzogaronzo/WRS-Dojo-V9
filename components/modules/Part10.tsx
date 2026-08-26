import React, { useMemo, useState } from 'react';
import { BookOpen, CheckCircle, Headphones, MessageCircle, PenLine } from 'lucide-react';
import { Part10Config } from '../../types';

interface Part10Props {
  config?: Part10Config;
  onComplete: () => void;
}

const taskLabels: Record<Part10Config['task'], string> = {
  'listening-comprehension': 'Listening Comprehension',
  'interactive-oral-reading': 'Interactive Oral Reading',
  'scaffolded-silent-reading': 'Scaffolded Silent Reading',
  'oral-fluency': 'Oral Fluency / Repeated Reading'
};

const Part10: React.FC<Part10Props> = ({ config, onComplete }) => {
  const fallback: Part10Config = useMemo(() => ({
    task: 'interactive-oral-reading',
    title: 'Teacher-selected read-along',
    source: 'Chosen immediately before class',
    teacherNotes: 'Use an accessible non-controlled readable text. Preview unfamiliar vocabulary as needed and keep the focus on fluent reading, meaning, and discussion.'
  }), []);

  const data = config || fallback;
  const [notes, setNotes] = useState('');

  return (
    <div className="h-full overflow-y-auto bg-[#fdf6e3] p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-stone-900 text-[#fdf6e3] rounded-2xl p-6 shadow-xl border-b-4 border-red-900">
          <div className="flex items-center gap-3 mb-2">
            <Headphones className="w-7 h-7 text-red-400" />
            <span className="text-xs font-black uppercase tracking-[0.25em] text-stone-400">Part 10</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold">{taskLabels[data.task]}</h1>
          <p className="mt-3 text-stone-300">{data.title || 'Teacher-selected read-along'}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <section className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-stone-800">
              <BookOpen className="w-5 h-5 text-red-800" />
              <h2 className="font-bold uppercase tracking-wide text-sm">Text for Today</h2>
            </div>
            <dl className="space-y-3 text-sm">
              <div><dt className="font-bold text-stone-500">Source</dt><dd className="text-stone-800">{data.source || 'Teacher selected before class'}</dd></div>
              <div><dt className="font-bold text-stone-500">Pages</dt><dd className="text-stone-800">{data.pages || 'Enter or note when selected'}</dd></div>
            </dl>
            {data.text && <div className="mt-4 whitespace-pre-wrap leading-relaxed text-stone-700 border-t pt-4">{data.text}</div>}
          </section>

          <section className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-stone-800">
              <MessageCircle className="w-5 h-5 text-red-800" />
              <h2 className="font-bold uppercase tracking-wide text-sm">Instructional Focus</h2>
            </div>
            <ul className="space-y-2 text-sm text-stone-700 list-disc pl-5">
              <li>Preview unfamiliar vocabulary only as needed.</li>
              <li>Support accurate, expressive reading and phrasing.</li>
              <li>Pause for meaning and mental representation.</li>
              <li>Use retell and comprehension discussion after reading.</li>
            </ul>
            {data.teacherNotes && <p className="mt-4 text-sm text-stone-600 border-t pt-4">{data.teacherNotes}</p>}
          </section>
        </div>

        {(data.vocabulary?.length || data.prompts?.length) && (
          <div className="grid md:grid-cols-2 gap-5">
            {data.vocabulary?.length ? (
              <section className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
                <h2 className="font-bold uppercase tracking-wide text-sm mb-3">Vocabulary</h2>
                <div className="flex flex-wrap gap-2">
                  {data.vocabulary.map(word => <span key={word} className="px-3 py-1.5 bg-stone-100 rounded-full text-sm font-semibold">{word}</span>)}
                </div>
              </section>
            ) : null}
            {data.prompts?.length ? (
              <section className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
                <h2 className="font-bold uppercase tracking-wide text-sm mb-3">Discussion Prompts</h2>
                <ol className="space-y-2 text-sm text-stone-700 list-decimal pl-5">
                  {data.prompts.map(prompt => <li key={prompt}>{prompt}</li>)}
                </ol>
              </section>
            ) : null}
          </div>
        )}

        <section className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <PenLine className="w-5 h-5 text-red-800" />
            <h2 className="font-bold uppercase tracking-wide text-sm">Teacher Notes</h2>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-28 border border-stone-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-800"
            placeholder="Quick fluency/comprehension note for today..."
          />
        </section>

        <div className="flex justify-end">
          <button onClick={onComplete} className="flex items-center gap-2 px-8 py-4 bg-stone-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-green-700 shadow-lg">
            <CheckCircle className="w-5 h-5" /> Complete Lesson
          </button>
        </div>
      </div>
    </div>
  );
};

export default Part10;
