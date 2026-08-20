// a labelled row of cookie portraits, red for enemy, cyan for ally

import { Cookie, cookieImageUrl } from '../api';

interface TeamRowProps {
    label: string;               // row label
    kind: 'enemy' | 'ally';
    cookieNames: string[];
    allCookies: Cookie[];        // roster, to find portraits
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
                            // not in the roster, show initials
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
