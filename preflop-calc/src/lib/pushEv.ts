// Математика 4-бет пуша против 3-бета.
//
// Ситуация: мы открылись на `open` bb, оппонент 3-бетнул до `threeBet` bb,
// в банке сейчас `pot` bb (всё вместе с блайндами), эффективный стек на начало раздачи `stack` bb.
// Мы пушим. Оппонент либо сбрасывает (мы забираем банк), либо коллирует (идём до ривера).
//
//   EV(пуш) = F · банк + (1 − F) · (эквити · итоговый банк − наш довнос)
//   EV(фолд) = 0 (всё, что уже в банке, — не наше)
//
// F — фолд-эквити: доля комбинаций 3-бета, которые не коллируют пуш (с учётом наших блокеров).
import { HAND_COUNT, representative, unblockedCombos, rangeCombos, type Range } from './hands';

export interface Spot {
  /** Банк перед нашим пушем, bb */
  pot: number;
  /** Эффективный стек на начало раздачи, bb */
  stack: number;
  /** Размер нашего опена, bb */
  open: number;
  /** Размер 3-бета оппонента, bb */
  threeBet: number;
}

export interface SpotMoney {
  /** Сколько мы доставляем при пуше */
  risk: number;
  /** Сколько доставляет оппонент при колле */
  villainCall: number;
  /** Банк, если оппонент заколлировал */
  finalPot: number;
  /** Мёртвые деньги (блайнды и прочее, кроме наших ставок) */
  dead: number;
}

export function spotMoney(s: Spot): SpotMoney {
  const risk = s.stack - s.open;
  const villainCall = s.stack - s.threeBet;
  return {
    risk,
    villainCall,
    finalPot: s.pot + risk + villainCall,
    dead: s.pot - s.open - s.threeBet,
  };
}

/** Ошибки ввода, при которых считать нельзя */
export function validateSpot(s: Spot): string[] {
  const errs: string[] = [];
  const nums = [s.pot, s.stack, s.open, s.threeBet];
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) {
    errs.push('Все числа должны быть неотрицательными.');
    return errs;
  }
  if (s.threeBet <= s.open) errs.push('3-бет должен быть больше нашего опена.');
  if (s.stack <= s.threeBet) errs.push('Стек должен быть больше размера 3-бета — иначе это уже олл-ин.');
  if (s.pot < s.open + s.threeBet) errs.push('Банк не может быть меньше, чем опен + 3-бет.');
  return errs;
}

/**
 * Минимальное эквити против диапазона колла, при котором пуш не хуже фолда.
 * Может быть ≤ 0: тогда пуш выгоден с любыми картами за счёт фолдов.
 */
export function requiredEquity(fold: number, s: Spot): number {
  const { risk, finalPot } = spotMoney(s);
  if (fold >= 1) return -Infinity;
  return (risk - (fold / (1 - fold)) * s.pot) / finalPot;
}

export function pushEv(fold: number, equity: number, s: Spot): number {
  const { risk, finalPot } = spotMoney(s);
  return fold * s.pot + (1 - fold) * (equity * finalPot - risk);
}

/** Фолд-эквити без учёта блокеров — «в среднем» по диапазону */
export function averageFold(threeBet: Range, call: Range): number {
  const tb = rangeCombos(threeBet);
  if (tb === 0) return 0;
  const callInTb = rangeCombos(threeBet.map((x, i) => x && call[i]));
  return 1 - callInTb / tb;
}

export interface HandResult {
  id: number;
  /** Комбинаций 3-бета и колла, оставшихся с учётом наших карт */
  threeBetCombos: number;
  callCombos: number;
  fold: number;
  /** null — эквити ещё не посчитано */
  equity: number | null;
  required: number;
  ev: number | null;
}

/** Считает всё по каждой из 169 рук. Эквити приходит из фонового расчёта. */
export function analyze(
  spot: Spot,
  threeBet: Range,
  call: Range,
  equities: (number | null)[],
): HandResult[] {
  const out: HandResult[] = [];
  for (let id = 0; id < HAND_COUNT; id++) {
    const [h1, h2] = representative(id);
    let tb = 0;
    let cc = 0;
    for (let v = 0; v < HAND_COUNT; v++) {
      if (!threeBet[v]) continue;
      const n = unblockedCombos(v, h1, h2);
      tb += n;
      // Коллировать пуш можно только рукой, которой 3-бетили
      if (call[v]) cc += n;
    }
    const fold = tb > 0 ? 1 - cc / tb : 0;
    // Если колла нет вовсе, эквити не нужно: оппонент всегда сбрасывает
    const eq = cc === 0 ? 0 : equities[id];
    out.push({
      id,
      threeBetCombos: tb,
      callCombos: cc,
      fold,
      equity: eq,
      required: requiredEquity(fold, spot),
      ev: eq === null ? null : pushEv(fold, eq, spot),
    });
  }
  return out;
}
