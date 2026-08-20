// coloured title badges next to a name

import { Title } from '../api';

interface Props {
    titles: Title[] | undefined | null;
    small?: boolean;      // for tight spaces
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

// draws a single title
export function TitleBadge({ title, small }: { title: Title | null; small?: boolean }) {
    if (!title) return null;
    return <TitleBadges titles={[title]} small={small} />;
}
