// Sandbox for tuning topping-board alignment. Only reachable at
// /topping-demo — not linked from anywhere. The per-slot arrow
// buttons write inline --slot-N-dx / --slot-N-dy on the wrapper,
// which ToppingCircle picks up via var(). The "Generated CSS"
// box shows what to paste into .topping-board in theme.css.
import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ToppingCircle } from '../components/ToppingCircle';
import { TOPPINGS } from '../gear';
import type { ToppingSlot } from '../gear';

type Nudge = { dx: number; dy: number };

// Starting values are the current production offsets so tuning
// picks up where the deploy left off. dx/dy are in % of board.
const START: Nudge[] = [
    { dx: -0.31, dy: -1.56 },
    { dx:  0.94, dy: -0.94 },
    { dx:  0.31, dy:  0.31 },
    { dx: -1.56, dy:  0    },
    { dx: -1.56, dy: -0.63 },
];

// Each arrow click nudges by this %. Shift = 5x.
const STEP = 0.2;

export function ToppingDemoPage() {
    const [slots, setSlots] = useState<(ToppingSlot | null)[]>([
        { toppingKey: 'raspberry',  isTart: false, substats: [] },
        { toppingKey: 'candy',      isTart: false, substats: [] },
        { toppingKey: 'walnut',     isTart: false, substats: [] },
        { toppingKey: 'applejelly', isTart: false, substats: [] },
        { toppingKey: 'almond',     isTart: false, substats: [] },
    ]);
    const [tart, setTart] = useState<string | null>(null);
    const [nudges, setNudges] = useState<Nudge[]>(START);

    function nudge(i: number, axis: 'dx'|'dy', d: number) {
        setNudges(ns => ns.map((n, idx) =>
            idx === i ? { ...n, [axis]: +(n[axis] + d).toFixed(2) } : n
        ));
    }
    function reset(i: number) {
        setNudges(ns => ns.map((n, idx) => idx === i ? START[i] : n));
    }
    function resetAll() { setNudges(START); }

    // Cycle each slot through every topping to check alignment for all
    const [ticker, setTicker] = useState(0);
    function cycleAll() {
        setTicker(t => t + 1);
        setSlots(slots.map((_, i) => ({
            toppingKey: TOPPINGS[(ticker + i) % TOPPINGS.length].key,
            isTart: false, substats: [],
        })));
    }

    const boardVars: any = {};
    nudges.forEach((n, i) => {
        boardVars[`--slot-${i}-dx`] = `${n.dx}%`;
        boardVars[`--slot-${i}-dy`] = `${n.dy}%`;
    });

    const generatedCss = [
        `.topping-board {`,
        ...nudges.map((n, i) =>
            `    --slot-${i}-dx: ${n.dx}%;   --slot-${i}-dy: ${n.dy}%;`),
        `}`,
    ].join('\n');

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>
            <h2 style={{ marginBottom: 6 }}>Topping board sandbox</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
                Nudge each slot until it sits nicely in its wedge, then
                paste the generated CSS at the bottom into theme.css.
                Arrows step by {STEP}%. Shift-click = 5×.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32 }}>
                <div style={boardVars as React.CSSProperties}>
                    <ToppingCircle slots={slots} tart={tart} onChange={setSlots} />
                </div>

                <div style={{ minWidth: 380 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                        <label>
                            Tart&nbsp;
                            <select className="input" value={tart ?? ''}
                                    onChange={e => setTart(e.target.value || null)}>
                                <option value="">none</option>
                                {TOPPINGS.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
                            </select>
                        </label>
                        <button className="btn-ghost" onClick={cycleAll}>Cycle toppings</button>
                        <button className="btn-ghost" onClick={resetAll}>Reset all</button>
                    </div>

                    <table style={{ width: '100%', fontSize: 13 }}>
                        <thead><tr style={{ color: 'var(--color-text-muted)' }}>
                            <th align="left">Slot</th><th>dx</th><th>dy</th>
                            <th>Arrows</th><th></th>
                        </tr></thead>
                        <tbody>
                            {nudges.map((n, i) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '8px 8px 8px 0' }}>{i}: {slots[i]?.toppingKey ?? '—'}</td>
                                    <td align="center" style={{ fontVariantNumeric: 'tabular-nums' }}>{n.dx}%</td>
                                    <td align="center" style={{ fontVariantNumeric: 'tabular-nums' }}>{n.dy}%</td>
                                    <td>
                                        <div style={{ display: 'inline-grid',
                                            gridTemplateColumns: 'repeat(3, 22px)',
                                            gridTemplateRows: 'repeat(3, 22px)', gap: 2 }}>
                                            <span/>
                                            <NudgeBtn onClick={e => nudge(i, 'dy', e.shiftKey ? -5*STEP : -STEP)}><ChevronUp size={14}/></NudgeBtn>
                                            <span/>
                                            <NudgeBtn onClick={e => nudge(i, 'dx', e.shiftKey ? -5*STEP : -STEP)}><ChevronLeft size={14}/></NudgeBtn>
                                            <span/>
                                            <NudgeBtn onClick={e => nudge(i, 'dx', e.shiftKey ?  5*STEP :  STEP)}><ChevronRight size={14}/></NudgeBtn>
                                            <span/>
                                            <NudgeBtn onClick={e => nudge(i, 'dy', e.shiftKey ?  5*STEP :  STEP)}><ChevronDown size={14}/></NudgeBtn>
                                            <span/>
                                        </div>
                                    </td>
                                    <td><button className="link-button" onClick={() => reset(i)}>reset</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <h3 style={{ marginTop: 32, marginBottom: 8, fontSize: 15 }}>Generated CSS</h3>
            <textarea readOnly value={generatedCss}
                style={{ width: '100%', height: 180, padding: 12,
                    fontFamily: 'ui-monospace, monospace', fontSize: 13,
                    background: 'var(--color-surface)', color: 'var(--color-text)',
                    border: '1px solid var(--color-border)', borderRadius: 8 }}
                onFocus={e => e.currentTarget.select()} />
        </div>
    );
}

function NudgeBtn({ children, onClick }: {
    children: React.ReactNode;
    onClick: (e: React.MouseEvent) => void;
}) {
    return (
        <button onClick={onClick} style={{
            width: 22, height: 22, padding: 0, display: 'grid', placeItems: 'center',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 4, cursor: 'pointer', color: 'var(--color-text)'
        }}>{children}</button>
    );
}
