import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { uid } from '@/lib/foods';
import { groqKey, parseFoodText, type ParsedFoodEntry } from '@/lib/groq';
import type { Entry, Food } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  foods: Food[];
  onAdd: (entry: Entry) => void;
}

type Mode = 'search' | 'ai';

export function AddEntryDialog({ open, onOpenChange, foods, onAdd }: Props) {
  const hasGroq = Boolean(groqKey());
  const [mode, setMode] = useState<Mode>('search');

  // search mode state
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Food | null>(null);
  const [amount, setAmount] = useState('100');

  // ai mode state
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<ParsedFoodEntry[]>([]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(null);
      setAmount('100');
      setAiText('');
      setAiError(null);
      setAiResults([]);
    }
  }, [open]);

  const results = useMemo(
    () => foods.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())),
    [foods, query],
  );

  const k = (+amount || 0) / 100;

  function confirmSearch() {
    if (!selected || !+amount) return;
    onAdd({
      foodId: selected.id,
      name: selected.name,
      amount: +amount,
      cal: selected.cal * k,
      protein: selected.protein * k,
      fat: selected.fat * k,
      carbs: selected.carbs * k,
    });
    onOpenChange(false);
  }

  async function handleAiParse() {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiResults([]);
    try {
      const parsed = await parseFoodText(aiText);
      setAiResults(parsed);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Ошибка запроса');
    } finally {
      setAiLoading(false);
    }
  }

  function addAllAiResults() {
    for (const item of aiResults) {
      onAdd({
        foodId: uid(),
        name: item.name,
        amount: item.grams,
        cal: item.cal,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
      });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить продукт</DialogTitle>
        </DialogHeader>

        {hasGroq && (
          <div className="flex gap-1 rounded-lg border bg-muted p-1">
            {(['search', 'ai'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 rounded-md py-1 text-sm font-medium transition-colors',
                  mode === m
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'search' ? 'Поиск' : '✨ Описать текстом'}
              </button>
            ))}
          </div>
        )}

        {mode === 'search' && (
          <>
            <Input
              autoFocus
              placeholder="Поиск..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <div className="max-h-56 overflow-y-auto rounded-md border">
              {results.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">Ничего не найдено</div>
              ) : (
                results.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelected(f)}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent',
                      selected?.id === f.id && 'bg-accent',
                    )}
                  >
                    <span>{f.name}</span>
                    <span className="text-xs text-muted-foreground">{f.cal} ккал</span>
                  </button>
                ))
              )}
            </div>

            {selected && (
              <div className="space-y-2">
                {selected.portions && selected.portions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.portions.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setAmount(String(p.grams))}
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                          +amount === p.grams
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:bg-accent',
                        )}
                      >
                        {p.label} · {p.grams}г
                      </button>
                    ))}
                  </div>
                )}
                <Label htmlFor="entry-amount">Количество (г / мл)</Label>
                <Input
                  id="entry-amount"
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  ≈ {Math.round(selected.cal * k)} ккал · Б{(selected.protein * k).toFixed(1)}г · Ж
                  {(selected.fat * k).toFixed(1)}г · У{(selected.carbs * k).toFixed(1)}г
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => onOpenChange(false)}>
                    Отмена
                  </Button>
                  <Button onClick={confirmSearch}>Добавить</Button>
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'ai' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Напишите, что вы съели — AI определит калории и БЖУ.
            </p>
            <textarea
              autoFocus
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="напр. «куриная грудка 150г и рис 200г»"
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={handleAiParse}
              disabled={aiLoading || !aiText.trim()}
            >
              {aiLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Считаю...
                </>
              ) : (
                'Распознать'
              )}
            </Button>

            {aiError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {aiError}
              </p>
            )}

            {aiResults.length > 0 && (
              <div className="space-y-2">
                <div className="rounded-md border divide-y">
                  {aiResults.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.grams}г · Б{item.protein.toFixed(1)} Ж{item.fat.toFixed(1)} У{item.carbs.toFixed(1)}
                        </div>
                      </div>
                      <span className="font-semibold text-primary">{Math.round(item.cal)} ккал</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => onOpenChange(false)}>
                    Отмена
                  </Button>
                  <Button onClick={addAllAiResults}>Добавить всё</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
