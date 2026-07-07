/** 恋爱重要日期（固定配置） */
export const LOVE_TOGETHER_DATE = '2023-07-26';

export const ROLE_BIRTHDAYS = {
  小张: '2001-07-26',
  王哥: '2004-06-05',
} as const;

export type RoleName = keyof typeof ROLE_BIRTHDAYS;

export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** 在一起天数（含起始日当天为第 1 天） */
export function calcTogetherDays(ref = new Date()): number {
  const start = parseDateOnly(LOVE_TOGETHER_DATE);
  const today = new Date(ref);
  today.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);
}

/** 距离下一次生日还有几天（0 = 今天） */
export function daysUntilNextBirthday(birthDate: string, ref = new Date()): number {
  const [, m, d] = birthDate.split('-').map(Number);
  const today = new Date(ref);
  today.setHours(0, 0, 0, 0);

  let next = new Date(today.getFullYear(), m - 1, d);
  next.setHours(0, 0, 0, 0);
  if (next < today) {
    next = new Date(today.getFullYear() + 1, m - 1, d);
    next.setHours(0, 0, 0, 0);
  }
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

/** 下次生日时将满几岁 */
export function ageOnNextBirthday(birthDate: string, ref = new Date()): number {
  const [birthYear] = birthDate.split('-').map(Number);
  const [, m, d] = birthDate.split('-').map(Number);
  const today = new Date(ref);
  today.setHours(0, 0, 0, 0);
  let birthdayThisYear = new Date(today.getFullYear(), m - 1, d);
  birthdayThisYear.setHours(0, 0, 0, 0);
  const yearTurning = birthdayThisYear >= today ? today.getFullYear() : today.getFullYear() + 1;
  return yearTurning - birthYear;
}

export function formatMonthDay(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m} 月 ${d} 日`;
}

export const LOVE_DATE_SEEDS = [
  { title: '我们在一起', date: `${LOVE_TOGETHER_DATE}T00:00:00+08:00`, type: '在一起', description: '2023 年 7 月 26 日，在一起的日子', icon: 'heart' },
  { title: '小张的生日', date: `${ROLE_BIRTHDAYS.小张}T00:00:00+08:00`, type: '生日', description: '小张 · 2001 年 7 月 26 日', icon: 'cake' },
  { title: '王哥的生日', date: `${ROLE_BIRTHDAYS.王哥}T00:00:00+08:00`, type: '生日', description: '王哥 · 2004 年 6 月 5 日', icon: 'cake' },
];
