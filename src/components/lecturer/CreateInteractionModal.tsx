'use client';

import { useState } from 'react';
import { getInteractionIcon } from '@/lib/utils';

interface CreateInteractionModalProps {
  type: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function CreateInteractionModal({ type, isOpen, onClose, onSave }: CreateInteractionModalProps) {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<{ text: string; isCorrect: boolean }[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);
  const [config, setConfig] = useState({
    time_limit_seconds: 30,
    max_words_per_participant: 1,
    allow_anonymous_questions: true,
    ai_auto_answer_enabled: false,
    include_star_ratings: true,
    include_open_text: true,
  });
  const [saving, setSaving] = useState(false);
  const letters = 'ABCDEFGHIJ';

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) return alert('Please enter a title/question');
    setSaving(true);
    try {
      const data: any = { type, title, config };
      if (type === 'poll' || type === 'quiz') {
        const validOptions = options.filter(o => o.text.trim());
        if (validOptions.length < 2) {
          alert('Please add at least 2 options');
          setSaving(false);
          return;
        }
        data.options = validOptions.map(o => ({
          option_text: o.text,
          is_correct: o.isCorrect,
        }));
      }
      await onSave(data);
      setTitle('');
      setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }]);
      onClose();
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  };

  const addOption = () => setOptions([...options, { text: '', isCorrect: false }]);
  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const typeLabels: Record<string, string> = {
    poll: '📊 Create a Poll',
    quiz: '🧠 Create a Quiz Question',
    qa: '❓ Create a Q&A Session',
    word_cloud: '☁️ Create a Word Cloud',
    feedback: '⭐ Create a Feedback Form',
  };

  return (
    <div className="fixed inset-0 bg-black/45 z-[200] flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-[20px] p-8 max-w-[520px] w-[90%] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-5">{typeLabels[type] || 'Create interaction'}</h2>

        {/* Title / Question */}
        <div className="mb-4">
          <label className="text-[13px] font-semibold block mb-1.5">
            {type === 'qa' ? 'Session title' : type === 'word_cloud' ? 'Prompt / question' : type === 'feedback' ? 'Title' : 'Question'}
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={type === 'qa' ? 'e.g. Open Q&A – Week 3' : type === 'word_cloud' ? 'e.g. In ONE word, describe today\'s session' : 'Enter your question…'}
            className="w-full p-2.5 px-3.5 border-[1.5px] border-[#E2EBE6] rounded-[9px] text-sm outline-none focus:border-[#2D8A4E] transition"
          />
        </div>

        {/* Options for poll/quiz */}
        {(type === 'poll' || type === 'quiz') && (
          <div className="mb-4">
            <label className="text-[13px] font-semibold block mb-1.5">
              Options {type === 'quiz' && '(mark correct with ✓)'}
            </label>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={opt.text}
                  onChange={e => {
                    const copy = [...options];
                    copy[i].text = e.target.value;
                    setOptions(copy);
                  }}
                  placeholder={`Option ${letters[i]}`}
                  className="flex-1 p-2.5 px-3.5 border-[1.5px] border-[#E2EBE6] rounded-[9px] text-sm outline-none focus:border-[#2D8A4E]"
                />
                {type === 'quiz' && (
                  <button
                    onClick={() => {
                      const copy = [...options];
                      copy[i].isCorrect = !copy[i].isCorrect;
                      setOptions(copy);
                    }}
                    className={`px-3.5 py-2 border-[1.5px] rounded-[9px] text-[13px] font-semibold transition ${
                      opt.isCorrect
                        ? 'bg-[#EAF7EF] border-[#2D8A4E] text-[#2D8A4E]'
                        : 'border-[#E2EBE6] text-[#6B7B8D]'
                    }`}
                  >
                    ✓ Correct
                  </button>
                )}
                <button
                  onClick={() => removeOption(i)}
                  className="px-3.5 py-2 border-[1.5px] border-[#E2EBE6] rounded-[9px] text-[#6B7B8D] text-[15px] hover:border-red-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
            <button onClick={addOption} className="px-3.5 py-1.5 text-[13px] font-semibold border border-[#E2EBE6] rounded-[7px] mt-2 hover:border-[#2D8A4E] hover:text-[#2D8A4E] transition">
              + Add option
            </button>
          </div>
        )}

        {/* Quiz time limit */}
        {type === 'quiz' && (
          <div className="mb-4">
            <label className="text-[13px] font-semibold block mb-1.5">Time limit (seconds)</label>
            <select
              value={config.time_limit_seconds}
              onChange={e => setConfig({ ...config, time_limit_seconds: Number(e.target.value) })}
              className="w-full p-2.5 px-3.5 border-[1.5px] border-[#E2EBE6] rounded-[9px] text-sm"
            >
              <option value={30}>30</option>
              <option value={60}>60</option>
              <option value={90}>90</option>
              <option value={120}>120</option>
            </select>
          </div>
        )}

        {/* Word cloud max words */}
        {type === 'word_cloud' && (
          <div className="mb-4">
            <label className="text-[13px] font-semibold block mb-1.5">Max words per participant</label>
            <select
              value={config.max_words_per_participant}
              onChange={e => setConfig({ ...config, max_words_per_participant: Number(e.target.value) })}
              className="w-full p-2.5 px-3.5 border-[1.5px] border-[#E2EBE6] rounded-[9px] text-sm"
            >
              <option value={1}>1</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>
          </div>
        )}

        {/* Q&A settings */}
        {type === 'qa' && (
          <>
            <div className="mb-4">
              <label className="text-[13px] font-semibold block mb-1.5">Allow anonymous questions</label>
              <select
                value={config.allow_anonymous_questions ? 'yes' : 'no'}
                onChange={e => setConfig({ ...config, allow_anonymous_questions: e.target.value === 'yes' })}
                className="w-full p-2.5 px-3.5 border-[1.5px] border-[#E2EBE6] rounded-[9px] text-sm"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </>
        )}

        {/* Feedback settings */}
        {type === 'feedback' && (
          <>
            <div className="mb-4">
              <label className="text-[13px] font-semibold block mb-1.5">Include star ratings</label>
              <select
                value={config.include_star_ratings ? 'yes' : 'no'}
                onChange={e => setConfig({ ...config, include_star_ratings: e.target.value === 'yes' })}
                className="w-full p-2.5 px-3.5 border-[1.5px] border-[#E2EBE6] rounded-[9px] text-sm"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="text-[13px] font-semibold block mb-1.5">Include open text field</label>
              <select
                value={config.include_open_text ? 'yes' : 'no'}
                onChange={e => setConfig({ ...config, include_open_text: e.target.value === 'yes' })}
                className="w-full p-2.5 px-3.5 border-[1.5px] border-[#E2EBE6] rounded-[9px] text-sm"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </>
        )}

        <div className="flex gap-2.5 mt-6 justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-[9px] text-sm font-semibold border border-[#E2EBE6] hover:border-[#2D8A4E] transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-[9px] text-sm font-semibold bg-[#2D8A4E] text-white hover:bg-[#1A5C32] transition disabled:opacity-50"
          >
            {saving ? 'Creating…' : `Create ${type === 'qa' ? 'Q&A' : type === 'word_cloud' ? 'word cloud' : type} →`}
          </button>
        </div>
      </div>
    </div>
  );
}
