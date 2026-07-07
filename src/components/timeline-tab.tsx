'use client';

import { useEffect, useState } from 'react';
import { RecordCard } from './record-card';
import { MOOD_LABELS } from '@/lib/moods';
import { TinyHeart } from './puppy-decoration';

interface LoveRecord {
  id: string;
  title: string;
  content: string;
  mood_tag: string;
  record_date: string;
  tags: string[];
  locations?: { id: string; name: string } | null;
  record_images?: Array<{ id: string; storage_key: string; template_style: string; url?: string }>;
}

export function TimelineTab() {
  const [records, setRecords] = useState<LoveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ mood: '', year: '', month: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchRecords = async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', '10');
      if (filter.mood) params.set('mood', filter.mood);
      if (filter.year) {
        const from = `${filter.year}-${filter.month || '01'}-01`;
        const to = filter.month
          ? `${filter.year}-${filter.month}-${new Date(parseInt(filter.year), parseInt(filter.month), 0).getDate()}`
          : `${filter.year}-12-31`;
        params.set('dateFrom', from);
        params.set('dateTo', to);
      }

      const res = await fetch(`/api/records?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRecords(json.data);
        setTotal(json.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(page);
  }, [page, filter]);

  const moods = MOOD_LABELS;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 筛选器 */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filter.mood}
          onChange={(e) => { setFilter((f) => ({ ...f, mood: e.target.value })); setPage(1); }}
          className="px-3 py-1.5 rounded-xl text-xs outline-none"
          style={{ backgroundColor: '#FFF8F0', border: '1px solid #E8D5C4', color: '#4A3728' }}
        >
          <option value="">全部心情</option>
          {moods.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={filter.year}
          onChange={(e) => { setFilter((f) => ({ ...f, year: e.target.value })); setPage(1); }}
          className="px-3 py-1.5 rounded-xl text-xs outline-none"
          style={{ backgroundColor: '#FFF8F0', border: '1px solid #E8D5C4', color: '#4A3728' }}
        >
          <option value="">全部年份</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}年</option>
          ))}
        </select>
      </div>

      {/* 时间线 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ backgroundColor: '#FFF8F0' }} />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12" style={{ color: '#A0846C' }}>
          <TinyHeart />
          <p className="text-sm mt-2">这个时间段还没有记录哦~</p>
        </div>
      ) : (
        <div className="relative">
          {/* 时间线竖线 */}
          <div
            className="absolute left-4 top-0 bottom-0 w-0.5"
            style={{ backgroundColor: '#F2C9C9' }}
          />
          <div className="space-y-4">
            {records.map((record, idx) => (
              <div key={record.id} className="flex gap-3 animate-fade-in" style={{ animationDelay: `${idx * 80}ms` }}>
                {/* 时间线圆点 */}
                <div className="relative z-10 flex-shrink-0 mt-4">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#C4956A', border: '2px solid #FEFAF5' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <RecordCard record={record} showImages={true} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 分页 */}
      {total > 10 && (
        <div className="flex justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-xl text-xs disabled:opacity-30"
            style={{ backgroundColor: '#FFF8F0', color: '#C4956A' }}
          >
            上一页
          </button>
          <span className="px-3 py-1.5 text-xs" style={{ color: '#A0846C' }}>
            {page} / {Math.ceil(total / 10)}
          </span>
          <button
            disabled={page >= Math.ceil(total / 10)}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-xl text-xs disabled:opacity-30"
            style={{ backgroundColor: '#FFF8F0', color: '#C4956A' }}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
