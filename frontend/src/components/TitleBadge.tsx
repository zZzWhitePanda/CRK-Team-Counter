// ============================================================
// TitleBadge.tsx - the little badge next to someone's name
// ('OG', 'Owner', 'Admin', …). Only an admin can award one, so
// seeing a badge means something.
//
// Well-known titles get their own colour; anything else falls back
// to the site's purple, so a made-up title still looks deliberate.
// ============================================================

interface Props {
    title: string | null | undefined;
    small?: boolean;      // for build cards, where space is tight
}

// colours for the titles worth recognising on sight
const KNOWN: Record<string, string> = {
    owner: 'var(--rarity-ancient)',      // gold
    admin: 'var(--color-enemy)',         // red
    og: 'var(--color-rank)',             // teal
    mod: 'var(--color-ally)',            // cyan
    moderator: 'var(--color-ally)',
    veteran: 'var(--rarity-super-epic)', // pink
    legend: 'var(--rarity-legendary)',
};

export function TitleBadge({ title, small }: Props) {
    if (!title) return null;
    const colour = KNOWN[title.toLowerCase()] ?? 'var(--color-primary)';

    return (
        <span
            className={'title-badge' + (small ? ' small' : '')}
            style={{ color: colour, borderColor: colour }}
            title={`${title} — awarded by an admin`}
        >
            {title}
        </span>
    );
}
