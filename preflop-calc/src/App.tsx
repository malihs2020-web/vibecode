import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Spade } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeControls } from '@/components/theme-controls';
import { RangeEditor } from '@/components/RangeEditor';
import { ResultGrid, type ResultMode } from '@/components/ResultGrid';
import { HANDS, HAND_COUNT, TOTAL_COMBOS, rangeCombos, type Range } from '@/lib/hands';
import { formatRange, parseRange } from '@/lib/range';
import { CALL_PRESETS, THREE_BET_PRESETS } from '@/lib/presets';
import {
  analyze,
  averageFold,
  requiredEquity,
  spotMoney,
  validateSpot,
  type Spot,
} from '@/lib/pushEv';
import type { EquityProgress } from '@/equity.worker';
import EquityWorker from '@/equity.worker?worker';

const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
const bb = (x: number) => `${x > 0 ? '+' : ''}${x.toFixed(2)} bb`;

const SPOT_FIELDS: { key: keyof Spot; label: string; hint: string }[] = [
  { key: 'stack', label: 'Эффективный стек', hint: 'на начало раздачи' },
  { key: 'open', label: 'Наш опен', hint: 'до скольки открылись' },
  { key: 'threeBet', label: '3-бет оппонента', hint: 'до скольки 3-бетнул' },
  { key: 'pot', label: 'Банк перед пушем', hint: 'опен + 3-бет + блайнды' },
];

