// Базовые понятия: карты, 169 классов рук, комбинации.
// Карта — число 0..51: ранг = card >> 2 (0 = двойка … 12 = туз), масть = card & 3.

export const RANK_CHARS = '23456789TJQKA';
/** Ранги в порядке сетки: A, K, Q … 2 */
export const GRID_RANKS = 'AKQJT98765432';

export const HAND_COUNT = 169;
export const TOTAL_COMBOS = 1326;

export type HandKind = 'pair' | 'suited' | 'offsuit';

export interface HandClass {
  /** Индекс в сетке 13×13: row * 13 + col */
  id: number;
  row: number;
  col: number;
  /** Например «AKs», «QQ», «T9o» */
  name: string;
  kind: HandKind;
  /** Старший и младший ранг (0 = двойка … 12 = туз) */
  hi: number;
  lo: number;
  combos: number;
}

/** Ранг по позиции в сетке: строка 0 — туз */
export const rankAt = (gridIndex: number) => 12 - gridIndex;

function buildClasses(): HandClass[] {
  const list: HandClass[] = [];
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      const a = rankAt(row);
      const b = rankAt(col);
      let kind: HandKind;
      let hi: number;
      let lo: number;
      if (row === col) {
        kind = 'pair';
        hi = lo = a;
      } else if (row < col) {
        // выше диагонали — одномастные
        kind = 'suited';
        hi = a;
        lo = b;
      } else {
        kind = 'offsuit';
        hi = b;
        lo = a;
      }
      const name =
        RANK_CHARS[hi] + RANK_CHARS[lo] + (kind === 'pair' ? '' : kind === 'suited' ? 's' : 'o');
      list.push({
        id: row * 13 + col,
        row,
        col,
        name,
        kind,
        hi,
        lo,
        combos: kind === 'pair' ? 6 : kind === 'suited' ? 4 : 12,
      });
    }
  }
  return list;
}

export const HANDS: HandClass[] = buildClasses();

export const HAND_BY_NAME: Map<string, HandClass> = new Map(HANDS.map((h) => [h.name, h]));

export function handId(kind: HandKind, hi: number, lo: number): number {
  const rowHi = 12 - hi;
  const rowLo = 12 - lo;
  if (kind === 'pair') return rowHi * 13 + rowHi;
  if (kind === 'suited') return rowHi * 13 + rowLo;
  return rowLo * 13 + rowHi;
}

export const card = (rank: number, suit: number) => rank * 4 + suit;

/** Все конкретные комбинации (пары карт) класса руки */
export function classCombos(h: HandClass): [number, number][] {
  const out: [number, number][] = [];
  if (h.kind === 'pair') {
    for (let s1 = 0; s1 < 4; s1++)
      for (let s2 = s1 + 1; s2 < 4; s2++) out.push([card(h.hi, s1), card(h.hi, s2)]);
  } else if (h.kind === 'suited') {
    for (let s = 0; s < 4; s++) out.push([card(h.hi, s), card(h.lo, s)]);
  } else {
    for (let s1 = 0; s1 < 4; s1++)
      for (let s2 = 0; s2 < 4; s2++) if (s1 !== s2) out.push([card(h.hi, s1), card(h.lo, s2)]);
  }
  return out;
}

/** Все комбинации каждого класса — считаем один раз */
export const COMBOS_BY_HAND: [number, number][][] = HANDS.map(classCombos);

/**
 * Одна конкретная комбинация класса. Диапазоны симметричны по мастям,
 * поэтому эквити и блокеры одинаковы для любой комбинации класса.
 */
export const representative = (id: number) => COMBOS_BY_HAND[id][0];

/** Диапазон — массив из 169 флагов «рука входит» */
export type Range = boolean[];

export const emptyRange = (): Range => new Array(HAND_COUNT).fill(false);

export function rangeCombos(range: Range): number {
  let n = 0;
  for (let i = 0; i < HAND_COUNT; i++) if (range[i]) n += HANDS[i].combos;
  return n;
}

/** Сколько комбинаций класса осталось, если две карты уже заняты */
export function unblockedCombos(id: number, b1: number, b2: number): number {
  let n = 0;
  for (const [x, y] of COMBOS_BY_HAND[id]) {
    if (x !== b1 && x !== b2 && y !== b1 && y !== b2) n++;
  }
  return n;
}
