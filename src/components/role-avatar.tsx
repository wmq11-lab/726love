'use client';

import { getRoleAvatar, getRoleEmoji } from '@/lib/roles';

interface RoleAvatarProps {
  role: string;
  size?: number;
  className?: string;
}

export function RoleAvatar({ role, size = 24, className = '' }: RoleAvatarProps) {
  const avatar = getRoleAvatar(role);
  const emoji = getRoleEmoji(role);

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={role}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.65 }}
    >
      {emoji}
    </span>
  );
}