export default function App() {
  const [spot, setSpot] = useState<Spot>({ stack: 100, open: 2.5, threeBet: 9, pot: 13 });
  const [draft, setDraft] = useState<Record<keyof Spot, string>>({
    stack: '100',
    open: '2.5',
    threeBet: '9',
    pot: '13',
  });
  const [threeBet, setThreeBet] = useState<Range>(() => parseRange(THREE_BET_PRESETS[1].range).range);
  const [call, setCall] = useState<Range>(() => parseRange(CALL_PRESETS[0].range).range);
  const [rangeTab, setRangeTab] = useState<'threeBet' | 'call'>('threeBet');
  const [mode, setMode] = useState<ResultMode>('ev');
  const [hovered, setHovered] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Колл возможен только теми руками, что есть в 3-бете
  const callInThreeBet = useMemo(() => call.map((x, i) => x && threeBet[i]), [call, threeBet]);

  // Эквити зависит только от диапазона колла — пересчитываем в фоне при его изменении
  const [equity, setEquity] = useState<EquityProgress>({
    equities: new Array(HAND_COUNT).fill(null),
    progress: 0,
    trials: 0,
    done: false,
  });
  const callKey = callInThreeBet.map((x) => (x ? 1 : 0)).join('');
  useEffect(() => {
    const worker = new EquityWorker();
    setEquity((prev) => ({ ...prev, equities: new Array(HAND_COUNT).fill(null), progress: 0, done: false }));
    worker.onmessage = (e: MessageEvent<EquityProgress>) => {
      const msg = e.data;
      setEquity((prev) => (msg.equities ? msg : { ...prev, progress: msg.progress }));
    };
    worker.postMessage({ call: callInThreeBet });
    return () => worker.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callKey]);


  const errors = validateSpot(spot);
  const money = spotMoney(spot);

  const callOutside = HANDS.filter((h) => call[h.id] && !threeBet[h.id]).map((h) => h.name);

  const results = useMemo(
    () => analyze(spot, threeBet, callInThreeBet, equity.equities),
    [spot, threeBet, callInThreeBet, equity.equities],
  );

  const avgFold = averageFold(threeBet, call);
  const minEquity = requiredEquity(avgFold, spot);
  const potOdds = money.risk / money.finalPot;

  const ready = results.every((r) => r.ev !== null);
  const plusRange: Range = results.map((r) => r.ev !== null && r.ev > 0);
  const plusCombos = rangeCombos(plusRange);
  const plusText = formatRange(plusRange);
  const threeBetCount = rangeCombos(threeBet);

  const detail = hovered !== null ? results[hovered] : null;

  function updateField(key: keyof Spot, raw: string) {
    setDraft((d) => ({ ...d, [key]: raw }));
    const n = Number(raw.replace(',', '.'));
    if (raw.trim() !== '' && Number.isFinite(n)) setSpot((s) => ({ ...s, [key]: n }));
  }

  function autoPot() {
    const pot = Math.round((spot.open + spot.threeBet + 1.5) * 100) / 100;
    updateField('pot', String(pot));
  }

  async function copyPlus() {
    try {
      await navigator.clipboard.writeText(plusText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* буфер обмена недоступен */
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Spade className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">Калькулятор 4-бет пуша</h1>
              <p className="text-xs text-muted-foreground">Мы открылись → оппонент 3-бетит → мы пушим</p>
            </div>
          </div>
          <ThemeControls />
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)_minmax(0,1fr)]">
        {/* Левая колонка: ситуация и итог */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ситуация, bb</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {SPOT_FIELDS.map((f) => (
                <div key={f.key} className="grid grid-cols-[1fr_96px] items-center gap-2">
                  <Label htmlFor={f.key} className="leading-tight">
                    {f.label}
                    <span className="block text-xs font-normal text-muted-foreground">{f.hint}</span>
                  </Label>
                  <Input
                    id={f.key}
                    inputMode="decimal"
                    value={draft[f.key]}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    className="text-right tabular-nums"
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={autoPot}>
                Посчитать банк (+1.5 bb блайндов)
              </Button>
              {errors.length > 0 && (
                <div className="space-y-1 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  {errors.map((e) => (
                    <p key={e}>{e}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Итог</CardTitle>
              <CardDescription>По диапазонам в среднем, без учёта блокеров</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg bg-primary/10 p-3">
                <div className="text-xs text-muted-foreground">Минимальное эквити против колла</div>
                <div className="text-3xl font-bold tabular-nums text-primary">
                  {errors.length ? '—' : minEquity <= 0 ? '0%' : pct(minEquity)}
                </div>
                {minEquity <= 0 && !errors.length && (
                  <div className="text-xs text-muted-foreground">Фолдов хватает: пуш в плюс любыми двумя</div>
                )}
              </div>
              <Row label="Фолд на пуш" value={threeBetCount ? pct(avgFold) : '—'} />
              <Row label="Без фолд-эквити (шансы банка)" value={errors.length ? '—' : pct(potOdds)} />
              <Row label="Ставим / оппонент доставляет" value={`${money.risk} / ${money.villainCall}`} />
              <Row label="Банк при колле" value={`${money.finalPot} bb`} />
              <div className="border-t pt-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium">
                    Плюсовый пуш: {plusCombos} комб. ({pct(plusCombos / TOTAL_COMBOS)})
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyPlus} title="Скопировать">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="break-words font-mono text-xs text-muted-foreground">
                  {!ready ? 'Считаю…' : plusText || 'Нет плюсовых рук'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Средняя колонка: диапазоны оппонента */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Диапазоны оппонента</CardTitle>
            <Tabs value={rangeTab} onValueChange={(v) => setRangeTab(v as 'threeBet' | 'call')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="threeBet">3-бет</TabsTrigger>
                <TabsTrigger value="call">Колл пуша</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {rangeTab === 'threeBet' ? (
              <RangeEditor value={threeBet} onChange={setThreeBet} presets={THREE_BET_PRESETS} />
            ) : (
              <>
                <RangeEditor value={call} onChange={setCall} presets={CALL_PRESETS} allowed={threeBet} />
                {callOutside.length > 0 && (
                  <p className="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    Этих рук нет в 3-бете, в колле они не учитываются: {callOutside.join(', ')}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Правая колонка: результат */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Какие руки пушить</CardTitle>
              <span className="text-xs text-muted-foreground tabular-nums">
                {equity.done
                  ? `точность ±0.4% (${equity.trials.toLocaleString('ru')} раздач на руку)`
                  : `считаю эквити… ${Math.round(equity.progress * 100)}%`}
              </span>
            </div>
            <Tabs value={mode} onValueChange={(v) => setMode(v as ResultMode)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ev">EV, bb</TabsTrigger>
                <TabsTrigger value="equity">Эквити, %</TabsTrigger>
                <TabsTrigger value="required">Нужно, %</TabsTrigger>
              </TabsList>
            </Tabs>
            {!equity.done && (
              <div className="h-1 overflow-hidden rounded bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${equity.progress * 100}%` }} />
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {errors.length > 0 ? (
              <p className="text-sm text-muted-foreground">Исправьте ввод слева, чтобы увидеть результат.</p>
            ) : (
              <ResultGrid results={results} mode={mode} hovered={hovered} onHover={setHovered} />
            )}
            <div className="min-h-[92px] rounded-lg border p-3 text-sm">
              {detail ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="col-span-2 mb-1 flex items-baseline justify-between">
                    <span className="text-base font-semibold">{HANDS[detail.id].name}</span>
                    <span
                      className={
                        detail.ev === null ? '' : detail.ev > 0 ? 'font-semibold text-success' : 'font-semibold text-destructive'
                      }
                    >
                      {detail.ev === null ? '…' : `${bb(detail.ev)} — ${detail.ev > 0 ? 'пуш' : 'фолд'}`}
                    </span>
                  </div>
                  <Row label="Фолд оппонента" value={pct(detail.fold)} />
                  <Row
                    label="Эквити vs колл"
                    value={detail.callCombos === 0 ? '—' : detail.equity === null ? '…' : pct(detail.equity)}
                  />
                  <Row label="Комбо 3-бет / колл" value={`${detail.threeBetCombos} / ${detail.callCombos}`} />
                  <Row label="Нужно эквити" value={detail.required <= 0 ? 'любое' : pct(detail.required)} />
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Наведите на руку, чтобы увидеть детали. Зелёные — пуш выгоднее фолда, красные — нет. Для каждой
                  руки учтены блокеры: например, с тузом у оппонента меньше AA и AK.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
