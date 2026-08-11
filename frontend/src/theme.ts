// ============================================================
// theme.ts - the whole theming system.
//
// This replaces the old accent-colour-only setting. A theme now
// controls the real colours of the site, and can carry a
// background image.
//
// HOW IT WORKS
// theme.css never uses a raw colour - every rule reads a CSS
// variable like var(--color-card). Applying a theme just means
// setting those variables on <html>, and the entire site changes
// at once. That's why the stylesheet was written that way.
//
// A theme only stores FOUR colours (background, surface, text,
// accent). Everything else the stylesheet needs - hover states,
// muted text, borders, input backgrounds - is worked out from
// those four by the colour maths below. That's what keeps the
// editor simple: you pick four colours, not twenty.
// ============================================================

export interface ThemeColors {
    background: string;   // the page behind everything
    surface: string;      // cards, the sidebar, panels
    text: string;         // main text colour
    accent: string;       // buttons, links, highlights
}

export interface Theme {
    name: string;
    colors: ThemeColors;
    // an optional background picture, held as a data URI so it can
    // be saved with the theme instead of living in a separate file
    backgroundImage: string | null;
    // how strongly the picture shows through, 0-1
    backgroundOpacity: number;
    // false on the built-in presets, true on ones a player made
    custom?: boolean;
}

// ---- colour maths -------------------------------------------
// Small helpers so a theme can be built from only four colours.

interface Rgb { r: number; g: number; b: number; }

