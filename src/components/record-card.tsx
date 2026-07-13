'use client';

import { MapPin, Calendar, Trash2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { getMoodEmoji } from '@/lib/moods';
import { RoleAvatar } from './role-avatar';
import { ImagePreviewLightbox } from './image-preview-lightbox';

interface LoveRecord {
  id: string;
  title: string;
  content: string;
  mood_tag: string;
  role?: string;
  record_date: string;
  tags: string[];
  locations?: { id: string; name: string; address?: string } | null;
  record_images?: Array<{ id: string; storage_key: string; template_style: string; url?: string; fullUrl?: string }>;
}

interface RecordCardProps {
  record: LoveRecord;
  showImages?: boolean;
  onEdit?: (record: LoveRecord) => void;
  onDelete?: (id: string) => void;
}

export function RecordCard({ record, showImages = true, onEdit, onDelete }: RecordCardProps) {
  const moodEmoji = getMoodEmoji(record.mood_tag);
  const images = showImages ? (record.record_images ?? []).filter((img) => img.url) : [];
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const previewImages = images.map((img) => ({
    id: img.id,
    url: img.fullUrl || img.url!,
  }));

  const dateObj = new Date(record.record_date);
  const timeStr = dateObj.toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <>
    <div
      className="rounded-2xl overflow-hidden flex flex-col md:flex-row gap-0"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8D5C4',
        boxShadow: '0 2px 12px rgba(196,149,106,0.08)',
      }}
    >
      {/* ====== 左边栏：地理位置 + 时间 ====== */}
      <div
        className="flex-shrink-0 flex flex-row md:flex-col items-center justify-center gap-2 px-4 py-3 md:w-36"
        style={{ backgroundColor: '#FFFBF6', borderRight: '1px solid #F0E3D5', borderBottom: '1px solid #F0E3D5' }}
      >
        {/* 地点 */}
        {record.locations?.name ? (
          <div className="flex flex-row md:flex-col items-center gap-1 text-center">
            <MapPin size={18} style={{ color: '#C4956A' }} />
            <span className="text-xs leading-tight" style={{ color: '#4A3728', fontWeight: 500 }}>
              {record.locations.name}
            </span>
            {record.locations.address && (
              <span className="text-[10px] leading-tight" style={{ color: '#A0846C' }}>
                {record.locations.address}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-40">
            <MapPin size={16} style={{ color: '#C4956A' }} />
            <span className="text-[10px]" style={{ color: '#A0846C' }}>未标记</span>
          </div>
        )}

        {/* 分割线 */}
        <div className="hidden md:block w-8 h-px" style={{ backgroundColor: '#E8D5C4' }} />
        <div className="block md:hidden w-px h-6" style={{ backgroundColor: '#E8D5C4' }} />

        {/* 日期时间 */}
        <div className="flex flex-row md:flex-col items-center gap-1 text-center">
          <Calendar size={16} style={{ color: '#C4956A' }} />
          <span className="text-xs leading-tight" style={{ color: '#4A3728', fontWeight: 500 }}>
            {dateObj.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
          </span>
          <span className="text-[10px]" style={{ color: '#A0846C' }}>
            {timeStr}
          </span>
        </div>
      </div>

      {/* ====== 中间栏：图片（大比例） ====== */}
      <div
        className="flex-shrink-0 md:w-72 w-full"
        style={{ backgroundColor: '#FFF8F0' }}
      >
        {images.length > 0 ? (
          <div className={`grid gap-1 p-1 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`} style={{ minHeight: 200, maxHeight: 320 }}>
            {images.slice(0, 4).map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setPreviewIndex(idx)}
                className="relative overflow-hidden rounded-lg bg-[#FFF8F0] cursor-zoom-in group"
                style={{ minHeight: images.length === 1 ? 200 : 96 }}
              >
                {!loadedIds.has(img.id) && !errorIds.has(img.id) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin" style={{ borderColor: '#E8D5C4', borderTopColor: '#C4956A' }} />
                  </div>
                )}
                {!errorIds.has(img.id) && (
                  <img
                    src={img.url}
                    alt={record.title}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className={`w-full h-full object-cover transition-opacity group-hover:opacity-90 ${loadedIds.has(img.id) ? '' : 'opacity-0'}`}
                    style={{ minHeight: images.length === 1 ? 200 : 96 }}
                    onLoad={() => setLoadedIds((prev) => new Set(prev).add(img.id))}
                    onError={() => setErrorIds((prev) => new Set(prev).add(img.id))}
                  />
                )}
              </button>
            ))}
            {images.length > 4 && (
              <button
                type="button"
                onClick={() => setPreviewIndex(4)}
                className="col-span-2 text-center text-[10px] py-2 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ color: '#C4956A' }}
              >
                +{images.length - 4} 张更多 · 点击查看
              </button>
            )}
          </div>
        ) : (
          <div
            className="w-full flex items-center justify-center"
            style={{ minHeight: 200, maxHeight: 320 }}
          >
            <div className="flex flex-col items-center gap-1 opacity-30">
              <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
                <ellipse cx="20" cy="22" rx="12" ry="10" fill="#E8D5C4"/>
                <circle cx="15" cy="18" r="1.5" fill="#C4956A"/>
                <circle cx="25" cy="18" r="1.5" fill="#C4956A"/>
                <ellipse cx="20" cy="22" rx="3" ry="2" fill="#C4956A"/>
                <path d="M8 18 Q4 12 10 8" stroke="#C4956A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                <path d="M32 18 Q36 12 30 8" stroke="#C4956A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
              <span className="text-[10px]" style={{ color: '#A0846C' }}>暂无照片</span>
            </div>
          </div>
        )}
      </div>

      {/* ====== 右边栏：文字内容 ====== */}
      <div className="flex-1 flex flex-col justify-between p-5 min-w-0">
        {/* 心情 + 角色 */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: '#F2C9C9', color: '#4A3728' }}
          >
            {moodEmoji} {record.mood_tag}
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: '#FFF8F0', color: '#C4956A', border: '1px solid #E8D5C4' }}
          >
            <RoleAvatar role={record.role || '王哥'} size={18} />
            {record.role || '王哥'}
          </span>
        </div>

        {/* 文字内容 */}
        <p
          className="text-sm leading-relaxed flex-1"
          style={{
            color: '#4A3728',
            fontFamily: "'Noto Serif SC', serif",
            lineHeight: '1.8',
            wordBreak: 'break-word',
          }}
        >
          {record.content || '（无文字）'}
        </p>

        {/* 底部：标签 + 操作 */}
        <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
          <div className="flex flex-wrap gap-1.5">
            {record.tags?.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[10px]"
                style={{ backgroundColor: '#FFF8F0', color: '#A0846C', border: '1px solid #F0E3D5' }}
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onEdit && (
              <button
                onClick={() => onEdit(record)}
                className="opacity-40 hover:opacity-80 transition-opacity"
                style={{ color: '#C4956A' }}
                title="编辑"
              >
                <Pencil size={14} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(record.id)}
                className="opacity-30 hover:opacity-80 transition-opacity"
                style={{ color: '#A0846C' }}
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {previewIndex !== null && (
      <ImagePreviewLightbox
        images={previewImages}
        initialIndex={previewIndex}
        onClose={() => setPreviewIndex(null)}
      />
    )}
  </>
  );
}
