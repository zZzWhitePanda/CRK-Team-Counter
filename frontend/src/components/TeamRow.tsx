// ============================================================
// TeamRow.tsx - one row of cookie portraits with a label,
// like the "VS. [][][][][]" and "USE [][][][][]" rows on
// mockup 1. The color carries meaning (design system rule):
//   enemy  -> red label + red slot borders
//   ally   -> cyan label + cyan slot borders
// ============================================================

import { Cookie, cookieImageUrl } from '../api';

interface TeamRowProps {
    label: string;               // "VS." or "USE"
    kind: 'enemy' | 'ally';
    cookieNames: string[];
    allCookies: Cookie[];        // full roster, used to find each portrait
}

export function TeamRow({ label, kind, cookieNames, allCookies }: TeamRowProps) {
    const color = kind === 'enemy' ? 'var(--color-enemy)' : 'var(--color-ally)';

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span
                style={{
                    color,
                    fontFamily: 'var(--font-heading)',
                    fontSize: 18,
                    width: 48,
                    flexShrink: 0,
                }}
            >
                {label}
            </span>

            {cookieNames.map(name => {
                const cookie = allCookies.find(c => c.name === name);
                return (
                    <div
                        key={name}
                        title={name}
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: 'var(--radius-small)',
                            border: `1.5px solid ${color}`,
                            background: 'var(--color-input)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                        }}
                    >
                        {cookie ? (
                            <img
                                src={cookieImageUrl(cookie.image_file)}
                                alt={name}
                                width={52}
                                height={52}
                                loading="lazy"
                                style={{ objectFit: 'contain' }}
                            />
                        ) : (
                            // cookie not in the roster (shouldn't happen) - show initials
                            <span className="muted" style={{ fontSize: 12 }}>
                                {name.slice(0, 2)}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
