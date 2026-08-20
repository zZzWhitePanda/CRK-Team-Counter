// the sort by dropdown and direction button

import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import { SortField, SORT_OPTIONS, directionLabel } from '../cookieSort';

interface Props {
    field: SortField;
    ascending: boolean;
    onFieldChange: (f: SortField) => void;
    onToggleDirection: () => void;
    compact?: boolean;      // smaller version
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
                className="sort-direction icon-only"
                onClick={onToggleDirection}
                title={directionLabel(field, ascending) + ' (click to reverse)'}
                aria-label={`Sorting ${directionLabel(field, ascending)}, click to reverse`}
            >
                {ascending
                    ? <ArrowUpNarrowWide size={18} aria-hidden="true" />
                    : <ArrowDownWideNarrow size={18} aria-hidden="true" />}
            </button>
        </div>
    );
}
