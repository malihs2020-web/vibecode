// Готовые диапазоны для быстрого старта. Это примерные чарты, их легко поменять под себя.
export interface Preset {
  label: string;
  range: string;
}

export const THREE_BET_PRESETS: Preset[] = [
  { label: 'Тайтовый', range: 'TT+, AQs+, AKo, A5s-A4s, KQs' },
  { label: 'Средний', range: '99+, ATs+, KTs+, QTs+, JTs, AJo+, KQo, A5s-A2s, 76s, 65s' },
  {
    label: 'Широкий',
    range: '66+, A2s+, K9s+, Q9s+, J9s+, T8s+, 97s+, 86s+, 75s+, 64s+, 54s, ATo+, KJo+, QJo',
  },
];

export const CALL_PRESETS: Preset[] = [
  { label: 'QQ+, AK', range: 'QQ+, AKs, AKo' },
  { label: 'JJ+, AK', range: 'JJ+, AKs, AKo' },
  { label: 'TT+, AQs+, AK', range: 'TT+, AQs+, AKo' },
  { label: 'Только KK+', range: 'KK+' },
];
