'use client';

import { useState } from 'react';

interface SearchBarProps {
  onClose: () => void;
}

interface SearchResult {
  records?: Array<{
    id: string;
    title: string;
    content: string;
    mood_tag: string;
    record_date: string;
  }>;
  chats?: Array<{
    id: string;
    contact_name: string;
    content: string;
    chat_time: string;
    sender: string;
  }>;
  locations?: Array<{
    id: string;
    name: string;
    address: string;
    category: string;
  }>;
}

export function SearchBar({ onClose }: SearchBarProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}&type=all`);
      const json = await res.json();
      if (json.success) setResults(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const totalCount =
    (results?.records?.length || 0) + (results?.chats?.length || 0) + (results?.locations?.length || 0);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索记录、聊天、地点..."
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              backgroundColor: '#FFF8F0',
              border: '1.5px solid #E8D5C4',
              color: '#4A3728',
            }}
            autoFocus
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ backgroundColor: '#C4956A', color: '#FFFFFF' }}
        >
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      {results && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {totalCount === 0 && (
            <p className="text-center text-sm py-4" style={{ color: '#A0846C' }}>
              没有找到相关内容 🐾
            </p>
          )}

          {results.records && results.records.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: '#C4956A' }}>📝 恋爱记录</p>
              {results.records.map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-lg mb-1 text-sm"
                  style={{ backgroundColor: '#FFF8F0' }}
                >
                  <div className="font-medium" style={{ color: '#4A3728' }}>{r.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#A0846C' }}>
                    {r.mood_tag && <span className="mr-2">#{r.mood_tag}</span>}
                    {new Date(r.record_date).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.chats && results.chats.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: '#C4956A' }}>💬 聊天记录</p>
              {results.chats.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg mb-1 text-sm"
                  style={{ backgroundColor: '#FFF8F0' }}
                >
                  <div className="font-medium" style={{ color: '#4A3728' }}>{c.contact_name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#A0846C' }}>
                    {c.sender}: {c.content.slice(0, 50)}
                    {c.content.length > 50 && '...'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.locations && results.locations.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: '#C4956A' }}>📍 地点</p>
              {results.locations.map((l) => (
                <div
                  key={l.id}
                  className="p-3 rounded-lg mb-1 text-sm"
                  style={{ backgroundColor: '#FFF8F0' }}
                >
                  <div className="font-medium" style={{ color: '#4A3728' }}>{l.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#A0846C' }}>
                    {l.address} · {l.category}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
