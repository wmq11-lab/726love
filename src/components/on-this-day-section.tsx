'use client';

import { useEffect, useState } from 'react';
import { PuppyDecoration } from './puppy-decoration';
import { getMoodEmoji } from '@/lib/moods';
import { RoleAvatar } from './role-avatar';

export interface OnThisDayRecord {
  id: string;
  content: string;
  mood_tag: string;
  role?: string;
  record_date: string;
  yearsAgo: number;
  locations?: { name: string } | null;
  record_images?: Array<{ id: string; url?: string }>;
}

interface OnThisDaySectionProps {
  onEdit?: (record: OnThisDayRecord) => void;
}

export function OnThisDaySection({ onEdit }: OnThisDaySectionProps) {
  const [groups, setGroups] = useState<OnThisDayRecord[]>([]);
  const [dateLabel, setDateLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    fetch('/api/records/on-this-day')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setGroups(json.data.groups);
          setDateLabel(json.data.dateLabel);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-28 rounded-2xl animate-pulse" style={{ backgroundColor: '#FFF8F0' }} />
    );
  }

  if (groups.length === 0) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden animate-fade-in"
      style={{ backgroundColor: '#FFF8F0', border: '1.5px solid #F2C9C9' }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <PuppyDecoration variant="card" size={36} />
          <div>
            <h3
              className="text-base tracking-wide"
              style={{ fontFamily: "'ZCOOL KuaiLe', sans-serif", color: '#C4956A' }}
            >
              历史上的今天
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#A0846C' }}>
              {dateLabel} · 小狗帮你翻到账本啦 🐾
            </p>
          </div>
        </div>
        <span className="text-xs" style={{ color: '#A0846C' }}>{expanded ? '收起' : '展开'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {groups.map((record, idx) => {
            const images = (record.record_images ?? []).filter((i) => i.url);
            return (
              <div
                key={record.id}
                className="rounded-xl p-3 animate-fade-in"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E8D5C4',
                  animationDelay: `${idx * 80}ms`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-sm font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#F2C9C9', color: '#4A3728' }}
                  >
                    {record.yearsAgo} 年前的今天
                  </span>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: '#A0846C' }}>
                    <RoleAvatar role={record.role || '王哥'} size={18} />
                    {getMoodEmoji(record.mood_tag)} {record.mood_tag}
                  </div>
                </div>

                {images.length > 0 && (
                  <div className={`grid gap-1 mb-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    {images.slice(0, 3).map((img) => (
                      <img
                        key={img.id}
                        src={img.url}
                        alt=""
                        className="w-full aspect-square object-cover rounded-lg"
                        style={{ border: '1px solid #F0E3D5' }}
                      />
                    ))}
                  </div>
                )}

                <p
                  className="text-sm leading-relaxed line-clamp-3"
                  style={{ color: '#4A3728', fontFamily: "'Noto Serif SC', serif" }}
                >
                  {record.content || '（无文字）'}
                </p>

                {record.locations?.name && (
                  <p className="text-[10px] mt-1" style={{ color: '#A0846C' }}>
                    📍 {record.locations.name}
                  </p>
                )}

                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(record)}
                    className="text-[10px] mt-2"
                    style={{ color: '#C4956A' }}
                  >
                    查看 / 编辑 →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
