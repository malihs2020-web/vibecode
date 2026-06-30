import { useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, Droplets, Minus, Plus, Scale, Settings2, UtensilsCrossed, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatLongDate, shiftDay, todayKey } from '@/lib/date';
import { isTelegram } from '@/hooks/useTelegram';
import { syncTelegramReminders } from '@/lib/telegramApi';
import type { AppSettings, Diary, DiaryDay, Entry, Food, MacroGoals, MealType, ReminderKey, ReminderSetting, WeightEntry } from '@/lib/types';
import { AddEntryDialog } from './AddEntryDialog';

const ALL_MEALS: { id: MealType; title: string }[] = [
  { id: 'breakfast',  title: '🌅 Завтрак' },
  { id: 'breakfast2', title: '🥐 Второй завтрак' },
  { id: 'lunch',      title: '☀️ Обед' },
  { id: 'afternoon',  title: '🍵 Полдник' },
  { id: 'dinner',     title: '🌙 Ужин' },
  { id: 'dinner2',    title: '🌛 Второй ужин' },
  { id: 'snack',      title: '🍎 Перекус' },
];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast:  'Завтрак',
  breakfast2: 'Второй завтрак',
  lunch:      'Обед',
  afternoon:  'Полдник',
  dinner:     'Ужин',
  dinner2:    'Второй ужин',
  snack:      'Перекус',
};

const GLASS_OPTIONS = [100, 150, 200, 250, 300, 330, 500];
const WATER_GOAL_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 12];
const DEFAULT_REMINDER_TIME = '09:00';

const EMPTY_DAY: DiaryDay = {
  breakfast: [], breakfast2: [], lunch: [], afternoon: [],
  dinner: [], dinner2: [], snack: [], water: 0,
};

