import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HANDS, TOTAL_COMBOS, emptyRange, rangeCombos, type Range } from '@/lib/hands';
import { formatRange, parseRange } from '@/lib/range';
import type { Preset } from '@/lib/presets';
import { cn } from '@/lib/utils';

interface Props {
  value: Range;
  onChange: (r: Range) => void;
  presets: Preset[];
  /** Руки, которые можно выбрать; остальные показываются бледными (для колла — вне 3-бета) */
  allowed?: Range;
}

/** Сетка 13×13: клик переключает руку, протягивание мышью закрашивает сразу несколько */
export function RangeEditor({ value, onChange, presets, allowed }: Props) {
  const [text, setText] = useState(() => formatRange(value));
  const [errors, setErrors] = useState<string[]>([]);
  const paint = useRef<boolean | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Сетка изменилась — обновляем строку
  useEffect(() => {
    setText(formatRange(value));
    setErrors([]);
  }, [value]);

  useEffect(() => {
    const stop = () => (paint.current = null);
    window.addEventListener('pointerup', stop);
    return () => window.removeEventListener('pointerup', stop);
  }, []);

  function setCell(id: number, on: boolean) {
    if (valueRef.current[id] === on) return;
    const next = valueRef.current.slice();
    next[id] = on;
    valueRef.current = next;
    onChange(next);
  }

  function applyText(t: string) {
    const res = parseRange(t);
    setErrors(res.errors);
    if (res.errors.length === 0) onChange(res.range);
  }

  const combos = rangeCombos(value);

  return (
    <div className="space-y-3">
      <div
        className="grid select-none gap-[2px] touch-none"
        style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
      >
        {HANDS.map((h) => {
          const on = value[h.id];
          const outside = allowed && !allowed[h.id];
          return (
            <button
              key={h.id}
              type="button"
              title={`${h.name} — ${h.combos} комб.`}
              onPointerDown={(e) => {
                e.preventDefault();
                paint.current = !on;
                setCell(h.id, !on);
              }}
              onPointerEnter={() => {
                if (paint.current !== null) setCell(h.id, paint.current);
              }}
              className={cn(
                'aspect-square rounded-[3px] text-[10px] font-medium leading-none transition-colors sm:text-[11px]',
                on
                  ? outside
                    ? 'bg-primary/35 text-primary-foreground line-through'
                    : 'bg-primary text-primary-foreground'
                  : h.kind === 'pair'
                    ? 'bg-muted text-foreground/80 hover:bg-accent'
                    : 'bg-muted/60 text-muted-foreground hover:bg-accent',
                outside && !on && 'opacity-40',
              )}
            >
              {h.name}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {combos} комб. · {((combos / TOTAL_COMBOS) * 100).toFixed(1)}% рук
        </span>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onChange(emptyRange())}>
          Очистить
        </Button>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          applyText(text);
        }}
      >
        <Input
          value={text}
          placeholder="Например: QQ+, AKs, A5s-A2s"
          onChange={(e) => setText(e.target.value)}
          onBlur={() => applyText(text)}
          className="font-mono text-xs"
        />
        <Button type="submit" variant="secondary">
          OK
        </Button>
      </form>
      {errors.length > 0 && (
        <p className="text-xs text-destructive">Не понял: {errors.join(', ')}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <Button
            key={p.label}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => applyText(p.range)}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
