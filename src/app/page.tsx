'use client';

import { useState } from 'react';
import { HomeTab } from '@/components/home-tab';
import { TimelineTab } from '@/components/timeline-tab';
import { SpaceTab } from '@/components/space-tab';
import { UploadTab } from '@/components/upload-tab';
import { SearchBar } from '@/components/search-bar';
import { PuppyDecoration, TabIcon } from '@/components/puppy-decoration';

type Tab = 'home' | 'timeline' | 'space' | 'upload';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showSearch, setShowSearch] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'home', label: '首页' },
    { key: 'timeline', label: '时间线' },
    { key: 'space', label: '空间' },
    { key: 'upload', label: '记录' },
  ];

  const isSpace = activeTab === 'space';

  return (
    <div
      className={`w-full ${isSpace ? 'h-screen overflow-hidden' : 'min-h-screen flex flex-col items-center'}`}
      style={{
        backgroundColor: '#FEFAF5',
        backgroundImage: isSpace ? 'none' : 'url(/paw-pattern.png)',
        backgroundSize: '200px',
        backgroundBlendMode: 'soft-light',
        backgroundRepeat: 'repeat',
      }}
    >
      {/* 空间 Tab：地图全屏铺底 */}
      {isSpace && (
        <div className="fixed inset-0 z-0">
          <SpaceTab key={`space-${refreshKey}`} />
        </div>
      )}

      <div className={`w-full flex flex-col ${isSpace ? 'relative z-40 h-full pointer-events-none' : 'min-h-screen max-w-5xl px-6 lg:px-10'}`}>
        {/* 顶部导航 */}
        <header
          className={`flex items-center justify-between gap-4 border-b border-dashed pointer-events-auto ${
            isSpace
              ? 'fixed top-0 left-0 right-0 px-4 lg:px-8 py-3'
              : 'sticky top-0 z-40 py-4'
          }`}
          style={{
            backgroundColor: isSpace ? 'rgba(254,250,245,0.88)' : '#FEFAF5',
            borderColor: '#E8D5C4',
            backdropFilter: isSpace ? 'blur(8px)' : undefined,
          }}
        >
          {/* 左侧：Logo + 标签导航 */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 flex-shrink-0">
              <PuppyDecoration variant="header" />
              <h1
                className="text-xl tracking-wide hidden sm:block"
                style={{ fontFamily: "'ZCOOL KuaiLe', sans-serif", color: '#C4956A' }}
              >
                恋爱手账
              </h1>
            </div>

            {/* Tab 切换 */}
            <nav className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm transition-all duration-200"
                  style={{
                    color: activeTab === tab.key ? '#C4956A' : '#A0846C',
                    backgroundColor: activeTab === tab.key ? '#FFF8F0' : 'transparent',
                    fontWeight: activeTab === tab.key ? 600 : 400,
                  }}
                >
                  <span className="text-base"><TabIcon tab={tab.key} active={activeTab === tab.key} /></span>
                  <span
                    className="hidden sm:inline"
                    style={{ fontFamily: activeTab === tab.key ? "'ZCOOL KuaiLe', sans-serif" : undefined }}
                  >
                    {tab.label}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* 右侧：搜索按钮 */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ backgroundColor: showSearch ? '#F2C9C9' : '#FFF8F0', color: '#C4956A' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </header>

        {/* 搜索栏（展开时） */}
        {showSearch && (
          <div
            className={`py-3 px-1 animate-fade-in border-b border-dashed pointer-events-auto z-40 ${
              isSpace ? 'fixed top-[60px] left-0 right-0 px-4 lg:px-8' : 'sticky top-[68px]'
            }`}
            style={{ borderColor: '#E8D5C4', backgroundColor: isSpace ? 'rgba(254,250,245,0.92)' : undefined }}
          >
            <SearchBar onClose={() => setShowSearch(false)} />
          </div>
        )}

        {/* 主内容区 */}
        {!isSpace && (
          <main className="flex-1 py-6 pointer-events-auto">
            {activeTab === 'home' && <HomeTab key={`home-${refreshKey}`} />}
            {activeTab === 'timeline' && <TimelineTab key={`timeline-${refreshKey}`} />}
            {activeTab === 'upload' && <UploadTab onSuccess={triggerRefresh} onNavigateHome={() => setActiveTab('home')} />}
          </main>
        )}

        {/* 底部留白 */}
        {!isSpace && <div className="h-8" />}
      </div>
    </div>
  );
}
