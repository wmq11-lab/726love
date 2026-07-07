'use client';

import { useEffect, useState } from 'react';
import { PawPrints, TinyHeart } from './puppy-decoration';
import { RecordCard } from './record-card';
import { RecordEditDialog } from './record-edit-dialog';
import { OnThisDaySection, type OnThisDayRecord } from './on-this-day-section';
import { LoveReportSection } from './love-report-section';
import { LoveMilestones } from './love-milestones';

interface LoveRecord {
  id: string;
  title: string;
  content: string;
  mood_tag: string;
  role?: string;
  record_date: string;
  tags: string[];
  locations?: { id: string; name: string } | null;
  record_images?: Array<{ id: string; storage_key: string; template_style: string; url?: string }>;
}

interface Anniversary {
  id: string;
  title: string;
  date: string;
  type: string;
  icon: string;
  description: string;
}

export function HomeTab() {
  const [recentRecords, setRecentRecords] = useState<LoveRecord[]>([]);
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [stats, setStats] = useState({ records: 0, locations: 0 });
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<LoveRecord | null>(null);

  const fetchData = async () => {
    try {
      const [recordsRes, anniRes, locRes] = await Promise.all([
        fetch('/api/records?limit=20'),
        fetch('/api/anniversaries'),
        fetch('/api/locations'),
      ]);
      const recordsJson = await recordsRes.json();
      const anniJson = await anniRes.json();
      const locJson = await locRes.json();

      if (recordsJson.success) setRecentRecords(recordsJson.data);
      if (anniJson.success) setAnniversaries(anniJson.data);

      setStats({
        records: recordsJson.total || recordsJson.data?.length || 0,
        locations: locJson.data?.length || 0,
      });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOnThisDayEdit = (record: OnThisDayRecord) => {
    const full = recentRecords.find((r) => r.id === record.id);
    setEditingRecord(full ?? {
      id: record.id,
      title: record.content?.slice(0, 20) || '无题',
      content: record.content,
      mood_tag: record.mood_tag,
      role: record.role,
      record_date: record.record_date,
      tags: [],
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记忆吗？删除后无法恢复。')) return;

    try {
      const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        alert('删除失败: ' + json.error);
        return;
      }
      setRecentRecords((prev) => prev.filter((r) => r.id !== id));
      setStats((prev) => ({ ...prev, records: Math.max(0, prev.records - 1) }));
      if (editingRecord?.id === id) setEditingRecord(null);
    } catch {
      alert('删除失败，请稍后重试');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ backgroundColor: '#FFF8F0' }} />
        ))}
      </div>
    );
  }

  const upcomingAnniversary = anniversaries
    .filter((a) => new Date(a.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const daysUntil = upcomingAnniversary
    ? Math.ceil((new Date(upcomingAnniversary.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 英雄横幅 */}
      <div className="rounded-2xl overflow-hidden relative" style={{ height: '180px', backgroundColor: '#FFF8F0', border: '1.5px solid #F2C9C9' }}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFF8F0]/90 to-transparent flex items-end p-5">
          <div className="flex items-center gap-3">
            <img src="/puppy-loveletter.png" alt="小狗狗" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
            <div>
              <h2 className="text-lg tracking-wide" style={{ fontFamily: "'ZCOOL KuaiLe', sans-serif", color: '#C4956A' }}>
                我们的恋爱手账
              </h2>
              <p className="text-xs" style={{ color: '#A0846C' }}>照片 + 文字 = 记忆 🐾</p>
            </div>
          </div>
        </div>
      </div>

      {/* 在一起 & 生日 */}
      <LoveMilestones />

      {/* 历史上的今天 */}
      <OnThisDaySection onEdit={handleOnThisDayEdit} />

      {/* 恋爱数据报告 */}
      <LoveReportSection />

      {/* 统计卡片 */}
      <div className="rounded-2xl p-4 relative overflow-hidden" style={{ backgroundColor: '#FFF8F0', border: '1.5px solid #F2C9C9' }}>
        <div className="absolute top-3 right-3 opacity-20"><PawPrints /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-xl" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="text-2xl font-bold" style={{ color: '#C4956A', fontFamily: "'ZCOOL KuaiLe', sans-serif" }}>{stats.records}</div>
            <div className="text-xs mt-0.5" style={{ color: '#A0846C' }}>条记忆</div>
          </div>
          <div className="text-center p-3 rounded-xl" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="text-2xl font-bold" style={{ color: '#C4956A', fontFamily: "'ZCOOL KuaiLe', sans-serif" }}>{stats.locations}</div>
            <div className="text-xs mt-0.5" style={{ color: '#A0846C' }}>个地点</div>
          </div>
        </div>
      </div>

      {/* 下一个纪念日 */}
      {upcomingAnniversary && daysUntil !== null && (
        <div className="rounded-2xl p-4 relative overflow-hidden" style={{ backgroundColor: '#F2C9C9', border: '1.5px solid #E8B8B8' }}>
          <div className="absolute top-2 right-3"><TinyHeart /></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: '#A0846C' }}>{upcomingAnniversary.type}</p>
              <p className="text-base font-bold mt-0.5" style={{ color: '#4A3728' }}>{upcomingAnniversary.title}</p>
              <p className="text-xs mt-1" style={{ color: '#A0846C' }}>
                {new Date(upcomingAnniversary.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: '#C4956A', fontFamily: "'ZCOOL KuaiLe', sans-serif" }}>{daysUntil}</div>
              <div className="text-xs" style={{ color: '#A0846C' }}>天后</div>
            </div>
          </div>
        </div>
      )}

      {/* 记忆卡片流 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base tracking-wide" style={{ fontFamily: "'ZCOOL KuaiLe', sans-serif", color: '#C4956A' }}>全部记忆</h3>
          <TinyHeart />
        </div>
        {recentRecords.length === 0 ? (
          <div className="text-center py-10 rounded-2xl" style={{ backgroundColor: '#FFF8F0' }}>
            <img src="/puppy-loveletter.png" alt="小狗狗" style={{ width: '80px', height: '80px', objectFit: 'contain', margin: '0 auto' }} />
            <p className="text-sm mt-3" style={{ color: '#A0846C' }}>还没有记忆，去「记录」Tab 发布第一条吧~</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRecords.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                showImages={true}
                onEdit={setEditingRecord}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {editingRecord && (
        <RecordEditDialog
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSaved={(updated) => {
            setRecentRecords((prev) =>
              prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
            );
            setEditingRecord(null);
          }}
        />
      )}
    </div>
  );
}
