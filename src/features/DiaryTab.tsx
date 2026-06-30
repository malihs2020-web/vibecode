import { useState } from 'react';
import { ChevronLeft, ChevronRight, Droplets, Minus, Plus, Scale, UtensilsCrossed, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatLongDate, shiftDay, todayKey } from '@/lib/date';
import type { Diary, DiaryDay, Entry, Food, MacroGoals, MealType, WeightEntry } from '@/lib/types';
import { AddEntryDialog } from './AddEntryDialog';

const WATER_GOAL = 8;
const GLASS_ML = 250;

const MEALS: { id: MealType; title: string }[] = [
  { id: 'breakfast', title: '🌅 Завтрак' },
  { id: 'lunch', title: '☀️ Обед' },
  { id: 'dinner', title: '🌙 Ужин' },
  { id: 'snack', title: '🍎 Перекус' },
];

const EMPTY_DAY: DiaryDay = {
  breakfast: [],
  lunch: [],
  dinner: [],
  snack: [],
  water: 0,
};

interface Props {
  diary: Diary;
  goalCal: number | null;
  macroGoals: MacroGoals | null;
  foods: Food[];
  weightLog: WeightEntry[];
  onAddEntry: (date: string, meal: MealType, entry: Entry) => void;
  onRemoveEntry: (date: string, meal: MealType, idx: number) => void;
  onChangeWater: (date: string, delta: number) => void;
  onAddWeight: (date: string, weight: number) => void;
}

export function DiaryTab({
  diary,
  goalCal,
  macroGoals,
  foods,
  weightLog,
  onAddEntry,
  onRemoveEntry,
  onChangeWater,
  onAddWeight,
}: Props) {
  const [date, setDate] = useState(todayKey());
  const [dialogMeal, setDialogMeal] = useState<MealType | null>(null);
  const [weightInput, setWeightInput] = useState('');

  const todayWeight = weightLog.find((e) => e.date === date)?.weight ?? null;

  const day = diary[date] ?? EMPTY_DAY;
  const water = day.water ?? 0;

  let totalCal = 0;
  let totalP = 0;
  let totalF = 0;
  let totalC = 0;
  for (const meal of MEALS) {
    for (const e of day[meal.id]) {
      totalCal += e.cal;
      totalP += e.protein;
      totalF += e.fat;
      totalC += e.carbs;
    }
  }

  const over = goalCal != null && totalCal > goalCal;
  const pct = goalCal ? Math.min((totalCal / goalCal) * 100, 100) : 0;

  const isToday = date === todayKey();
  const hour = new Date().getHours();
  const reminders: { icon: React.ReactNode; text: string }[] = [];
  if (isToday) {
    if (hour >= 10 && day.breakfast.length === 0)
      reminders.push({ icon: <UtensilsCrossed className="h-4 w-4 shrink-0" />, text: 'Завтрак ещё не добавлен' });
    if (hour >= 14 && day.lunch.length === 0)
      reminders.push({ icon: <UtensilsCrossed className="h-4 w-4 shrink-0" />, text: 'Обед ещё не добавлен' });
    if (hour >= 19 && day.dinner.length === 0)
      reminders.push({ icon: <UtensilsCrossed className="h-4 w-4 shrink-0" />, text: 'Ужин ещё не добавлен' });
    if (hour >= 15 && water < 6)
      reminders.push({ icon: <Droplets className="h-4 w-4 shrink-0" />, text: `Выпито ${water} из 8 стаканов воды — не забывай пить!` });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setDate(shiftDay(date, -1))}>
          <ChevronLeft />
        </Button>
        <h2 className="min-w-52 text-center font-semibold">{formatLongDate(date)}</h2>
        <Button variant="outline" size="icon" onClick={() => setDate(shiftDay(date, 1))}>
          <ChevronRight />
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Съедено: <strong className="text-foreground">{Math.round(totalCal)}</strong> ккал
            </span>
            <span>
              Цель: <strong className="text-foreground">{goalCal ?? '—'}</strong> ккал
            </span>
          </div>
          <Progress
            value={pct}
            indicatorClassName={over ? 'bg-destructive' : 'bg-success'}
          />
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <MacroStat label="Б" eaten={totalP} goal={macroGoals?.protein ?? null} />
            <MacroStat label="Ж" eaten={totalF} goal={macroGoals?.fat ?? null} />
            <MacroStat label="У" eaten={totalC} goal={macroGoals?.carbs ?? null} />
          </div>
        </CardContent>
      </Card>

      {reminders.length > 0 && (
        <div className="space-y-2">
          {reminders.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300"
            >
              {r.icon}
              {r.text}
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>💧 Вода</span>
            <span>
              <strong className="text-primary">{water}</strong> / {WATER_GOAL} стак. ·{' '}
              {water * GLASS_ML} мл
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: Math.max(WATER_GOAL, water) }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-7 w-5 rounded-b-md rounded-t-sm border transition-colors',
                  i < water
                    ? 'border-primary bg-primary/80'
                    : 'border-border bg-secondary',
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => onChangeWater(date, -1)}>
              <Minus />
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-primary"
              onClick={() => onChangeWater(date, 1)}
            >
              <Plus /> стакан (250 мл)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Вес */}
      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Scale className="h-4 w-4" /> Вес</span>
            {todayWeight && (
              <span className="font-semibold text-foreground">{todayWeight} кг</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              min={20}
              max={300}
              placeholder="кг"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const w = parseFloat(weightInput);
                  if (w > 0) { onAddWeight(date, w); setWeightInput(''); }
                }
              }}
              className="flex h-9 w-28 rounded-md border bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                const w = parseFloat(weightInput);
                if (w > 0) { onAddWeight(date, w); setWeightInput(''); }
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Записать вес
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {MEALS.map((meal) => (
          <Card key={meal.id}>
            <CardContent className="p-0">
              <div className="border-b px-5 py-3 font-semibold">{meal.title}</div>
              <div className="px-5">
                {day[meal.id].map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 border-b py-2.5 text-sm last:border-b-0"
                  >
                    <span className="flex-1 font-medium">{entry.name}</span>
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {entry.amount}г · Б{entry.protein.toFixed(1)} Ж{entry.fat.toFixed(1)} У
                      {entry.carbs.toFixed(1)}
                    </span>
                    <span className="min-w-16 text-right font-semibold text-primary">
                      {Math.round(entry.cal)} ккал
                    </span>
                    <button
                      type="button"
                      aria-label="Удалить"
                      className="text-destructive opacity-60 hover:opacity-100"
                      onClick={() => onRemoveEntry(date, meal.id, idx)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="w-full border-t px-5 py-3 text-left text-sm font-medium text-primary hover:bg-accent"
                onClick={() => setDialogMeal(meal.id)}
              >
                + Добавить продукт
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AddEntryDialog
        open={dialogMeal !== null}
        onOpenChange={(o) => !o && setDialogMeal(null)}
        foods={foods}
        onAdd={(entry) => {
          if (dialogMeal) onAddEntry(date, dialogMeal, entry);
        }}
      />
    </div>
  );
}

function MacroStat({ label, eaten, goal }: { label: string; eaten: number; goal: number | null }) {
  return (
    <span>
      {label}:{' '}
      <strong className={cn(
        goal != null && eaten > goal * 1.1 ? 'text-destructive' : 'text-foreground'
      )}>
        {eaten.toFixed(0)}
      </strong>
      {goal != null && <span className="text-muted-foreground"> / {goal}г</span>}
      {goal == null && <span className="text-muted-foreground">г</span>}
    </span>
  );
}
