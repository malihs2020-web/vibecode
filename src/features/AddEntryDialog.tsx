import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';

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
import { compressImage, groqKey, parseFoodPhoto, parseFoodText, type ParsedFoodEntry } from '@/lib/groq';
import type { Entry, Food } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  foods: Food[];
  onAdd: (entry: Entry) => void;
}

type Mode = 'search' | 'ai' | 'photo';

interface EditableResult {
  name: string;
  grams: string;
  cal: string;
  protein: string;
  fat: string;
  carbs: string;
  // per-gram ratios for proportional recalc when grams change
  calPg: number;
  proteinPg: number;
  fatPg: number;
  carbsPg: number;
}

function toEditable(e: ParsedFoodEntry): EditableResult {
  const g = e.grams > 0 ? e.grams : 100;
  return {
    name: e.name,
    grams: String(e.grams),
    cal: String(Math.round(e.cal)),
    protein: e.protein.toFixed(1),
    fat: e.fat.toFixed(1),
    carbs: e.carbs.toFixed(1),
    calPg: e.cal / g,
    proteinPg: e.protein / g,
    fatPg: e.fat / g,
    carbsPg: e.carbs / g,
  };
}

function patchEntry(list: EditableResult[], idx: number, field: string, value: string): EditableResult[] {
  return list.map((item, i) => {
    if (i !== idx) return item;
    if (field === 'grams') {
      const g = parseFloat(value);
      if (!isNaN(g) && g > 0) {
        return {
          ...item,
          grams: value,
          cal: String(Math.round(item.calPg * g)),
          protein: (item.proteinPg * g).toFixed(1),
          fat: (item.fatPg * g).toFixed(1),
          carbs: (item.carbsPg * g).toFixed(1),
        };
      }
      return { ...item, grams: value };
    }
    return { ...item, [field]: value };
  });
}

function renderResults(
  items: EditableResult[],
  onPatch: (idx: number, field: string, value: string) => void,
  onAddAll: () => void,
  onClose: () => void,
) {
  return (
    <div className="space-y-2">
      <div className="rounded-md border divide-y">
        {items.map((item, i) => (
          <div key={i} className="px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{item.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                <Input
                  type="number"
                  min={0}
                  value={item.cal}
                  onChange={(e) => onPatch(i, 'cal', e.target.value)}
                  className="w-16 h-7 text-xs px-1.5 text-right"
                />
                <span className="text-xs text-muted-foreground">ккал</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="text-xs text-muted-foreground">Вес</span>
              <Input
                type="number"
                min={1}
                value={item.grams}
                onChange={(e) => onPatch(i, 'grams', e.target.value)}
                className="w-14 h-7 text-xs px-1.5"
              />
              <span className="text-xs text-muted-foreground">г ·</span>
              <span className="text-xs text-muted-foreground">Б</span>
              <Input
                type="number"
                min={0}
                value={item.protein}
                onChange={(e) => onPatch(i, 'protein', e.target.value)}
                className="w-12 h-7 text-xs px-1.5"
              />
              <span className="text-xs text-muted-foreground">Ж</span>
              <Input
                type="number"
                min={0}
                value={item.fat}
                onChange={(e) => onPatch(i, 'fat', e.target.value)}
                className="w-12 h-7 text-xs px-1.5"
              />
              <span className="text-xs text-muted-foreground">У</span>
              <Input
                type="number"
                min={0}
                value={item.carbs}
                onChange={(e) => onPatch(i, 'carbs', e.target.value)}
                className="w-12 h-7 text-xs px-1.5"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button onClick={onAddAll}>Добавить всё</Button>
      </div>
    </div>
  );
}

export function AddEntryDialog({ open, onOpenChange, foods, onAdd }: Props) {
  const hasGroq = Boolean(groqKey());
  const [mode, setMode] = useState<Mode>('search');

  // search mode
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Food | null>(null);
  const [amount, setAmount] = useState('100');

  // ai text mode
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<EditableResult[]>([]);

  // photo mode
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoResults, setPhotoResults] = useState<EditableResult[]>([]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(null);
      setAmount('100');
      setAiText('');
      setAiError(null);
      setAiResults([]);
      setPhotoPreview(null);
      setPhotoError(null);
      setPhotoResults([]);
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
      setAiResults(parsed.map(toEditable));
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
        amount: parseFloat(item.grams) || 0,
        cal: parseFloat(item.cal) || 0,
        protein: parseFloat(item.protein) || 0,
        fat: parseFloat(item.fat) || 0,
        carbs: parseFloat(item.carbs) || 0,
      });
    }
    onOpenChange(false);
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setPhotoResults([]);
    try {
      const dataUrl = await compressImage(file);
      setPhotoPreview(dataUrl);
    } catch {
      setPhotoError('Не удалось загрузить изображение');
    }
    e.target.value = '';
  }

  async function handlePhotoRecognize() {
    if (!photoPreview) return;
    setPhotoLoading(true);
    setPhotoError(null);
    setPhotoResults([]);
    try {
      const parsed = await parseFoodPhoto(photoPreview);
      setPhotoResults(parsed.map(toEditable));
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Ошибка запроса');
    } finally {
      setPhotoLoading(false);
    }
  }

  function addAllPhotoResults() {
    for (const item of photoResults) {
      onAdd({
        foodId: uid(),
        name: item.name,
        amount: parseFloat(item.grams) || 0,
        cal: parseFloat(item.cal) || 0,
        protein: parseFloat(item.protein) || 0,
        fat: parseFloat(item.fat) || 0,
        carbs: parseFloat(item.carbs) || 0,
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
            {(['search', 'ai', 'photo'] as const).map((m) => (
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
                {m === 'search' ? 'Поиск' : m === 'ai' ? '✨ Текст' : '📷 Фото'}
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

        {mode === 'photo' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Сфотографируйте блюдо — AI оценит состав. Вес и КБЖУ можно скорректировать перед добавлением.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                Камера
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => galleryInputRef.current?.click()}
              >
                🖼️ Галерея
              </Button>
            </div>
            {photoPreview && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => galleryInputRef.current?.click()}
              >
                Выбрать другое фото
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Если камера недоступна — проверь разрешения: Настройки телефона → Telegram → Камера → Разрешить.
            </p>

            {photoPreview && (
              <>
                <img
                  src={photoPreview}
                  alt="Превью"
                  className="w-full rounded-md border object-cover max-h-48"
                />
                <Button
                  className="w-full"
                  onClick={handlePhotoRecognize}
                  disabled={photoLoading}
                >
                  {photoLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Распознаю...</>
                  ) : (
                    'Распознать'
                  )}
                </Button>
              </>
            )}

            {photoError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {photoError}
              </p>
            )}

            {photoResults.length > 0 && renderResults(
              photoResults,
              (idx, field, value) => setPhotoResults((prev) => patchEntry(prev, idx, field, value)),
              addAllPhotoResults,
              () => onOpenChange(false),
            )}
          </div>
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Считаю...</>
              ) : (
                'Распознать'
              )}
            </Button>

            {aiError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {aiError}
              </p>
            )}

            {aiResults.length > 0 && renderResults(
              aiResults,
              (idx, field, value) => setAiResults((prev) => patchEntry(prev, idx, field, value)),
              addAllAiResults,
              () => onOpenChange(false),
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
