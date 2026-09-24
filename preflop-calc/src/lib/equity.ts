// Эквити руки против диапазона методом Монте-Карло:
// случайная рука оппонента из диапазона + случайный борд, много раз.
import { COMBOS_BY_HAND, HAND_COUNT, type Range } from './hands';
import { eval7 } from './evaluator';

/** Быстрый генератор случайных чисел (xorshift32) */
export function makeRng(seed = 0x9e3779b9) {
  let x = seed | 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

/** Комбинации диапазона, не пересекающиеся с картами героя */
export function villainCombos(range: Range, h1: number, h2: number): Int32Array {
  const list: number[] = [];
  for (let id = 0; id < HAND_COUNT; id++) {
    if (!range[id]) continue;
    for (const [a, b] of COMBOS_BY_HAND[id]) {
      if (a === h1 || a === h2 || b === h1 || b === h2) continue;
      list.push(a, b);
    }
  }
  return Int32Array.from(list);
}

export interface EquitySample {
  /** Сумма очков: победа = 1, делёж = 0.5 */
  wins: number;
  trials: number;
}

/**
 * Прогоняет `trials` раздач руки (h1, h2) против списка комбинаций оппонента.
 * Возвращает накопленные очки — их можно складывать между прогонами.
 */
export function sampleEquity(
  h1: number,
  h2: number,
  combos: Int32Array,
  trials: number,
  rng: () => number,
): EquitySample {
  const nCombos = combos.length >> 1;
  if (nCombos === 0) return { wins: 0, trials: 0 };
  const deck = new Int32Array(52);
  let wins = 0;
  for (let t = 0; t < trials; t++) {
    const k = (rng() * nCombos) | 0;
    const v1 = combos[2 * k];
    const v2 = combos[2 * k + 1];
    // Колода без 4 известных карт
    let n = 0;
    for (let c = 0; c < 52; c++) if (c !== h1 && c !== h2 && c !== v1 && c !== v2) deck[n++] = c;
    // Частичная перетасовка: 5 карт борда
    for (let i = 0; i < 5; i++) {
      const j = i + ((rng() * (n - i)) | 0);
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    const b0 = deck[0], b1 = deck[1], b2 = deck[2], b3 = deck[3], b4 = deck[4];
    const hero = eval7(h1, h2, b0, b1, b2, b3, b4);
    const vill = eval7(v1, v2, b0, b1, b2, b3, b4);
    if (hero > vill) wins += 1;
    else if (hero === vill) wins += 0.5;
  }
  return { wins, trials };
}
