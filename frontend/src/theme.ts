// theme system - a theme sets the CSS variables theme.css reads

export interface ThemeColors {
    background: string;   // page background
    surface: string;      // cards and panels
    text: string;         // text colour
    accent: string;       // buttons and links
}

export interface Theme {
    name: string;
    colors: ThemeColors;
    // optional background picture, as a data URI
    backgroundImage: string | null;
    // picture opacity, 0-1
    backgroundOpacity: number;
    // true if user made
    custom?: boolean;
}

// colour helpers

interface Rgb { r: number; g: number; b: number; }

export function hexToRgb(hex: string): Rgb {
    let h = hex.replace('#', '').trim();
// short form #abc -> #aabbcc
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    if (Number.isNaN(n) || h.length !== 6) return { r: 0, g: 0, b: 0 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex({ r, g, b }: Rgb): string {
    const part = (v: number) =>
        Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + part(r) + part(g) + part(b);
}

// blend two colours
function mix(a: string, b: string, amount: number): string {
    const x = hexToRgb(a), y = hexToRgb(b);
    return toHex({
        r: x.r + (y.r - x.r) * amount,
        g: x.g + (y.g - x.g) * amount,
        b: x.b + (y.b - x.b) * amount,
    });
}

// brightness of a colour, 0 to 1
export function brightness(hex: string): number {
    const { r, g, b } = hexToRgb(hex);
    return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

// is this a light theme?
export function isLight(theme: Theme): boolean {
    return brightness(theme.colors.background) > 0.5;
}

// black or white, whichever is readable
export function readableOn(hex: string): string {
    return brightness(hex) > 0.55 ? '#111111' : '#ffffff';
}

// colour with transparency
function withAlpha(hex: string, alpha: number): string {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// built-in themes

export const PRESET_THEMES: Theme[] = [
    {
        name: 'Dark',
        colors: {
            background: '#14162B',
            surface: '#242850',
            text: '#FFFFFF',
            accent: '#8B7CF6',
        },
        backgroundImage: null,
        backgroundOpacity: 0.25,
    },
    {
        name: 'Pink',
        colors: {
            background: '#DCD1D3',
            surface: '#DCD1D3',
            text: '#000000',
            accent: '#ffffff',
        },
        backgroundImage: null,
        backgroundOpacity: 0.25,
    },
    {
        name: 'Midnight',
        colors: {
            background: '#0B0E17',
            surface: '#161B29',
            text: '#E8ECF5',
            accent: '#22D3EE',
        },
        backgroundImage: null,
        backgroundOpacity: 0.25,
    },
    {
        name: 'Matcha',
        colors: {
            background: '#EEF2E6',
            surface: '#FFFFFF',
            text: '#1F2A1B',
            accent: '#4F8A3D',
        },
        backgroundImage: null,
        backgroundOpacity: 0.25,
    },
    {
        name: 'Strawberry',
        colors: {
            background: '#2A0E1B',
            surface: '#3D162A',
            text: '#FFE9F1',
            accent: '#F471B5',
        },
        backgroundImage: null,
        backgroundOpacity: 0.25,
    },
    {
        name: 'Parchment',
        colors: {
            background: '#F3E9D6',
            surface: '#FBF5E9',
            text: '#3A2E1C',
            accent: '#B4762A',
        },
        backgroundImage: null,
        backgroundOpacity: 0.25,
    },
];

export const DEFAULT_THEME: Theme = PRESET_THEMES[0];

// work out every CSS variable from the theme's four colours
export function applyTheme(theme: Theme) {
    const root = document.documentElement;
    const { background, surface, text, accent } = theme.colors;
    const light = brightness(background) > 0.5;

    // light and dark themes shade in opposite directions
    const deepen = (hex: string, amount: number) =>
        mix(hex, light ? '#000000' : '#000000', amount);
    const raise = (hex: string, amount: number) =>
        mix(hex, light ? '#000000' : '#ffffff', amount);

    const set = (name: string, value: string) => root.style.setProperty(name, value);

    // surfaces
    set('--color-bg-deep', background);
    set('--color-bg', light ? deepen(background, 0.03) : raise(background, 0.04));
    set('--color-sidebar', light ? deepen(surface, 0.05) : deepen(surface, 0.25));
    set('--color-card', surface);
    set('--color-card-hover', raise(surface, light ? 0.05 : 0.08));
    // inputs sit below cards
    set('--color-input', light ? deepen(surface, 0.08) : deepen(surface, 0.35));

    // text
    set('--color-text', text);
    // faded towards the background
    set('--color-text-body', mix(text, background, 0.22));
    set('--color-text-muted', mix(text, background, 0.45));

    // accent
    const accentHover = light
        ? mix(accent, '#000000', 0.18)     // darken on light
        : mix(accent, '#ffffff', 0.18);    // lighten on dark
    set('--color-primary', accent);
    set('--color-primary-hover', accentHover);
    set('--gradient-primary', `linear-gradient(135deg, ${accent} 0%, ${mix(accent, background, 0.25)} 100%)`);
    set('--glow-primary', `0 0 24px ${withAlpha(accent, light ? 0.35 : 0.45)}`);
    // text on top of the accent
    set('--color-on-primary', readableOn(accent));

    // lines and shadows
    set('--color-border', light ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.08)');
    set('--color-border-strong', light ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.14)');
    set('--shadow-card', light ? '0 4px 16px rgba(0,0,0,0.10)' : '0 4px 16px rgba(0,0,0,0.35)');
    set('--shadow-card-hover', light ? '0 10px 28px rgba(0,0,0,0.16)' : '0 10px 28px rgba(0,0,0,0.45)');

    // page background glows, built from the accent
    const glowA = withAlpha(accent, light ? 0.20 : 0.28);
    const glowB = withAlpha(accent, light ? 0.10 : 0.18);
    set('--page-background',
        `radial-gradient(1100px 620px at 72% -12%, ${glowA}, transparent 58%),`
        + `radial-gradient(820px 520px at 8% 4%, ${glowB}, transparent 55%),`
        + `${background}`);

    // grain is too strong on pale backgrounds
    set('--grain-opacity', light ? '0.02' : '0.04');

    // background picture
    if (theme.backgroundImage) {
        set('--background-image', `url("${theme.backgroundImage}")`);
        set('--background-image-opacity', String(theme.backgroundOpacity));
    } else {
        set('--background-image', 'none');
        set('--background-image-opacity', '0');
    }

    // lets CSS check the theme type
    root.setAttribute('data-theme', light ? 'light' : 'dark');
}

// saving the theme in the browser

const STORAGE_KEY = 'crk_theme';

export function loadLocalTheme(): Theme {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return normaliseTheme(JSON.parse(saved));
    } catch {
        // broken saved theme, use the default
    }
    return DEFAULT_THEME;
}

export function saveLocalTheme(theme: Theme) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch {
        // storage full or off, ignore
    }
}

// check a loaded theme is valid, filling gaps with the default
export function normaliseTheme(value: unknown): Theme {
    const fallback = DEFAULT_THEME;
    if (typeof value !== 'object' || value === null) return fallback;

    const v = value as Record<string, unknown>;
    const colors = (typeof v.colors === 'object' && v.colors !== null)
        ? v.colors as Record<string, unknown> : {};

    const colour = (key: keyof ThemeColors) => {
        const raw = colors[key];
        return typeof raw === 'string' && /^#[0-9a-fA-F]{3,6}$/.test(raw.trim())
            ? raw.trim() : fallback.colors[key];
    };

    const image = typeof v.backgroundImage === 'string'
        && v.backgroundImage.startsWith('data:image/')
        ? v.backgroundImage : null;

    const opacity = typeof v.backgroundOpacity === 'number'
        && v.backgroundOpacity >= 0 && v.backgroundOpacity <= 1
        ? v.backgroundOpacity : 0.25;

    return {
        name: typeof v.name === 'string' && v.name.trim() ? v.name.trim().slice(0, 40) : fallback.name,
        colors: {
            background: colour('background'),
            surface: colour('surface'),
            text: colour('text'),
            accent: colour('accent'),
        },
        backgroundImage: image,
        backgroundOpacity: opacity,
        custom: v.custom === true,
    };
}
