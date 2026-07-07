export const MOOD_OPTIONS = [
  { emoji: '🥰', label: '甜蜜' },
  { emoji: '🥹', label: '感动' },
  { emoji: '😆', label: '开心' },
  { emoji: '💭', label: '想念' },
  { emoji: '😤', label: '生气' },
  { emoji: '📝', label: '日常' },
  { emoji: '💕', label: '浪漫' },
  { emoji: '🎉', label: '纪念' },
  { emoji: '✈️', label: '旅行' },
  { emoji: '🍰', label: '美食' },
  { emoji: '🎁', label: '惊喜' },
  { emoji: '🌸', label: '治愈' },
  { emoji: '🥺', label: '委屈' },
  { emoji: '😔', label: '遗憾' },
  { emoji: '✨', label: '期待' },
  { emoji: '☕', label: '平淡' },
] as const;

export type MoodLabel = (typeof MOOD_OPTIONS)[number]['label'];

export const MOOD_LABELS: MoodLabel[] = MOOD_OPTIONS.map((m) => m.label);

export function getMoodEmoji(label: string): string {
  return MOOD_OPTIONS.find((m) => m.label === label)?.emoji ?? '📝';
}
