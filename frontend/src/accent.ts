// ============================================================
// accent.ts - the accent-colour setting (a REAL, working setting).
//
// The user can pick an accent colour in Settings. The choice is
// saved in the browser (localStorage) and applied by overriding
// the --color-primary CSS variables on the page root, so it
// changes the whole site and sticks after a refresh.
// ============================================================

export interface Accent {
    key: string;
    label: string;
    primary: string;
    hover: string;
}

// the preset accent colours to choose from
export const ACCENTS: Accent[] = [
    { key: 'purple', label: 'Purple', primary: '#8B7CF6', hover: '#A395FF' },
    { key: 'cyan',   label: 'Cyan',   primary: '#22D3EE', hover: '#55E2F5' },
    { key: 'teal',   label: 'Teal',   primary: '#2DD4BF', hover: '#5EE6D5' },
    { key: 'pink',   label: 'Pink',   primary: '#F471B5', hover: '#F894CB' },
    { key: 'gold',   label: 'Gold',   primary: '#F0B44A', hover: '#F5C874' },
];

const STORAGE_KEY = 'crk_accent';

export function getSavedAccent(): string {
    return localStorage.getItem(STORAGE_KEY) || 'purple';
}

// apply an accent by overriding the CSS variables on :root
export function applyAccent(key: string) {
    const accent = ACCENTS.find(a => a.key === key) ?? ACCENTS[0];
    const root = document.documentElement;
    root.style.setProperty('--color-primary', accent.primary);
    root.style.setProperty('--color-primary-hover', accent.hover);
    root.style.setProperty('--gradient-primary',
        `linear-gradient(135deg, ${accent.primary} 0%, ${accent.hover} 100%)`);
    root.style.setProperty('--glow-primary', `0 0 24px ${accent.primary}73`); // 73 = ~45% alpha
    localStorage.setItem(STORAGE_KEY, accent.key);
}
