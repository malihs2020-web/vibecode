import { HANDS } from '@/lib/hands';
import type { HandResult } from '@/lib/pushEv';
import { cn } from '@/lib/utils';

export type ResultMode = 'ev' | 'equity' | 'required';

interface Props {
  results: HandResult[];
  mode: ResultMode;
  hovered: number | null;
  onHover: (id: number | null) => void;
}

const pct = (x: number) => `${Math.round(x * 100)}`;

function cellLabel(r: HandResult, mode: ResultMode): string {
  if (mode === 'required') return r.required <= 0 ? 'любое' : pct(r.required);
  if (r.ev === null || r.equity === null) return '…';
  if (mode === 'equity') return r.callCombos === 0 ? '—' : pct(r.equity);
  return (r.ev > 0 ? '+' : '') + r.ev.toFixed(1);
}

/** Цвет клетки: зелёный — пуш в плюс, красный — в минус; насыщенность — насколько */
function cellStyle(r: HandResult): React.CSSProperties {
  if (r.ev === null) return {};
  const strength = Math.min(1, Math.abs(r.ev) / 8);
  const alpha = 0.18 + strength * 0.72;
  return r.ev > 0
    ? { backgroundColor: `hsl(var(--success) / ${alpha})` }
    : { backgroundColor: `hsl(var(--destructive) / ${0.08 + strength * 0.3})` };
}

export function ResultGrid({ results, mode, hovered, onHover }: Props) {
  return (
    <div
      className="grid select-none gap-[2px]"
      style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
      onPointerLeave={() => onHover(null)}
    >
      {HANDS.map((h) => {
        const r = results[h.id];
        const plus = r.ev !== null && r.ev > 0;
        return (
          <div
            key={h.id}
            onPointerEnter={() => onHover(h.id)}
            style={cellStyle(r)}
            className={cn(
              'flex aspect-square flex-col items-center justify-center rounded-[3px] bg-muted/50 leading-none',
              hovered === h.id && 'ring-2 ring-primary',
            )}
          >
            <span className={cn('text-[10px] font-semibold sm:text-[11px]', plus ? 'text-foreground' : 'text-foreground/70')}>
              {h.name}
            </span>
            <span className="mt-0.5 text-[9px] tabular-nums text-foreground/70 sm:text-[10px]">
              {cellLabel(r, mode)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
