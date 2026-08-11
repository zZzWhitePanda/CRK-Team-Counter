// ============================================================
// TitleBadge.tsx - the coloured badges next to someone's name.
//
// A user has an ARRAY of titles now: e.g. an owner + content
// creator would show both. Each title carries its own colour,
// picked by the owner when it was awarded. This component only
// draws them - it doesn't decide what anything means.
//
// The old version got a title's colour from a fixed lookup by
// name; that has moved into the database (users.titles[i].color).
// ============================================================

import { Title } from '../api';

interface Props {
    titles: Title[] | undefined | null;
    small?: boolean;      // for build cards, where space is tight
}

export function TitleBadges({ titles, small }: Props) {
    if (!titles || titles.length === 0) return null;
    return (
        <>
            {titles.map(t => (
                <span
                    key={t.name}
                    className={'title-badge' + (small ? ' small' : '')}
                    style={{ color: t.color, borderColor: t.color }}
                    title={t.name}
                >
                    {t.name}
                </span>
            ))}
        </>
    );
}

/**
 * Draws a SINGLE title. Kept because a few places (e.g. staff-only
 * indicators) hand-build a single badge rather than reading a list.
 */
export function TitleBadge({ title, small }: { title: Title | null; small?: boolean }) {
    if (!title) return null;
    return <TitleBadges titles={[title]} small={small} />;
}
