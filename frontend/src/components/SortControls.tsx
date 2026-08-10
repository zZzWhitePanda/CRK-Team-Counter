// ============================================================
// SortControls.tsx - the "Sort by [dropdown] [direction]" bar.
//
// Styled after paimon.moe: a proper drop-down for the field, and a
// separate button next to it that flips ascending / descending.
// Shared by the Cookies page and the cookie picker.
// ============================================================

import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import { SortField, SORT_OPTIONS, directionLabel } from '../cookieSort';

interface Props {
    field: SortField;
    ascending: boolean;
    onFieldChange: (f: SortField) => void;
    onToggleDirection: () => void;
    compact?: boolean;      // slightly smaller inside the picker popup
}

export function SortControls({ field, ascending, onFieldChange, onToggleDirection, compact }: Props) {
    return (
        <div className={'sort-controls' + (compact ? ' compact' : '')}>
            <label htmlFor="sort-field" className="sort-label">Sort by</label>

            <select
                id="sort-field"
                className="input sort-select"
                value={field}
                onChange={e => onFieldChange(e.target.value as SortField)}
            >
                {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>

            <button
                className="sort-direction"
                onClick={onToggleDirection}
                title={ascending ? 'Ascending — click for descending' : 'Descending — click for ascending'}
                aria-label={`Sorting ${ascending ? 'ascending' : 'descending'}, click to reverse`}
            >
                {ascending
                    ? <ArrowUpNarrowWide size={16} aria-hidden="true" />
                    : <ArrowDownWideNarrow size={16} aria-hidden="true" />}
                <span>{directionLabel(field, ascending)}</span>
            </button>
        </div>
    );
}
