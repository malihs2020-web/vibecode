// Быстрая оценка силы 7 карт (2 карты руки + 5 карт борда).
// Возвращает число: чем больше, тем сильнее комбинация.
// Устройство числа: категория << 26 | старшие ранги | маска кикеров.

const POPCOUNT = new Uint8Array(8192);
/** Старшая карта стрита для маски рангов, либо -1 */
const STRAIGHT_HIGH = new Int8Array(8192);

for (let m = 0; m < 8192; m++) {
  let c = 0;
  for (let b = 0; b < 13; b++) if (m & (1 << b)) c++;
  POPCOUNT[m] = c;
  let high = -1;
  for (let top = 12; top >= 4; top--) {
    const need = 0b11111 << (top - 4);
    if ((m & need) === need) {
      high = top;
      break;
    }
  }
  // «Колесо»: A-2-3-4-5
  if (high < 0 && (m & 0b1000000001111) === 0b1000000001111) high = 3;
  STRAIGHT_HIGH[m] = high;
}

/** Оставить k старших битов маски */
function topBits(mask: number, k: number): number {
  while (POPCOUNT[mask] > k) mask &= mask - 1;
  return mask;
}

export const CATEGORY_NAMES = [
  'Старшая карта',
  'Пара',
  'Две пары',
  'Сет / трипс',
  'Стрит',
  'Флеш',
  'Фулл-хаус',
  'Каре',
  'Стрит-флеш',
] as const;

const counts = new Uint8Array(13);

/** Сила руки из 7 карт (номера 0..51) */
export function eval7(
  c0: number,
  c1: number,
  c2: number,
  c3: number,
  c4: number,
  c5: number,
  c6: number,
): number {
  let s0 = 0,
    s1 = 0,
    s2 = 0,
    s3 = 0;
  counts.fill(0);
  const cards = [c0, c1, c2, c3, c4, c5, c6];
  for (let i = 0; i < 7; i++) {
    const c = cards[i];
    const r = c >> 2;
    const bit = 1 << r;
    switch (c & 3) {
      case 0: s0 |= bit; break;
      case 1: s1 |= bit; break;
      case 2: s2 |= bit; break;
      default: s3 |= bit;
    }
    counts[r]++;
  }

  // Флеш и стрит-флеш. В 7 картах флеш не может сочетаться с фулл-хаусом или каре,
  // поэтому при флеше дальше можно не проверять.
  const flushMask =
    POPCOUNT[s0] >= 5 ? s0 : POPCOUNT[s1] >= 5 ? s1 : POPCOUNT[s2] >= 5 ? s2 : POPCOUNT[s3] >= 5 ? s3 : 0;
  if (flushMask) {
    const sf = STRAIGHT_HIGH[flushMask];
    if (sf >= 0) return (8 << 26) | sf;
    return (5 << 26) | topBits(flushMask, 5);
  }

  const all = s0 | s1 | s2 | s3;
  let quad = -1,
    trip1 = -1,
    trip2 = -1,
    pair1 = -1,
    pair2 = -1;
  for (let r = 12; r >= 0; r--) {
    const n = counts[r];
    if (n === 4) quad = r;
    else if (n === 3) {
      if (trip1 < 0) trip1 = r;
      else if (trip2 < 0) trip2 = r;
    } else if (n === 2) {
      if (pair1 < 0) pair1 = r;
      else if (pair2 < 0) pair2 = r;
    }
  }

  if (quad >= 0) return (7 << 26) | (quad << 13) | topBits(all & ~(1 << quad), 1);
  if (trip1 >= 0 && (trip2 >= 0 || pair1 >= 0)) {
    const p = Math.max(trip2, pair1);
    return (6 << 26) | (trip1 << 13) | p;
  }
  const st = STRAIGHT_HIGH[all];
  if (st >= 0) return (4 << 26) | st;
  if (trip1 >= 0) return (3 << 26) | (trip1 << 13) | topBits(all & ~(1 << trip1), 2);
  if (pair2 >= 0) {
    const rest = all & ~(1 << pair1) & ~(1 << pair2);
    return (2 << 26) | (pair1 << 17) | (pair2 << 13) | topBits(rest, 1);
  }
  if (pair1 >= 0) return (1 << 26) | (pair1 << 13) | topBits(all & ~(1 << pair1), 3);
  return topBits(all, 5);
}

export const categoryOf = (score: number) => score >> 26;
