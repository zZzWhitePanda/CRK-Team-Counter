// ============================================================
// SettingsPage.tsx - mockup 4. In version 1 these are display
// rows showing the site's fixed settings. Real options (like
// accounts) arrive with the auth build phase.
// ============================================================

const rows = [
    { label: 'Language', value: 'English' },
    { label: 'Region', value: 'Global' },
    { label: 'Theme', value: 'Dark Esports' },
    { label: 'Account', value: 'Login coming soon' },
];

export function SettingsPage() {
    return (
        <div>
            <h1 style={{ marginBottom: 24 }}>Settings</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
                {rows.map(row => (
                    <div
                        key={row.label}
                        className="card"
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                        <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{row.label}</span>
                        <span className="muted">{row.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
