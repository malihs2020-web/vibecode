import { describe, expect, it } from 'vitest';
import { eval7, categoryOf } from './evaluator';
import { HAND_BY_NAME, card, rangeCombos, representative, TOTAL_COMBOS } from './hands';
import { formatRange, parseRange } from './range';
import { makeRng, sampleEquity, villainCombos } from './equity';
import { analyze, pushEv, requiredEquity, spotMoney, type Spot } from './pushEv';

const R = '23456789TJQKA';
const S = 'cdhs';
const c = (s: string) => card(R.indexOf(s[0]), S.indexOf(s[1]));
const ev = (...cs: string[]) => eval7(...(cs.map(c) as [number, number, number, number, number, number, number]));

describe('оценщик комбинаций', () => {
  it('распознаёт категории', () => {
    expect(categoryOf(ev('Ah', 'Kh', 'Qh', 'Jh', 'Th', '2c', '3d'))).toBe(8);
    expect(categoryOf(ev('Ah', 'Ad', 'Ac', 'As', '2h', '3c', '4d'))).toBe(7);
    expect(categoryOf(ev('Ah', 'Ad', 'Ac', 'Ks', 'Kh', '3c', '4d'))).toBe(6);
    expect(categoryOf(ev('2h', '7h', '9h', 'Jh', 'Kh', '3c', '4d'))).toBe(5);
    expect(categoryOf(ev('Ah', '2d', '3c', '4s', '5h', 'Kc', 'Qd'))).toBe(4);
    expect(categoryOf(ev('7h', '7d', '7c', 'As', '2h', '3c', '9d'))).toBe(3);
    expect(categoryOf(ev('7h', '7d', '8c', '8s', '2h', '3c', 'Kd'))).toBe(2);
    expect(categoryOf(ev('7h', '7d', '9c', 'Js', '2h', '3c', 'Kd'))).toBe(1);
    expect(categoryOf(ev('7h', '5d', '9c', 'Js', '2h', '3c', 'Kd'))).toBe(0);
  });

  it('сравнивает внутри категории', () => {
    // стрит 6-high сильнее «колеса»
    expect(ev('6h', '2d', '3c', '4s', '5h', 'Kc', 'Qd')).toBeGreaterThan(ev('Ah', '2d', '3c', '4s', '5h', 'Kc', 'Qd'));
    // кикер решает
    expect(ev('Ah', 'Kd', 'Ac', '7s', '5h', '3c', '2d')).toBeGreaterThan(ev('Ah', 'Qd', 'Ac', '7s', '5h', '3c', '2d'));
    // две пары: третья пара не играет, играет лучший кикер
    expect(ev('Ah', 'Ad', 'Kc', 'Ks', '2h', '2c', 'Qd')).toBeGreaterThan(ev('Ah', 'Ad', 'Kc', 'Ks', '3h', '3c', 'Jd'));
    // фулл-хаус из двух сетов
    expect(ev('Ah', 'Ad', 'Ac', 'Ks', 'Kh', 'Kc', '2d')).toBe(ev('Ah', 'Ad', 'Ac', 'Ks', 'Kh', '3c', '2d'));
    // одинаковые пять карт борда = делёж
    expect(ev('2h', '3d', 'Ac', 'Ks', 'Qh', 'Jc', 'Td')).toBe(ev('4h', '5d', 'Ac', 'Ks', 'Qh', 'Jc', 'Td'));
  });
});

