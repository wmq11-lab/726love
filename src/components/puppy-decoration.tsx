'use client';

interface PuppyDecorationProps {
  variant?: 'header' | 'card' | 'footer';
  size?: number;
}

export function PuppyDecoration({ variant = 'header', size = 24 }: PuppyDecorationProps) {
  if (variant === 'header') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 线条小狗头部 - 简约线条风格 */}
        <ellipse cx="24" cy="28" rx="14" ry="12" fill="#FFF8F0" stroke="#C4956A" strokeWidth="1.5" />
        {/* 耳朵 */}
        <ellipse cx="14" cy="18" rx="6" ry="8" fill="#FFF8F0" stroke="#C4956A" strokeWidth="1.5" transform="rotate(-15 14 18)" />
        <ellipse cx="34" cy="18" rx="6" ry="8" fill="#FFF8F0" stroke="#C4956A" strokeWidth="1.5" transform="rotate(15 34 18)" />
        {/* 眼睛 */}
        <circle cx="20" cy="26" r="1.8" fill="#4A3728" />
        <circle cx="28" cy="26" r="1.8" fill="#4A3728" />
        {/* 鼻子 */}
        <ellipse cx="24" cy="30" rx="2.5" ry="2" fill="#4A3728" />
        {/* 嘴巴 */}
        <path d="M22 32 Q24 35 26 32" stroke="#4A3728" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {/* 腮红 */}
        <circle cx="17" cy="30" r="2.5" fill="#F2C9C9" opacity="0.5" />
        <circle cx="31" cy="30" r="2.5" fill="#F2C9C9" opacity="0.5" />
        {/* 小爱心 */}
        <path d="M38 12 C38 9 35 8 34 10 C33 8 30 9 30 12 C30 15 34 18 34 18 C34 18 38 15 38 12Z" fill="#F2C9C9" opacity="0.6" />
      </svg>
    );
  }

  if (variant === 'card') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="18" r="8" fill="none" stroke="#C4956A" strokeWidth="1.2" />
        <circle cx="13" cy="17" r="1" fill="#4A3728" />
        <circle cx="19" cy="17" r="1" fill="#4A3728" />
        <ellipse cx="16" cy="19.5" rx="1.5" ry="1.2" fill="#4A3728" />
        <path d="M15 21 Q16 22.5 17 21" stroke="#4A3728" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      </svg>
    );
  }

  // footer
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="16" cy="18" rx="10" ry="8" fill="none" stroke="#C4956A" strokeWidth="1" opacity="0.5" />
      <circle cx="13" cy="17" r="0.8" fill="#C4956A" opacity="0.5" />
      <circle cx="19" cy="17" r="0.8" fill="#C4956A" opacity="0.5" />
      <ellipse cx="16" cy="19" rx="1.2" ry="1" fill="#C4956A" opacity="0.5" />
    </svg>
  );
}

// 小爪子印装饰
export function PawPrints() {
  return (
    <svg width="60" height="20" viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="12" r="3" fill="#F2C9C9" opacity="0.4" />
      <circle cx="4" cy="6" r="2" fill="#F2C9C9" opacity="0.4" />
      <circle cx="8" cy="4" r="2" fill="#F2C9C9" opacity="0.4" />
      <circle cx="2" cy="10" r="1.5" fill="#F2C9C9" opacity="0.4" />
      <circle cx="24" cy="14" r="2.5" fill="#F2C9C9" opacity="0.3" />
      <circle cx="22" cy="9" r="1.5" fill="#F2C9C9" opacity="0.3" />
      <circle cx="26" cy="8" r="1.5" fill="#F2C9C9" opacity="0.3" />
      <circle cx="42" cy="10" r="3.5" fill="#F2C9C9" opacity="0.25" />
      <circle cx="39" cy="4" r="2.5" fill="#F2C9C9" opacity="0.25" />
      <circle cx="45" cy="3" r="2.5" fill="#F2C9C9" opacity="0.25" />
    </svg>
  );
}

// 底部导航栏图标 - 线条小狗主题
interface TabIconProps {
  tab: 'home' | 'timeline' | 'space' | 'upload';
  active: boolean;
}

