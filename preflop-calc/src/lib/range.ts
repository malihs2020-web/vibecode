// Разбор и запись диапазонов в привычном виде: «QQ+, AKs, A5s-A2s, KQo, 77-55»
import { HAND_COUNT, RANK_CHARS, emptyRange, handId, type HandKind, type Range } from './hands';

const rankOf = (ch: string) => RANK_CHARS.indexOf(ch.toUpperCase());

export interface ParseResult {
  range: Range;
  /** Куски, которые не удалось понять */
  errors: string[];
}

function addPair(r: Range, rank: number) {
  r[handId('pair', rank, rank)] = true;
}

function addNonPair(r: Range, hi: number, lo: number, suit: '' | 's' | 'o') {
  if (suit !== 'o') r[handId('suited', hi, lo)] = true;
  if (suit !== 's') r[handId('offsuit', hi, lo)] = true;
}

/** Разбор одного токена. true — если понят */
function parseToken(token: string, r: Range): boolean {
  const t = token.trim();
  if (!t) return true;
  const low = t.toLowerCase();
  if (low === 'any' || low === 'all' || low === '100%') {
    for (let i = 0; i < HAND_COUNT; i++) r[i] = true;
    return true;
  }

  const hand = '([2-9TJQKA])([2-9TJQKA])([SO])?';
  const norm = t.toUpperCase();

  // Диапазон через дефис: A5s-A2s, 77-55
  let m = norm.match(new RegExp(`^${hand}-${hand}$`));
  if (m) {
    const [, a1, b1, s1u = '', a2, b2, s2u = ''] = m;
    const s1 = s1u.toLowerCase();
    const s2 = s2u.toLowerCase();
    const h1 = rankOf(a1), l1 = rankOf(b1), h2 = rankOf(a2), l2 = rankOf(b2);
    if (s1 !== s2) return false;
    if (h1 === l1 && h2 === l2) {
      if (s1) return false;
      const [from, to] = h1 < h2 ? [h1, h2] : [h2, h1];
      for (let k = from; k <= to; k++) addPair(r, k);
      return true;
    }
    if (h1 !== h2 || l1 === h1 || l2 === h2) return false;
    const [from, to] = l1 < l2 ? [l1, l2] : [l2, l1];
    for (let k = from; k <= to; k++) addNonPair(r, h1, k, s1 as '' | 's' | 'o');
    return true;
  }

  // Одиночная рука или «плюс»: QQ+, ATs+, KQ
  m = norm.match(new RegExp(`^${hand}(\\+)?$`));
  if (m) {
    const [, a, b, su = '', plus] = m;
    const s = su.toLowerCase();
    let hi = rankOf(a);
    let lo = rankOf(b);
    if (hi === lo) {
      if (s) return false;
      if (plus) for (let k = hi; k <= 12; k++) addPair(r, k);
      else addPair(r, hi);
      return true;
    }
    if (lo > hi) [hi, lo] = [lo, hi];
    if (plus) for (let k = lo; k < hi; k++) addNonPair(r, hi, k, s as '' | 's' | 'o');
    else addNonPair(r, hi, lo, s as '' | 's' | 'o');
    return true;
  }
  return false;
}

export function parseRange(text: string): ParseResult {
  const range = emptyRange();
  const errors: string[] = [];
  for (const token of text.split(/[\s,;]+/)) {
    if (!parseToken(token, range)) errors.push(token);
  }
  return { range, errors };
}

/** Запись диапазона компактной строкой */
export function formatRange(range: Range): string {
  const parts: string[] = [];
  const R = RANK_CHARS;

  // Пары: сверху вниз, склеиваем подряд идущие
  let k = 12;
  while (k >= 0) {
    if (!range[handId('pair', k, k)]) {
      k--;
      continue;
    }
    const top = k;
    while (k - 1 >= 0 && range[handId('pair', k - 1, k - 1)]) k--;
    const bottom = k;
    if (top === 12 && bottom < 12) parts.push(`${R[bottom]}${R[bottom]}+`);
    else if (top === bottom) parts.push(`${R[top]}${R[top]}`);
    else parts.push(`${R[top]}${R[top]}-${R[bottom]}${R[bottom]}`);
    k--;
  }

  // Непарные руки: по старшей карте, отдельно одномастные и разномастные
  for (let hi = 12; hi >= 1; hi--) {
    for (const kind of ['suited', 'offsuit'] as HandKind[]) {
      const s = kind === 'suited' ? 's' : 'o';
      let lo = hi - 1;
      while (lo >= 0) {
        if (!range[handId(kind, hi, lo)]) {
          lo--;
          continue;
        }
        const top = lo;
        while (lo - 1 >= 0 && range[handId(kind, hi, lo - 1)]) lo--;
        const bottom = lo;
        if (top === hi - 1 && bottom < top) parts.push(`${R[hi]}${R[bottom]}${s}+`);
        else if (top === bottom) parts.push(`${R[hi]}${R[top]}${s}`);
        else parts.push(`${R[hi]}${R[top]}${s}-${R[hi]}${R[bottom]}${s}`);
        lo--;
      }
    }
  }
  return parts.join(', ');
}
