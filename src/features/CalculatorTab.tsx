import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ACTIVITY_OPTIONS,
  GOAL_DIRECTION_OPTIONS,
  GOAL_RATE_OPTIONS,
  calculate,
  type CalcResult,
} from '@/lib/calc';
import type { Gender, GoalDirection, GoalRate, MacroGoals } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';

interface Props {
  onGoalChange: (tdee: number, macros: MacroGoals) => void;
}

interface Profile {
  gender: Gender;
  age: string;
  weight: string;
  height: string;
  activity: string;
  direction: GoalDirection;
  rate: GoalRate;
}

const DEFAULT_PROFILE: Profile = {
  gender: 'male',
  age: '25',
  weight: '70',
  height: '175',
  activity: '1.55',
  direction: 'maintain',
  rate: 'moderate',
};

function bmiBadgeVariant(label: string) {
  if (label === 'Норма') return 'success' as const;
  if (label === 'Недовес') return 'secondary' as const;
  return 'destructive' as const;
}

export function CalculatorTab({ onGoalChange }: Props) {
  const [profile, setProfile] = useLocalStorage<Profile>('userProfile', DEFAULT_PROFILE);
  const [result, setResult] = useState<CalcResult | null>(null);

  // Ручной режим БЖУ
  const [manualMacros, setManualMacros] = useState(false);
  const [manualP, setManualP] = useState('');
  const [manualF, setManualF] = useState('');
  const [manualC, setManualC] = useState('');

  function set<K extends keyof Profile>(key: K, val: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: val }));
  }

  function handleCalculate() {
    const age = +profile.age;
    const weight = +profile.weight;
    const height = +profile.height;
    if (!age || !weight || !height) return;

    const res = calculate({
      gender: profile.gender,
      age,
      weight,
      height,
      activity: +profile.activity,
      direction: profile.direction,
      rate: profile.rate,
    });
    setResult(res);

    // Предзаполняем ручные поля авто-значениями при первом расчёте
    if (!manualP) setManualP(String(res.macros.protein));
    if (!manualF) setManualF(String(res.macros.fat));
    if (!manualC) setManualC(String(res.macros.carbs));

    const finalMacros = manualMacros
      ? { protein: +manualP || 0, fat: +manualF || 0, carbs: +manualC || 0 }
      : res.macros;

    onGoalChange(res.tdee, finalMacros);
  }

  // Текущие макро для предпросмотра в ручном режиме
  const manualMacroObj: MacroGoals = {
    protein: +manualP || 0,
    fat: +manualF || 0,
    carbs: +manualC || 0,
  };
  const manualTotalCal = manualMacroObj.protein * 4 + manualMacroObj.fat * 9 + manualMacroObj.carbs * 4;
  const manualDiff = result ? Math.abs(manualTotalCal - result.tdee) : 0;
  const manualWarning = manualMacros && result && manualDiff > 100;

  const rateLabel =
    profile.direction === 'gain'
      ? GOAL_RATE_OPTIONS.map((o) => ({ ...o, desc: o.desc.replace('−', '+') }))
      : GOAL_RATE_OPTIONS;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Параметры</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Пол */}
            <div className="flex flex-col gap-2">
              <Label>Пол</Label>
              <RadioGroup
                value={profile.gender}
                onValueChange={(v) => set('gender', v as Gender)}
                className="flex gap-4 pt-1"
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="male" /> Мужской
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="female" /> Женский
                </label>
              </RadioGroup>
            </div>

            <Field id="age" label="Возраст (лет)">
              <Input id="age" type="number" min={10} max={100} value={profile.age}
                onChange={(e) => set('age', e.target.value)} />
            </Field>
            <Field id="weight" label="Вес (кг)">
              <Input id="weight" type="number" min={30} max={300} value={profile.weight}
                onChange={(e) => set('weight', e.target.value)} />
            </Field>
            <Field id="height" label="Рост (см)">
              <Input id="height" type="number" min={100} max={250} value={profile.height}
                onChange={(e) => set('height', e.target.value)} />
            </Field>

            {/* Активность */}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Уровень активности</Label>
              <Select value={profile.activity} onValueChange={(v) => set('activity', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Направление цели */}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Цель</Label>
              <div className="grid grid-cols-3 gap-2">
                {GOAL_DIRECTION_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => set('direction', o.value)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      profile.direction === o.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-accent',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Темп (только если не поддержание) */}
            {profile.direction !== 'maintain' && (
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>Темп {profile.direction === 'lose' ? 'похудения' : 'набора'}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {rateLabel.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => set('rate', o.value as GoalRate)}
                      className={cn(
                        'flex flex-col rounded-lg border px-3 py-2 text-left transition-colors',
                        profile.rate === o.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background hover:bg-accent',
                      )}
                    >
                      <span className="text-sm font-medium">{o.label}</span>
                      <span className="mt-0.5 text-xs text-muted-foreground leading-tight">
                        {profile.direction === 'gain'
                          ? o.desc.replace('−', '+')
                          : o.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button className="w-full sm:w-auto" onClick={handleCalculate}>
            Рассчитать
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Предупреждение о защитном пороге */}
          {result.warning && (
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{result.warning}</span>
            </div>
          )}

          {/* Результаты */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="col-span-2 border-0 bg-primary text-primary-foreground sm:col-span-3">
              <CardContent className="p-5 text-center">
                <div className="text-xs opacity-80">Суточная норма</div>
                <div className="text-4xl font-bold" data-testid="res-tdee">{result.tdee}</div>
                <div className="text-xs opacity-75">ккал/день</div>
                {result.clamped && (
                  <div className="mt-1 text-xs opacity-70">
                    (базовый TDEE {result.tdeeBase} ккал, ограничено защитным порогом)
                  </div>
                )}
              </CardContent>
            </Card>
            <ResultCard label="Базальный обмен (BMR)" value={result.bmr} unit="ккал" />
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-1 p-4 text-center">
                <div className="text-xs text-muted-foreground">ИМТ</div>
                <div className="text-2xl font-bold" data-testid="res-bmi">
                  {result.bmi.toFixed(1)}
                </div>
                <Badge variant={bmiBadgeVariant(result.bmiLabel)}>{result.bmiLabel}</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Блок БЖУ */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Норма БЖУ</CardTitle>
                <button
                  type="button"
                  onClick={() => {
                    if (!manualMacros) {
                      setManualP(String(result.macros.protein));
                      setManualF(String(result.macros.fat));
                      setManualC(String(result.macros.carbs));
                    } else {
                      // возвращаем авто-значения
                      onGoalChange(result.tdee, result.macros);
                    }
                    setManualMacros((m) => !m);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  {manualMacros ? 'Сбросить в авто' : 'Задать вручную'}
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!manualMacros ? (
                <div className="grid grid-cols-3 gap-3">
                  <MacroCard label="Белки" value={result.macros.protein} unit="г/день"
                    sub={`${(result.macros.protein / (+profile.weight || 1)).toFixed(1)} г/кг`} />
                  <MacroCard label="Жиры" value={result.macros.fat} unit="г/день" />
                  <MacroCard label="Углеводы" value={result.macros.carbs} unit="г/день" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <Field id="mp" label="Белки (г)">
                      <Input id="mp" type="number" min={0} value={manualP}
                        onChange={(e) => { setManualP(e.target.value); }} />
                    </Field>
                    <Field id="mf" label="Жиры (г)">
                      <Input id="mf" type="number" min={0} value={manualF}
                        onChange={(e) => { setManualF(e.target.value); }} />
                    </Field>
                    <Field id="mc" label="Углеводы (г)">
                      <Input id="mc" type="number" min={0} value={manualC}
                        onChange={(e) => { setManualC(e.target.value); }} />
                    </Field>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Итого: {Math.round(manualTotalCal)} ккал</span>
                    <span>Цель: {result.tdee} ккал</span>
                  </div>
                  {manualWarning && (
                    <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Сумма БЖУ ({Math.round(manualTotalCal)} ккал) отличается от цели ({result.tdee} ккал) на {Math.round(manualDiff)} ккал.
                    </div>
                  )}
                  <Button
                    size="sm"
                    onClick={() => onGoalChange(result.tdee, manualMacroObj)}
                  >
                    Применить
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function ResultCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{unit}</div>
      </CardContent>
    </Card>
  );
}

function MacroCard({ label, value, unit, sub }: { label: string; value: number; unit: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{unit}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground/70">{sub}</div>}
      </CardContent>
    </Card>
  );
}
