// Фоновый расчёт эквити всех 169 рук против диапазона колла.
// Считаем в несколько проходов: сначала грубо (быстро видно картину), потом точнее.
import { HAND_COUNT, representative, type Range } from './lib/hands';
import { makeRng, sampleEquity, villainCombos } from './lib/equity';

export interface EquityRequest {
  call: Range;
}

export interface EquityProgress {
  equities: (number | null)[];
  /** 0..1 */
  progress: number;
  /** Раздач на одну руку в последнем завершённом проходе */
  trials: number;
  done: boolean;
}

/** Сколько раздач на руку должно быть накоплено к концу каждого прохода */
const PASSES = [2_000, 12_000, 60_000];

self.onmessage = (e: MessageEvent<EquityRequest>) => {
  const { call } = e.data;
  const rng = makeRng((Math.random() * 2 ** 31) | 0);
  const wins = new Float64Array(HAND_COUNT);
  const trials = new Float64Array(HAND_COUNT);
  const combos = Array.from({ length: HAND_COUNT }, (_, id) => {
    const [h1, h2] = representative(id);
    return villainCombos(call, h1, h2);
  });
  const equities: (number | null)[] = new Array(HAND_COUNT).fill(null);
  const total = PASSES[PASSES.length - 1] * HAND_COUNT;
  let doneTrials = 0;

  for (let p = 0; p < PASSES.length; p++) {
    for (let id = 0; id < HAND_COUNT; id++) {
      const need = PASSES[p] - trials[id];
      const [h1, h2] = representative(id);
      const s = sampleEquity(h1, h2, combos[id], need, rng);
      wins[id] += s.wins;
      trials[id] += need;
      doneTrials += need;
      if (combos[id].length === 0) equities[id] = 0;
      if (p > 0 && id % 24 === 23) {
        self.postMessage({ equities: null, progress: doneTrials / total, trials: PASSES[p - 1], done: false });
      }
    }
    for (let id = 0; id < HAND_COUNT; id++) {
      equities[id] = combos[id].length === 0 ? 0 : wins[id] / trials[id];
    }
    const msg: EquityProgress = {
      equities: equities.slice(),
      progress: doneTrials / total,
      trials: PASSES[p],
      done: p === PASSES.length - 1,
    };
    self.postMessage(msg);
  }
};
