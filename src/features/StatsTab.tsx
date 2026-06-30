import { useRef } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { lastNDays, todayKey } from '@/lib/date';
import { loadAutoBackup } from '@/hooks/useAutoBackup';
import type { Diary, Food } from '@/lib/types';

const MEALS = ['breakfast', 'breakfast2', 'lunch', 'afternoon', 'dinner', 'dinner2', 'snack'] as const;

interface Props {
  diary: Diary;
  goalCal: number | null;
  foods: Food[];
  onImport: (data: { foods?: Food[]; diary?: Diary; goalCal?: number | null }) => void;
}

function dayCalories(diary: Diary, key: string): number {
  const day = diary[key];
  if (!day) return 0;
  return MEALS.reduce((sum, m) => sum + day[m].reduce((s, e) => s + e.cal, 0), 0);
}

export function StatsTab({ diary, goalCal, foods, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const today = todayKey();
  const autoBackup = loadAutoBackup();
  const days = lastNDays(7);
  const cals = days.map((d) => dayCalories(diary, d));
  const scale = Math.max(goalCal ?? 0, ...cals, 1) * 1.15;

  const logged = cals.filter((c) => c > 0);
  const avg = logged.length
    ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length)
    : 0;

  function exportData() {
    const data = { version: 1, exportedAt: new Date().toISOString(), foods, diary, goalCal };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calories-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        onImport(data);
        alert('Данные успешно импортированы.');
      } catch (err) {
        alert('Не удалось прочитать файл: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Калории за последние 7 дней</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative flex h-52 items-end gap-2">
            {days.map((key, i) => {
              const cal = cals[i];
              const h = (cal / scale) * 100;
              const isOver = goalCal != null && cal > goalCal;
              return (
                <div key={key} className="flex h-full flex-1 flex-col items-center justify-end">
                  <div className="mb-1 text-[0.7rem] text-muted-foreground">
                    {cal ? Math.round(cal) : ''}
                  </div>
                  <div
                    className={cn(
                      'w-[70%] max-w-10 rounded-t-md transition-all',
                      !cal ? 'bg-border' : isOver ? 'bg-destructive' : 'bg-success',
                    )}
                    style={{ height: `${h}%`, minHeight: 2 }}
                  />
                </div>
              );
            })}
            {goalCal != null && (
              <div
                className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-primary"
                style={{ bottom: `${Math.min((goalCal / scale) * 100, 100)}%` }}
              >
                <span className="absolute right-0 -top-4 bg-card px-1 text-[0.68rem] text-primary">
                  цель {goalCal}
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            {days.map((key) => {
              const d = new Date(key + 'T00:00:00');
              const wd = d.toLocaleDateString('ru-RU', { weekday: 'short' });
              return (
                <span
                  key={key}
                  className={cn(
                    'flex-1 text-center text-xs leading-tight text-muted-foreground',
                    key === today && 'font-bold text-primary',
                  )}
                >
                  {wd}
                  <br />
                  {d.getDate()}
                </span>
              );
            })}
          </div>
          <div className="mt-4 border-t pt-3 text-sm text-muted-foreground">
            Среднее за дни с записями: {avg} ккал
            {goalCal != null && ` · дневная цель: ${goalCal} ккал`}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Резервная копия</CardTitle>
          <CardDescription>
            Сохраните все данные (продукты, дневник, цель) в файл или восстановите их на
            другом устройстве.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={exportData}>
              <Download /> Экспорт в JSON
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload /> Импорт из JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importData(file);
                e.target.value = '';
              }}
            />
          </div>

          {autoBackup && (
            <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                Авто-бэкап от <strong className="text-foreground">{autoBackup.date}</strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Восстановить данные из авто-бэкапа от ${autoBackup.date}? Текущие данные будут заменены.`)) {
                    onImport(autoBackup);
                  }
                }}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Восстановить
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