describe('диапазоны', () => {
  it('разбирает запись', () => {
    const { range, errors } = parseRange('QQ+, AKs, A5s-A2s, KQ, 77-55, ATo+');
    expect(errors).toEqual([]);
    expect(rangeCombos(range)).toBe(3 * 6 + 4 + 4 * 4 + 16 + 3 * 6 + 4 * 12);
    expect(formatRange(range)).toBe('QQ+, 77-55, AKs, A5s-A2s, ATo+, KQs, KQo');
  });

  it('понимает строчные буквы и ошибки', () => {
    const { range, errors } = parseRange('aks jj+ xyz');
    expect(range[HAND_BY_NAME.get('AKs')!.id]).toBe(true);
    expect(range[HAND_BY_NAME.get('JJ')!.id]).toBe(true);
    expect(errors).toEqual(['xyz']);
  });

  it('any = все 1326 комбинаций, формат туда-обратно', () => {
    const { range } = parseRange('any');
    expect(rangeCombos(range)).toBe(TOTAL_COMBOS);
    expect(rangeCombos(parseRange(formatRange(range)).range)).toBe(TOTAL_COMBOS);
  });
});

describe('эквити', () => {
  const eqVs = (hero: string, vill: string, n = 200_000) => {
    const [h1, h2] = representative(HAND_BY_NAME.get(hero)!.id);
    const combos = villainCombos(parseRange(vill).range, h1, h2);
    const s = sampleEquity(h1, h2, combos, n, makeRng(12345));
    return s.wins / s.trials;
  };

  it('AA против KK ≈ 82%', () => {
    expect(eqVs('AA', 'KK')).toBeCloseTo(0.82, 1);
  });
  it('AKo против QQ ≈ 43%', () => {
    expect(eqVs('AKo', 'QQ')).toBeCloseTo(0.43, 1);
  });
  it('72o против любых ≈ 35%', () => {
    expect(eqVs('72o', 'any')).toBeCloseTo(0.35, 1);
  });
});

describe('EV пуша', () => {
  // Стек 100bb, опен 2.5, 3-бет 9, блайнды 1.5 → банк 13
  const spot: Spot = { pot: 13, stack: 100, open: 2.5, threeBet: 9 };

  it('деньги в банке', () => {
    expect(spotMoney(spot)).toEqual({ risk: 97.5, villainCall: 91, finalPot: 201.5, dead: 1.5 });
  });

  it('при нулевом фолде нужное эквити = шансы банка', () => {
    expect(requiredEquity(0, spot)).toBeCloseTo(97.5 / 201.5, 6);
    expect(pushEv(0, 97.5 / 201.5, spot)).toBeCloseTo(0, 6);
  });

  it('EV = 0 ровно на минимальном эквити', () => {
    const f = 0.6;
    expect(pushEv(f, requiredEquity(f, spot), spot)).toBeCloseTo(0, 9);
  });

  it('блокеры: туз в руке уменьшает число AA/AK у оппонента', () => {
    const tb = parseRange('QQ+, AKs, AKo').range;
    const call = parseRange('KK+, AKs').range;
    const eqs = new Array(169).fill(0.3);
    const res = analyze(spot, tb, call, eqs);
    const a5s = res[HAND_BY_NAME.get('A5s')!.id];
    const n72 = res[HAND_BY_NAME.get('72o')!.id];
    // без блокеров: 3-бет 6+6+6+4+12 = 34, колл 6+6+4 = 16
    expect(n72.threeBetCombos).toBe(34);
    expect(n72.callCombos).toBe(16);
    // A5s убирает 3 комбо AA, 3 AKo и 1 AKs
    expect(a5s.threeBetCombos).toBe(34 - 3 - 1 - 3);
    expect(a5s.callCombos).toBe(16 - 3 - 1);
    expect(a5s.fold).toBeGreaterThan(n72.fold);
  });
});

describe('скорость', () => {
  it('оценка ≥ 1 млн раздач в секунду', () => {
    const [h1, h2] = representative(HAND_BY_NAME.get('AKs')!.id);
    const combos = villainCombos(parseRange('any').range, h1, h2);
    const t = performance.now();
    sampleEquity(h1, h2, combos, 500_000, makeRng());
    const sec = (performance.now() - t) / 1000;
    console.log(`раздач в секунду: ${Math.round(500_000 / sec).toLocaleString('ru')}`);
    expect(500_000 / sec).toBeGreaterThan(1_000_000);
  });
});