export function hexToRgb(hex: string): Rgb {
    let h = hex.replace('#', '').trim();
    // allow the short form (#abc -> #aabbcc)
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

/** Blend two colours. amount 0 = all of `a`, 1 = all of `b`. */
function mix(a: string, b: string, amount: number): string {
    const x = hexToRgb(a), y = hexToRgb(b);
    return toHex({
        r: x.r + (y.r - x.r) * amount,
        g: x.g + (y.g - x.g) * amount,
        b: x.b + (y.b - x.b) * amount,
    });
}

/**
 * How bright a colour is, 0 (black) to 1 (white). The numbers are
 * the standard weights for how sensitive human eyes are to red,
 * green and blue - green looks much brighter than blue at the same
 * value, so a plain average would be wrong.
 */
export function brightness(hex: string): number {
    const { r, g, b } = hexToRgb(hex);
    return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

/** Is this a light theme? Decided by the BACKGROUND, not the text. */
export function isLight(theme: Theme): boolean {
    return brightness(theme.colors.background) > 0.5;
}

/** Black or white, whichever is readable on the given colour. */
export function readableOn(hex: string): string {
    return brightness(hex) > 0.55 ? '#111111' : '#ffffff';
}

/** A colour with an alpha, e.g. rgba(139,124,246,0.45) */
function withAlpha(hex: string, alpha: number): string {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---- the built-in themes ------------------------------------
// "Pink" is the default the site ships with. "CRK Dark" is the
// original navy design from the mockups, kept as a preset.

export const PRESET_THEMES: Theme[] = [
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
        name: 'CRK Dark',
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

// ---- applying a theme ---------------------------------------

/**
 * Work out every CSS variable the stylesheet needs from a theme's
 * four colours, and set them on <html>. Called on startup and
 * again on every change in the editor, which is what makes the
 * preview update live.
 */
export function applyTheme(theme: Theme) {
    const root = document.documentElement;
    const { background, surface, text, accent } = theme.colors;
    const light = brightness(background) > 0.5;

    // On a dark theme, "deeper" means closer to black and raised
    // surfaces are lighter. On a light theme it's the other way
    // round, so every step below flips direction with `light`.
    const deepen = (hex: string, amount: number) =>
        mix(hex, light ? '#000000' : '#000000', amount);
    const raise = (hex: string, amount: number) =>
        mix(hex, light ? '#000000' : '#ffffff', amount);

    const set = (name: string, value: string) => root.style.setProperty(name, value);

    // ---- surfaces ----
    set('--color-bg-deep', background);
    set('--color-bg', light ? deepen(background, 0.03) : raise(background, 0.04));
    set('--color-sidebar', light ? deepen(surface, 0.05) : deepen(surface, 0.25));
    set('--color-card', surface);
    set('--color-card-hover', raise(surface, light ? 0.05 : 0.08));
    // inputs sit BELOW the card, so they go the other way to cards
    set('--color-input', light ? deepen(surface, 0.08) : deepen(surface, 0.35));

    // ---- text ----
    set('--color-text', text);
    // body text and muted text are the main text faded towards the
    // background, so they stay readable whatever the theme
    set('--color-text-body', mix(text, background, 0.22));
    set('--color-text-muted', mix(text, background, 0.45));

    // ---- accent ----
    const accentHover = light
        ? mix(accent, '#000000', 0.18)     // darken on light themes
        : mix(accent, '#ffffff', 0.18);    // lighten on dark ones
    set('--color-primary', accent);
    set('--color-primary-hover', accentHover);
    set('--gradient-primary', `linear-gradient(135deg, ${accent} 0%, ${mix(accent, background, 0.25)} 100%)`);
    set('--glow-primary', `0 0 24px ${withAlpha(accent, light ? 0.35 : 0.45)}`);
    // text drawn ON TOP of the accent (button labels) has to be
    // readable - a white accent needs black text, not white
    set('--color-on-primary', readableOn(accent));

    // ---- lines and shadows ----
    // A dark theme uses faint WHITE lines; a light theme needs faint
    // BLACK ones or they'd be invisible.
    set('--color-border', light ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.08)');
    set('--color-border-strong', light ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.14)');
    set('--shadow-card', light ? '0 4px 16px rgba(0,0,0,0.10)' : '0 4px 16px rgba(0,0,0,0.35)');
    set('--shadow-card-hover', light ? '0 10px 28px rgba(0,0,0,0.16)' : '0 10px 28px rgba(0,0,0,0.45)');

    // ---- the page background ----
    // The soft glows are built from the accent so they belong to
    // whatever theme is on, instead of always being purple.
    const glowA = withAlpha(accent, light ? 0.20 : 0.28);
    const glowB = withAlpha(accent, light ? 0.10 : 0.18);
    set('--page-background',
        `radial-gradient(1100px 620px at 72% -12%, ${glowA}, transparent 58%),`
        + `radial-gradient(820px 520px at 8% 4%, ${glowB}, transparent 55%),`
        + `${background}`);

    // the film grain is far too obvious on a pale background
    set('--grain-opacity', light ? '0.02' : '0.04');

    // ---- background picture ----
    if (theme.backgroundImage) {
        set('--background-image', `url("${theme.backgroundImage}")`);
        set('--background-image-opacity', String(theme.backgroundOpacity));
    } else {
        set('--background-image', 'none');
        set('--background-image-opacity', '0');
    }

    // lets CSS ask which kind of theme is on, e.g. for the logo
    root.setAttribute('data-theme', light ? 'light' : 'dark');
}

// ---- saving the theme locally -------------------------------
// The theme is applied BEFORE the app has asked the server who is
// logged in, so a copy is kept in the browser too. Without this
// the site would flash the default theme on every page load while
// it waits for the account to load.

const STORAGE_KEY = 'crk_theme';

export function loadLocalTheme(): Theme {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return normaliseTheme(JSON.parse(saved));
    } catch {
        // corrupt or unreadable - fall through to the default
    }
    return DEFAULT_THEME;
}

export function saveLocalTheme(theme: Theme) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch {
        // localStorage can be full (a big background image) or turned
        // off entirely. The theme still works for this visit, so
        // there's nothing useful to tell the user here.
    }
}

/**
 * Make sure something loaded from storage or the server really is
 * a usable theme. Anything missing falls back to the default, so a
 * half-saved or hand-edited theme can't break the whole site.
 */
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
