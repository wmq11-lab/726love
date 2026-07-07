'use client';

import { useEffect, useState } from 'react';
import { PuppyDecoration, PawPrints } from './puppy-decoration';
import { getMoodEmoji } from '@/lib/moods';

interface MoodStat {
  mood: string;
  count: number;
  percent: number;
}

interface TopLocation {
  id: string;
  name: string;
  count: number;
}

interface HighlightPhoto {
  id: string;
  url: string;
  record_id: string;
}

interface ReportData {
  periodLabel: string;
  togetherDays: number;
  totalRecords: number;
  periodRecordCount: number;
  moodStats: MoodStat[];
  topMood: string;
  topMoodPercent: number;
  topLocations: TopLocation[];
  highlightPhotos: HighlightPhoto[];
}

type Period = 'month' | 'year';

export function LoveReportSection() {
  const [period, setPeriod] = useState<Period>('month');
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipKey, setFlipKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    const now = new Date();
    const params = new URLSearchParams({
      period,
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1),
    });
    fetch(`/api/report/love?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setReport(json.data);
          setFlipKey((k) => k + 1);
        }
      })
      .finally(() => setLoading(false));
  }, [period]);

  if (loading && !report) {
    return <div className="h-40 rounded-2xl animate-pulse" style={{ backgroundColor: '#FFF8F0' }} />;
  }

  if (!report) return null;

  const cards = [
    {
      title: '时间账本',
      icon: '📅',
      content: (
        <div className="space-y-1">
          <p className="text-2xl font-bold" style={{ color: '#C4956A', fontFamily: "'ZCOOL KuaiLe', sans-serif" }}>
            第 {report.togetherDays} 天
          </p>
          <p className="text-xs" style={{ color: '#A0846C' }}>
            自 2023.7.26 在一起 · 共 {report.totalRecords} 条记忆
          </p>
          <p className="text-xs" style={{ color: '#A0846C' }}>
            {report.periodLabel} 新增 {report.periodRecordCount} 条
          </p>
        </div>
      ),
    },
    {
      title: '心情风味',
      icon: '💕',
      content: (
        <div className="space-y-2">
          <p className="text-sm" style={{ color: '#4A3728' }}>
            {report.periodLabel}「{report.topMood}」占比 {report.topMoodPercent}%
          </p>
          {report.moodStats.slice(0, 4).map((m) => (
            <div key={m.mood} className="flex items-center gap-2">
              <span className="text-xs w-12 truncate" style={{ color: '#4A3728' }}>
                {getMoodEmoji(m.mood)} {m.mood}
              </span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F0E3D5' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${m.percent}%`, backgroundColor: '#C4956A' }}
                />
              </div>
              <span className="text-[10px] w-8 text-right" style={{ color: '#A0846C' }}>{m.percent}%</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: '足迹地图',
      icon: '📍',
      content: report.topLocations.length > 0 ? (
        <ul className="space-y-2">
          {report.topLocations.map((loc, i) => (
            <li key={loc.id} className="flex items-center justify-between text-sm">
              <span style={{ color: '#4A3728' }}>
                <span className="mr-1" style={{ color: '#C4956A' }}>{i + 1}.</span>
                {loc.name}
              </span>
              <span className="text-xs" style={{ color: '#A0846C' }}>{loc.count} 次</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs" style={{ color: '#A0846C' }}>这个时段还没有标记地点~</p>
      ),
    },
  ];

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{ backgroundColor: '#FFF8F0', border: '1.5px solid #F2C9C9' }}
    >
      <div className="absolute top-2 right-3 opacity-15"><PawPrints /></div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PuppyDecoration variant="card" size={32} />
          <div>
            <h3
              className="text-base tracking-wide"
              style={{ fontFamily: "'ZCOOL KuaiLe', sans-serif", color: '#C4956A' }}
            >
              恋爱数据报告
            </h3>
            <p className="text-[10px]" style={{ color: '#A0846C' }}>小狗帮你翻账本 · {report.periodLabel}</p>
          </div>
        </div>
        <div className="flex rounded-xl overflow-hidden text-xs" style={{ border: '1px solid #E8D5C4' }}>
          {(['month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 transition-colors"
              style={{
                backgroundColor: period === p ? '#C4956A' : '#FFFFFF',
                color: period === p ? '#FFFFFF' : '#A0846C',
              }}
            >
              {p === 'month' ? '本月' : '本年'}
            </button>
          ))}
        </div>
      </div>

      <div key={flipKey} className="grid gap-3 md:grid-cols-3 mb-4">
        {cards.map((card, idx) => (
          <div
            key={card.title}
            className="report-flip-card rounded-xl p-3"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E8D5C4',
              animationDelay: `${idx * 100}ms`,
            }}
          >
            <p className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: '#C4956A' }}>
              {card.icon} {card.title}
            </p>
            {card.content}
          </div>
        ))}
      </div>

      {report.highlightPhotos.length > 0 && (
        <div>
          <p className="text-xs mb-2 font-medium" style={{ color: '#C4956A' }}>
            ✨ {period === 'year' ? '年度' : '本月'}精选九宫格
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {report.highlightPhotos.map((photo, idx) => (
              <a
                key={photo.id}
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                className="aspect-square rounded-lg overflow-hidden report-photo-pop"
                style={{ border: '1px solid #E8D5C4', animationDelay: `${idx * 50}ms` }}
              >
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
