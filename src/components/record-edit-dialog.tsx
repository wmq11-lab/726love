'use client';

import { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { MOOD_OPTIONS } from '@/lib/moods';

interface LoveRecord {
  id: string;
  title: string;
  content: string;
  mood_tag: string;
  record_date: string;
}

interface RecordEditDialogProps {
  record: LoveRecord;
  onClose: () => void;
  onSaved: (updated: LoveRecord) => void;
}

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function RecordEditDialog({ record, onClose, onSaved }: RecordEditDialogProps) {
  const [content, setContent] = useState(record.content || '');
  const [moodTag, setMoodTag] = useState(record.mood_tag || '日常');
  const [recordDateTime, setRecordDateTime] = useState(toDatetimeLocalValue(record.record_date));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const title = content.trim()
        ? content.trim().slice(0, 20) + (content.trim().length > 20 ? '...' : '')
        : '无题';

      const res = await fetch(`/api/records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: content.trim(),
          mood_tag: moodTag,
          record_date: new Date(recordDateTime).toISOString(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        alert('保存失败: ' + json.error);
        return;
      }
      onSaved(json.data);
    } catch (err) {
      alert('保存失败: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(74,55,40,0.35)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col"
        style={{ backgroundColor: '#FFF8F0', border: '1.5px solid #F2C9C9' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #F0E3D5' }}>
          <h3 className="text-base tracking-wide" style={{ fontFamily: "'ZCOOL KuaiLe', sans-serif", color: '#C4956A' }}>
            编辑记忆
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#FFFFFF', color: '#A0846C' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} style={{ color: '#C4956A' }} />
              <span className="text-xs font-medium" style={{ color: '#4A3728' }}>记忆日期</span>
            </div>
            <input
              type="datetime-local"
              value={recordDateTime}
              onChange={(e) => setRecordDateTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4', color: '#4A3728' }}
            />
          </div>

          <div>
            <p className="text-xs mb-2 font-medium" style={{ color: '#4A3728' }}>文字内容</p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写下想说的话..."
              rows={5}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{
                backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4', color: '#4A3728',
                fontFamily: "'Noto Serif SC', serif", lineHeight: '1.8',
              }}
            />
          </div>

          <div>
            <p className="text-xs mb-2 font-medium" style={{ color: '#4A3728' }}>此刻心情</p>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => setMoodTag(m.label)}
                  className="px-2.5 py-1.5 rounded-full text-xs transition-all"
                  style={{
                    backgroundColor: moodTag === m.label ? '#C4956A' : '#FFFFFF',
                    color: moodTag === m.label ? '#FFFFFF' : '#4A3728',
                    border: `1px solid ${moodTag === m.label ? '#C4956A' : '#E8D5C4'}`,
                  }}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 flex gap-3" style={{ borderTop: '1px solid #F0E3D5' }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: '#FFFFFF', color: '#A0846C', border: '1px solid #E8D5C4' }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#C4956A', color: '#FFFFFF' }}
          >
            {saving ? '保存中...' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  );
}
