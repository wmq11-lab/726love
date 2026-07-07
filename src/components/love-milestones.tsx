'use client';

import {
  ROLE_BIRTHDAYS,
  calcTogetherDays,
  daysUntilNextBirthday,
  ageOnNextBirthday,
  formatMonthDay,
} from '@/lib/love-dates';
import { RoleAvatar } from './role-avatar';
import { PuppyDecoration } from './puppy-decoration';

export function LoveMilestones() {
  const togetherDays = calcTogetherDays();

  const birthdays = (Object.entries(ROLE_BIRTHDAYS) as [keyof typeof ROLE_BIRTHDAYS, string][]).map(
    ([name, date]) => ({
      name,
      date,
      daysUntil: daysUntilNextBirthday(date),
      nextAge: ageOnNextBirthday(date),
      label: formatMonthDay(date),
    }),
  );

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{ backgroundColor: '#FFF8F0', border: '1.5px solid #F2C9C9' }}
    >
      <div className="absolute top-2 right-3 opacity-30">
        <PuppyDecoration variant="card" size={40} />
      </div>

      <div className="mb-3">
        <p className="text-xs font-medium" style={{ color: '#A0846C' }}>在一起</p>
        <p className="text-base font-bold mt-0.5" style={{ color: '#4A3728' }}>
          2023 年 7 月 26 日
        </p>
        <p className="text-2xl font-bold mt-1" style={{ color: '#C4956A', fontFamily: "'ZCOOL KuaiLe', sans-serif" }}>
          第 {togetherDays} 天
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {birthdays.map((b) => (
          <div
            key={b.name}
            className="rounded-xl p-3 flex items-center gap-2"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5C4' }}
          >
            <RoleAvatar role={b.name} size={36} />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: '#4A3728' }}>{b.name}的生日</p>
              <p className="text-[10px]" style={{ color: '#A0846C' }}>{b.label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#C4956A' }}>
                {b.daysUntil === 0
                  ? `今天满 ${b.nextAge} 岁 🎂`
                  : `还有 ${b.daysUntil} 天 · 将满 ${b.nextAge} 岁`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
