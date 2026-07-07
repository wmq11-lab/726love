export const ROLE_OPTIONS = [
  { label: '王哥', emoji: '👨', avatar: '/avatar-wangge.png' },
  { label: '小张', emoji: '👩', avatar: '/avatar-xiaozhang.png' },
] as const;

export type RoleLabel = (typeof ROLE_OPTIONS)[number]['label'];

export const ROLE_LABELS: RoleLabel[] = ROLE_OPTIONS.map((r) => r.label);

export const DEFAULT_ROLE: RoleLabel = '王哥';

export function getRoleEmoji(label: string): string {
  return ROLE_OPTIONS.find((r) => r.label === label)?.emoji ?? '👤';
}

export function getRoleAvatar(label: string): string | null {
  return ROLE_OPTIONS.find((r) => r.label === label)?.avatar ?? null;
}
