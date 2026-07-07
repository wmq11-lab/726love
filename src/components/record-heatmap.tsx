'use client';

import { useEffect, useState, useMemo } from 'react';

interface RecordHeatmapProps {
  year: number;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function heatColor(count: number, max: number): string {
  if (count === 0) return '#F0E3D5';
  if (max <= 0) return '#F2C9C9';
  const t = count / max;
  if (t <= 0.25) return '#F2C9C9';
  if (t <= 0.5) return '#E8C4A8';
  if (t <= 0.75) return '#D4A574';
  return '#C4956A';
}

export function RecordHeatmap({ year, selectedDate, onSelectDate }: RecordHeatmapProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [maxCount, setMaxCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/records/heatmap?year=${year}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setCounts(json.data.counts);
          setMaxCount(json.data.maxCount);
        }
      })
      .finally(() => setLoading(false));
  }, [year]);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  if (loading) {
    return (
      <div className="h-32 rounded-2xl animate-pulse" style={{ backgroundColor: '#FFF8F0' }} />
    );
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{ backgroundColor: '#FFF8F0', border: '1.5px solid #F2C9C9' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm tracking-wide"
          style={{ fontFamily: "'ZCOOL KuaiLe', sans-serif", color: '#C4956A' }}
        >
          记录热力图 · {year} 年
        </h3>
        <div className="flex items-center gap-1 text-[10px]" style={{ color: '#A0846C' }}>
          <span>少</span>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <span
              key={t}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: heatColor(t === 0 ? 0 : Math.ceil(maxCount * t), maxCount) }}
            />
          ))}
          <span>多</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {months.map((month) => {
          const firstDay = new Date(year, month, 1);
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const startPad = firstDay.getDay();

          return (
            <div key={month}>
              <p className="text-[10px] mb-1 font-medium" style={{ color: '#A0846C' }}>
                {month + 1} 月
              </p>
              <div className="grid grid-cols-7 gap-0.5">
                {WEEKDAYS.map((w) => (
                  <span key={w} className="text-[8px] text-center" style={{ color: '#C4956A' }}>
                    {w}
                  </span>
                ))}
                {Array.from({ length: startPad }).map((_, i) => (
                  <span key={`pad-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, d) => {
                  const day = d + 1;
                  const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const count = counts[key] ?? 0;
                  const isSelected = selectedDate === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      title={count > 0 ? `${key}：${count} 条记忆` : key}
                      onClick={() => onSelectDate?.(key)}
                      className="aspect-square rounded-[3px] transition-transform hover:scale-110"
                      style={{
                        backgroundColor: heatColor(count, maxCount),
                        border: isSelected ? '2px solid #4A3728' : '1px solid transparent',
                        minWidth: 10,
                        minHeight: 10,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(counts).length === 0 && (
        <p className="text-xs text-center mt-2" style={{ color: '#A0846C' }}>
          {year} 年还没有记录，去「记录」Tab 写下第一条吧~
        </p>
      )}
    </div>
  );
}