interface Props {
  diary: Diary;
  goalCal: number | null;
  macroGoals: MacroGoals | null;
  foods: Food[];
  weightLog: WeightEntry[];
  settings: AppSettings;
  onAddEntry: (date: string, meal: MealType, entry: Entry) => void;
  onRemoveEntry: (date: string, meal: MealType, idx: number) => void;
  onChangeWater: (date: string, delta: number) => void;
  onAddWeight: (date: string, weight: number) => void;
  onSettingsChange: (s: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
}

export function DiaryTab({
  diary,
  goalCal,
  macroGoals,
  foods,
  weightLog,
  settings,
  onAddEntry,
  onRemoveEntry,
  onChangeWater,
  onAddWeight,
  onSettingsChange,
}: Props) {
  const [date, setDate] = useState(todayKey());
  const [dialogMeal, setDialogMeal] = useState<MealType | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const todayWeight = weightLog.find((e) => e.date === date)?.weight ?? null;
  const activeMeals = ALL_MEALS.filter((m) => settings.activeMeals.includes(m.id));
  const { glassML, waterGoal } = settings;

  const day = diary[date] ?? EMPTY_DAY;
  const water = day.water ?? 0;

  let totalCal = 0, totalP = 0, totalF = 0, totalC = 0;
  for (const meal of ALL_MEALS) {
    for (const e of day[meal.id]) {
      totalCal += e.cal; totalP += e.protein; totalF += e.fat; totalC += e.carbs;
    }
  }

  const over = goalCal != null && totalCal > goalCal;
  const pct = goalCal ? Math.min((totalCal / goalCal) * 100, 100) : 0;

  const isToday = date === todayKey();
  const hour = new Date().getHours();
  const reminders: { icon: React.ReactNode; text: string }[] = [];
  if (isToday) {
    if (settings.activeMeals.includes('breakfast') && hour >= 10 && day.breakfast.length === 0)
      reminders.push({ icon: <UtensilsCrossed className="h-4 w-4 shrink-0" />, text: 'Завтрак ещё не добавлен' });
    if (settings.activeMeals.includes('lunch') && hour >= 14 && day.lunch.length === 0)
      reminders.push({ icon: <UtensilsCrossed className="h-4 w-4 shrink-0" />, text: 'Обед ещё не добавлен' });
    if (settings.activeMeals.includes('dinner') && hour >= 19 && day.dinner.length === 0)
      reminders.push({ icon: <UtensilsCrossed className="h-4 w-4 shrink-0" />, text: 'Ужин ещё не добавлен' });
    if (hour >= 15 && water < Math.round(waterGoal * 0.75))
      reminders.push({ icon: <Droplets className="h-4 w-4 shrink-0" />, text: `Выпито ${water} из ${waterGoal} стаканов воды — не забывай пить!` });
  }

  function toggleMeal(id: MealType) {
    onSettingsChange((prev) => {
      const active = prev.activeMeals.includes(id)
        ? prev.activeMeals.filter((m) => m !== id)
        : [...prev.activeMeals, id];
      // минимум 1 приём пищи
      if (active.length === 0) return prev;
      return { ...prev, activeMeals: active };
    });
  }

  function saveWeight() {
    const w = parseFloat(weightInput);
    if (w > 0) { onAddWeight(date, w); setWeightInput(''); }
  }

  function updateReminder(key: ReminderKey, setting: ReminderSetting) {
    onSettingsChange((prev) => {
      const next = { ...prev, telegramReminders: { ...prev.telegramReminders, [key]: setting } };
      syncTelegramReminders(next.telegramReminders);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Навигация по датам */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setDate(shiftDay(date, -1))}>
          <ChevronLeft />
        </Button>
        <h2 className="min-w-52 text-center font-semibold">{formatLongDate(date)}</h2>
        <Button variant="outline" size="icon" onClick={() => setDate(shiftDay(date, 1))}>
          <ChevronRight />
        </Button>
      </div>

      {/* Итого за день */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Съедено: <strong className="text-foreground">{Math.round(totalCal)}</strong> ккал</span>
            <span>Цель: <strong className="text-foreground">{goalCal ?? '—'}</strong> ккал</span>
          </div>
          <Progress value={pct} indicatorClassName={over ? 'bg-destructive' : 'bg-success'} />
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <MacroStat label="Б" eaten={totalP} goal={macroGoals?.protein ?? null} />
            <MacroStat label="Ж" eaten={totalF} goal={macroGoals?.fat ?? null} />
            <MacroStat label="У" eaten={totalC} goal={macroGoals?.carbs ?? null} />
          </div>
        </CardContent>
      </Card>

      {/* Напоминания */}
      {reminders.length > 0 && (
        <div className="space-y-2">
          {reminders.map((r, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
              {r.icon}{r.text}
            </div>
          ))}
        </div>
      )}

      {/* Вода */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>💧 Вода</span>
            <span>
              <strong className="text-primary">{water}</strong> / {waterGoal} стак. · {water * glassML} мл
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: Math.max(waterGoal, water) }).map((_, i) => (
              <div key={i} className={cn(
                'h-7 w-5 rounded-b-md rounded-t-sm border transition-colors',
                i < water ? 'border-primary bg-primary/80' : 'border-border bg-secondary',
              )} />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => onChangeWater(date, -1)}>
              <Minus />
            </Button>
            <Button variant="outline" className="flex-1 text-primary" onClick={() => onChangeWater(date, 1)}>
              <Plus /> стакан ({glassML} мл)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Вес */}
      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Scale className="h-4 w-4" /> Вес</span>
            {todayWeight && <span className="font-semibold text-foreground">{todayWeight} кг</span>}
          </div>
          <div className="flex gap-2">
            <input
              type="number" step="0.1" min={20} max={300} placeholder="кг"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveWeight()}
              className="flex h-9 w-28 rounded-md border bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button variant="outline" className="flex-1" onClick={saveWeight}>
              <Plus className="mr-1 h-4 w-4" /> Записать вес
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Приёмы пищи */}
      <div className="space-y-3">
        {activeMeals.map((meal) => (
          <Card key={meal.id}>
            <CardContent className="p-0">
              <div className="border-b px-5 py-3 font-semibold">{meal.title}</div>
              <div className="px-5">
                {day[meal.id].map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-3 border-b py-2.5 text-sm last:border-b-0">
                    <span className="flex-1 font-medium">{entry.name}</span>
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {entry.amount}г · Б{entry.protein.toFixed(1)} Ж{entry.fat.toFixed(1)} У{entry.carbs.toFixed(1)}
                    </span>
                    <span className="min-w-16 text-right font-semibold text-primary">
                      {Math.round(entry.cal)} ккал
                    </span>
                    <button type="button" aria-label="Удалить"
                      className="text-destructive opacity-60 hover:opacity-100"
                      onClick={() => onRemoveEntry(date, meal.id, idx)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button"
                className="w-full border-t px-5 py-3 text-left text-sm font-medium text-primary hover:bg-accent"
                onClick={() => setDialogMeal(meal.id)}>
                + Добавить продукт
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Настройки дневника */}
      <div>
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings2 className="h-4 w-4" />
          Настройки дневника
        </button>

        {showSettings && (
          <Card className="mt-2">
            <CardContent className="space-y-4 p-5">
              {/* Приёмы пищи */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Приёмы пищи</div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_MEALS.map((m) => (
                    <label key={m.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={settings.activeMeals.includes(m.id)}
                        onChange={() => toggleMeal(m.id)}
                        className="rounded"
                      />
                      {m.title} {MEAL_LABELS[m.id]}
                    </label>
                  ))}
                </div>
              </div>

              {/* Объём стакана */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Объём стакана</div>
                <div className="flex flex-wrap gap-2">
                  {GLASS_OPTIONS.map((ml) => (
                    <button
                      key={ml}
                      type="button"
                      onClick={() => onSettingsChange((p) => ({ ...p, glassML: ml }))}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs transition-colors',
                        glassML === ml
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:bg-accent',
                      )}
                    >
                      {ml} мл
                    </button>
                  ))}
                </div>
              </div>

              {/* Цель по воде */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Цель по воде (стаканов в день)</div>
                <div className="flex flex-wrap gap-2">
                  {WATER_GOAL_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onSettingsChange((p) => ({ ...p, waterGoal: n }))}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs transition-colors',
                        waterGoal === n
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:bg-accent',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Уведомления в Telegram */}
              {isTelegram() && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Bell className="h-4 w-4" /> Уведомления в Telegram
                  </div>
                  <div className="space-y-2">
                    {[...activeMeals.map((m) => ({ key: m.id as ReminderKey, label: m.title })),
                      { key: 'water' as ReminderKey, label: '💧 Вода' }].map(({ key, label }) => {
                      const setting = settings.telegramReminders?.[key] ?? { enabled: false, time: DEFAULT_REMINDER_TIME };
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={setting.enabled}
                            onChange={(e) => updateReminder(key, { ...setting, enabled: e.target.checked })}
                            className="rounded"
                          />
                          <span className="flex-1">{label}</span>
                          <input
                            type="time"
                            value={setting.time}
                            disabled={!setting.enabled}
                            onChange={(e) => updateReminder(key, { ...setting, time: e.target.value })}
                            className="h-8 rounded-md border bg-background px-2 text-xs disabled:opacity-50"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <AddEntryDialog
        open={dialogMeal !== null}
        onOpenChange={(o) => !o && setDialogMeal(null)}
        foods={foods}
        onAdd={(entry) => { if (dialogMeal) onAddEntry(date, dialogMeal, entry); }}
      />
    </div>
  );
}

function MacroStat({ label, eaten, goal }: { label: string; eaten: number; goal: number | null }) {
  return (
    <span>
      {label}:{' '}
      <strong className={cn(goal != null && eaten > goal * 1.1 ? 'text-destructive' : 'text-foreground')}>
        {eaten.toFixed(0)}
      </strong>
      {goal != null && <span className="text-muted-foreground"> / {goal}г</span>}
      {goal == null && <span className="text-muted-foreground">г</span>}
    </span>
  );
}
