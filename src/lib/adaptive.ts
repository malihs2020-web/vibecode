import type { Diary, WeightEntry } from './types';

const EMA_ALPHA = 0.1;
const KCAL_PER_KG = 7700;
const DAMPING = 0.6;
const MAX_CORRECTION = 150; // ккал/день за одну корректировку
const MAX_DRIFT = 0.2;      // ±20% от базового Mifflin TDEE
const MIN_DAYS = 5;         // минимум дней с данными за окно

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

function dayCalories(diary: Diary, key: string): number {
  const day = diary[key];
  if (!day) return 0;
  return MEALS.reduce((s, m) => s + day[m].reduce((ss, e) => ss + e.cal, 0), 0);
}

/** Экспоненциальное скользящее среднее по отсортированному ряду значений */
export function calcEMA(values: number[], alpha = EMA_ALPHA): number[] {
  if (values.length === 0) return [];
  const ema: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ema.push(alpha * values[i] + (1 - alpha) * ema[i - 1]);
  }
  return ema;
}

export interface AdaptiveResult {
  newTdee: number;
  correctionKcal: number;   // демпфированная корректировка (со знаком)
  trendDelta: number;       // фактическое изменение тренда за окно (кг)
  expectedDelta: number;    // ожидаемое изменение (кг)
  avgCalories: number;      // среднее ккал за дни с едой
}

/**
 * Еженедельная корректировка TDEE.
 * Возвращает null если недостаточно данных за окно.
 *
 * @param weightLog    — отсортированный по дате лог веса
 * @param diary        — дневник питания
 * @param currentTdee  — текущая оценка TDEE (с предыдущими корректировками)
 * @param baseTdee     — исходный TDEE по формуле Mifflin (для зажима ±20%)
 * @param windowDays   — размер окна (7 дней по умолчанию)
 */
export function calcAdaptiveTdee(
  weightLog: WeightEntry[],
  diary: Diary,
  currentTdee: number,
  baseTdee: number,
  windowDays = 7,
): AdaptiveResult | null {
  if (weightLog.length < 2) return null;

  // Берём последние windowDays дней с записями веса
  const sorted = [...weightLog].sort((a, b) => a.date.localeCompare(b.date));
  const windowEntries = sorted.slice(-windowDays);
  if (windowEntries.length < MIN_DAYS) return null;

  // Дни окна для проверки питания
  const windowDates = windowEntries.map((e) => e.date);
  const foodDays = windowDates.filter((d) => dayCalories(diary, d) > 0);
  if (foodDays.length < MIN_DAYS) return null;

  // EMA тренда веса
  const weights = windowEntries.map((e) => e.weight);
  const ema = calcEMA(weights);
  const trendStart = ema[0];
  const trendEnd = ema[ema.length - 1];
  const trendDelta = trendEnd - trendStart;

  // Средние калории за дни с едой в окне
  const totalCal = foodDays.reduce((s, d) => s + dayCalories(diary, d), 0);
  const avgCalories = totalCal / foodDays.length;

  // Ожидаемое изменение веса (кг) за окно
  const expectedDelta = ((avgCalories - currentTdee) * windowDays) / KCAL_PER_KG;

  // Ошибка → сырая корректировка ккал/день
  const error = trendDelta - expectedDelta;
  const rawCorrection = (error * KCAL_PER_KG) / windowDays;
  const dampedCorrection = rawCorrection * DAMPING;
  const correctionKcal = Math.max(-MAX_CORRECTION, Math.min(MAX_CORRECTION, dampedCorrection));

  // Новая TDEE, зажатая в ±20% от базового Mifflin
  const raw = currentTdee + correctionKcal;
  const lo = baseTdee * (1 - MAX_DRIFT);
  const hi = baseTdee * (1 + MAX_DRIFT);
  const newTdee = Math.round(Math.max(lo, Math.min(hi, raw)));

  return { newTdee, correctionKcal: Math.round(correctionKcal), trendDelta, expectedDelta, avgCalories: Math.round(avgCalories) };
}

/** Нужно ли запускать корректировку сейчас?
 *  Возвращает true если прошло ≥7 дней от последней корректировки (или она ещё не была). */
export function shouldRunAdaptive(lastAdaptiveDate: string | null): boolean {
  if (!lastAdaptiveDate) return true;
  const last = new Date(lastAdaptiveDate + 'T00:00:00');
  const now = new Date();
  const diffDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 7;
}
