function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return localDateStr(new Date());
}

export function shiftDay(key: string, delta: number): string {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return localDateStr(d);
}

export function lastNDays(n: number, anchor = todayKey()): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) days.push(shiftDay(anchor, -i));
  return days;
}

export function formatLongDate(key: string): string {
  const d = new Date(key + 'T00:00:00');
  const isToday = key === todayKey();
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  };
  return (isToday ? 'Сегодня, ' : '') + d.toLocaleDateString('ru-RU', opts);
}
