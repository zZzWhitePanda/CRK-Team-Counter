// build your own theme, with a live preview

import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Check, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { Theme, ThemeColors } from '../theme';
import { fileToBackgroundDataUri } from '../avatarUpload';

interface Props {
    theme: Theme;
    // runs on every change, for the preview
    onPreview: (theme: Theme) => void;
    onSave: (theme: Theme, name: string) => void;
    onCancel: () => void;
    busy?: boolean;
}

const FIELDS: { key: keyof ThemeColors; label: string; help: string }[] = [
    { key: 'background', label: 'Background', help: 'The page behind everything' },
    { key: 'surface', label: 'Surface', help: 'Cards, panels and the sidebar' },
    { key: 'text', label: 'Text', help: 'The main writing colour' },
    { key: 'accent', label: 'Accent', help: 'Buttons, links and highlights' },
];

export function ThemeEditor({ theme, onPreview, onSave, onCancel, busy }: Props) {
    const [draft, setDraft] = useState<Theme>(theme);
    const [name, setName] = useState(theme.custom ? theme.name : theme.name + ' copy');
    const [problem, setProblem] = useState('');
    const fileInput = useRef<HTMLInputElement>(null);

    // the theme before editing, for Cancel
    const original = useRef<Theme>(theme);

    // preview every edit
    useEffect(() => { onPreview(draft); }, [draft]);

    function setColor(key: keyof ThemeColors, value: string) {
        setDraft(d => ({ ...d, colors: { ...d.colors, [key]: value } }));
    }

    async function handleImage(file: File | undefined) {
        if (!file) return;
        setProblem('');
        try {
            // shrunk in the browser first
            const dataUri = await fileToBackgroundDataUri(file);
            setDraft(d => ({ ...d, backgroundImage: dataUri }));
        } catch (err) {
            setProblem(err instanceof Error ? err.message : 'Could not read that image.');
        }
        if (fileInput.current) fileInput.current.value = '';
    }

    function handleCancel() {
        onPreview(original.current);   // undo the preview
        onCancel();
    }

    return (
        <div className="card theme-editor">
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Edit theme</h2>
            <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>
                Changes preview live across the whole site.
            </p>

            {/* name */}
            <label htmlFor="theme-name" className="field-label">Name</label>
            <input
                id="theme-name"
                className="input"
                style={{ maxWidth: 340, marginBottom: 20 }}
                value={name}
                maxLength={40}
                onChange={e => setName(e.target.value)}
                placeholder="My theme"
            />

            {/* the four colours */}
            <div className="theme-fields">
                {FIELDS.map(field => (
                    <div key={field.key} className="theme-field">
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="theme-field-label">{field.label}</div>
                            <div className="muted" style={{ fontSize: 12 }}>{field.help}</div>
                        </div>

                        {/* colour picker */}
                        <input
                            type="color"
                            className="theme-swatch"
                            aria-label={`${field.label} colour`}
                            value={draft.colors[field.key]}
                            onChange={e => setColor(field.key, e.target.value)}
                        />
                        {/* hex code */}
                        <input
                            className="input theme-hex"
                            aria-label={`${field.label} hex code`}
                            value={draft.colors[field.key]}
                            maxLength={7}
                            onChange={e => {
                                const v = e.target.value;
                                // wait for a valid colour before applying
                                setDraft(d => ({ ...d, colors: { ...d.colors, [field.key]: v } }));
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* background picture */}
            <div className="theme-background">
                <div className="theme-field-label" style={{ marginBottom: 8 }}>
                    <ImageIcon size={15} aria-hidden="true" /> Background image
                </div>
                <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                    Any picture. It's scaled to cover the page, so a wide one
                    (roughly 1600&times;900 or bigger) looks best.
                </p>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        ref={fileInput}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        style={{ display: 'none' }}
                        onChange={e => handleImage(e.target.files?.[0])}
                    />
                    <button className="pill" onClick={() => fileInput.current?.click()}>
                        <Upload size={14} aria-hidden="true" /> Choose image
                    </button>
                    {draft.backgroundImage && (
                        <button className="pill danger"
                            onClick={() => setDraft(d => ({ ...d, backgroundImage: null }))}>
                            <Trash2 size={14} aria-hidden="true" /> Remove
                        </button>
                    )}
                </div>

                {draft.backgroundImage && (
                    <>
                        <img src={draft.backgroundImage} alt="Background preview"
                            className="theme-background-preview" />
                        <label htmlFor="bg-opacity" className="field-label" style={{ marginTop: 12 }}>
                            How strong: {Math.round(draft.backgroundOpacity * 100)}%
                        </label>
                        <input
                            id="bg-opacity"
                            type="range"
                            min={0} max={100}
                            value={Math.round(draft.backgroundOpacity * 100)}
                            onChange={e => setDraft(d => ({
                                ...d, backgroundOpacity: Number(e.target.value) / 100,
                            }))}
                            style={{ width: '100%', maxWidth: 340, accentColor: 'var(--color-primary)' }}
                        />
                    </>
                )}
            </div>

            {problem && <div className="error-box" role="alert" style={{ marginTop: 14 }}>{problem}</div>}

            {/* buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 22 }}>
                <button className="btn-primary" disabled={busy}
                    onClick={() => onSave({ ...draft, name: name.trim() || 'My theme', custom: true },
                                          name.trim() || 'My theme')}>
                    <Check size={16} aria-hidden="true" /> Save theme
                </button>
                <button className="btn-ghost" disabled={busy} onClick={handleCancel}>
                    Cancel
                </button>
                <button className="pill" disabled={busy}
                    onClick={() => setDraft(original.current)}>
                    <RotateCcw size={14} aria-hidden="true" /> Undo changes
                </button>
            </div>
        </div>
    );
}
