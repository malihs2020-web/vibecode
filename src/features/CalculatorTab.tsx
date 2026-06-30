import { useState } from 'react';

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
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, calculate, type CalcResult } from '@/lib/calc';
import type { Gender } from '@/lib/types';

interface Props {
  onGoalChange: (tdee: number) => void;
}

function bmiBadgeVariant(label: string) {
  if (label === 'Норма') return 'success' as const;
  if (label === 'Недовес') return 'secondary' as const;
  return 'destructive' as const;
}

export function CalculatorTab({ onGoalChange }: Props) {
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState('25');
  const [weight, setWeight] = useState('70');
  const [height, setHeight] = useState('175');
  const [activity, setActivity] = useState('1.55');
  const [goal, setGoal] = useState('0');
  const [result, setResult] = useState<CalcResult | null>(null);

  function handleCalculate() {
    const a = +age;
    const w = +weight;
    const h = +height;
    if (!a || !w || !h) return;
    const res = calculate({
      gender,
      age: a,
      weight: w,
      height: h,
      activity: +activity,
      goal: +goal,
    });
    setResult(res);
    onGoalChange(res.tdee);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Параметры</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Пол</Label>
              <RadioGroup
                value={gender}
                onValueChange={(v) => setGender(v as Gender)}
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
              <Input
                id="age"
                type="number"
                min={10}
                max={100}
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </Field>
            <Field id="weight" label="Вес (кг)">
              <Input
                id="weight"
                type="number"
                min={30}
                max={300}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </Field>
            <Field id="height" label="Рост (см)">
              <Input
                id="height"
                type="number"
                min={100}
                max={250}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </Field>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Уровень активности</Label>
              <Select value={activity} onValueChange={setActivity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Цель</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full sm:w-auto" onClick={handleCalculate}>
            Рассчитать
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="col-span-2 border-0 bg-primary text-primary-foreground sm:col-span-3">
            <CardContent className="p-5 text-center">
              <div className="text-xs opacity-80">Суточная норма</div>
              <div className="text-4xl font-bold" data-testid="res-tdee">
                {result.tdee}
              </div>
              <div className="text-xs opacity-75">ккал/день</div>
            </CardContent>
          </Card>
          <ResultCard label="Базальный обмен (BMR)" value={result.bmr} unit="ккал" />
          <ResultCard label="Белки" value={result.protein} unit="г/день" />
          <ResultCard label="Жиры" value={result.fat} unit="г/день" />
          <ResultCard label="Углеводы" value={result.carbs} unit="г/день" />
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
      )}
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function ResultCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
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