export function TabIcon({ tab, active }: TabIconProps) {
  const color = active ? '#C4956A' : '#A0846C';
  const fillColor = active ? '#FFF8F0' : 'transparent';
  const accentColor = active ? '#F2C9C9' : '#D4C4B8';

  // 首页 - 小狗趴在屋顶
  if (tab === 'home') {
    return (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 屋顶 */}
        <path d="M3 11 L13 3 L23 11" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 9 L6 20 L20 20 L20 9" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        {/* 小狗身体 */}
        <ellipse cx="14" cy="17" rx="3.5" ry="3" fill={fillColor} stroke={color} strokeWidth="1.1" />
        {/* 小狗头 */}
        <circle cx="13" cy="14" r="2.8" fill={fillColor} stroke={color} strokeWidth="1.1" />
        {/* 耳朵 */}
        <ellipse cx="11" cy="12" rx="1.6" ry="2" fill={fillColor} stroke={color} strokeWidth="1" transform="rotate(-20 11 12)" />
        <ellipse cx="15" cy="12" rx="1.6" ry="2" fill={fillColor} stroke={color} strokeWidth="1" transform="rotate(20 15 12)" />
        {/* 眼睛 */}
        <circle cx="12" cy="13.5" r="0.6" fill={color} />
        <circle cx="14.5" cy="13.5" r="0.6" fill={color} />
        {/* 鼻子 */}
        <ellipse cx="13.3" cy="14.8" rx="0.9" ry="0.7" fill={color} />
        {/* 尾巴 */}
        <path d="M17.5 17 Q20 15 19 12" stroke={color} strokeWidth="1.1" fill="none" strokeLinecap="round" />
        {/* 爱心 */}
        <path d="M8 7 C8 5.5 6.5 5 6 6 C5.5 5 4 5.5 4 7 C4 8.5 6 10 6 10 C6 10 8 8.5 8 7Z" fill={accentColor} opacity="0.7" />
      </svg>
    );
  }

  // 时间线 - 小狗趴在日历上
  if (tab === 'timeline') {
    return (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 日历本 */}
        <rect x="3" y="4" width="18" height="18" rx="2.5" fill={fillColor} stroke={color} strokeWidth="1.3" />
        <line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth="1" />
        <line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        <line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        {/* 日期文字简化为小狗爪印 */}
        <circle cx="7" cy="12.5" r="1" fill={accentColor} opacity="0.8" />
        <circle cx="11" cy="12.5" r="1" fill={accentColor} opacity="0.8" />
        <circle cx="15" cy="12.5" r="1" fill={accentColor} opacity="0.8" />
        <circle cx="7" cy="16.5" r="1" fill={accentColor} opacity="0.6" />
        <circle cx="11" cy="16.5" r="1" fill={accentColor} opacity="0.6" />
        {/* 小狗趴在日历底部 */}
        <ellipse cx="12" cy="21" rx="4" ry="3" fill={fillColor} stroke={color} strokeWidth="1" />
        <circle cx="10" cy="18.5" r="2.2" fill={fillColor} stroke={color} strokeWidth="1" />
        <ellipse cx="9" cy="16.8" rx="1.2" ry="1.6" fill={fillColor} stroke={color} strokeWidth="0.9" transform="rotate(-15 9 16.8)" />
        <ellipse cx="13" cy="16.8" rx="1.2" ry="1.6" fill={fillColor} stroke={color} strokeWidth="0.9" transform="rotate(15 13 16.8)" />
        <circle cx="9.5" cy="18" r="0.5" fill={color} />
        <circle cx="11.5" cy="18" r="0.5" fill={color} />
      </svg>
    );
  }

  // 空间 - 小狗爪印地图标记
  if (tab === 'space') {
    return (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 地图标记 */}
        <path d="M13 3 C9 3 6 6.5 6 10.5 C6 16 13 23 13 23 C13 23 20 16 20 10.5 C20 6.5 17 3 13 3Z" fill={fillColor} stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        {/* 内部小狗爪印 */}
        <circle cx="13" cy="9" r="2.8" fill={accentColor} opacity="0.5" />
        {/* 四个小趾垫 */}
        <ellipse cx="10" cy="7" rx="1.2" ry="1.5" fill={accentColor} opacity="0.6" />
        <ellipse cx="13" cy="5.5" rx="1.2" ry="1.5" fill={accentColor} opacity="0.6" />
        <ellipse cx="16" cy="7" rx="1.2" ry="1.5" fill={accentColor} opacity="0.6" />
        {/* 中心垫 */}
        <ellipse cx="13" cy="10" rx="2" ry="2.2" fill={accentColor} opacity="0.6" />
        {/* 小狗头在标记底部 */}
        <circle cx="13" cy="12.5" r="2.5" fill={fillColor} stroke={color} strokeWidth="1" />
        <circle cx="12" cy="12" r="0.5" fill={color} />
        <circle cx="14.5" cy="12" r="0.5" fill={color} />
        <ellipse cx="13.3" cy="13.2" rx="0.8" ry="0.6" fill={color} />
      </svg>
    );
  }

  // 记录 - 小狗叼着爱心笔
  if (tab === 'upload') {
    return (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 便签本 */}
        <rect x="3" y="5" width="15" height="18" rx="1.5" fill={fillColor} stroke={color} strokeWidth="1.2" />
        <line x1="6" y1="10" x2="15" y2="10" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
        <line x1="6" y1="13" x2="15" y2="13" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
        <line x1="6" y1="16" x2="12" y2="16" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
        {/* 笔 */}
        <line x1="18" y1="3" x2="13" y2="8" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        <line x1="20" y1="5" x2="18" y2="3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        {/* 小狗趴在便签上 */}
        <ellipse cx="10" cy="21" rx="3.5" ry="2.8" fill={fillColor} stroke={color} strokeWidth="1" />
        <circle cx="10" cy="18.5" r="2.2" fill={fillColor} stroke={color} strokeWidth="1" />
        <ellipse cx="8.5" cy="17" rx="1.2" ry="1.5" fill={fillColor} stroke={color} strokeWidth="0.9" transform="rotate(-15 8.5 17)" />
        <ellipse cx="11.5" cy="17" rx="1.2" ry="1.5" fill={fillColor} stroke={color} strokeWidth="0.9" transform="rotate(15 11.5 17)" />
        <circle cx="9.5" cy="18" r="0.5" fill={color} />
        <circle cx="11.5" cy="18" r="0.5" fill={color} />
        <ellipse cx="10.5" cy="19.2" rx="0.7" ry="0.5" fill={color} />
        {/* 小爱心在笔尖 */}
        <path d="M20 2 C20 1 19 0.5 18.5 1.2 C18 0.5 17 1 17 2 C17 3 18.5 4 18.5 4 C18.5 4 20 3 20 2Z" fill={accentColor} opacity="0.8" />
      </svg>
    );
  }

  // fallback
  return null;
}

// 小爱心装饰
export function TinyHeart({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 14 C8 14 2 9.5 2 5.5 C2 3.5 3.5 2 5.5 2 C6.8 2 7.6 2.8 8 3.5 C8.4 2.8 9.2 2 10.5 2 C12.5 2 14 3.5 14 5.5 C14 9.5 8 14 8 14Z"
        fill="#F2C9C9"
        opacity="0.7"
      />
    </svg>
  );
}
