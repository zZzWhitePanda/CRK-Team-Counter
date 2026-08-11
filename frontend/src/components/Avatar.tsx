// ============================================================
// Avatar.tsx - somebody's profile picture, in one place so it
// looks the same in the top bar, on build cards and on profiles.
//
// A picture can be one of three things, in this order:
//   1. a photo the person uploaded (stored as a data: URI)
//   2. a cookie portrait they picked from the roster
//   3. nothing yet -> their first letter on a coloured circle
// avatarUrl() in api.ts works out which of 1 and 2 applies.
// ============================================================

import { avatarUrl } from '../api';

interface AvatarProps {
    // anything with a picture on it: a logged-in user, a profile,
    // or a build (which carries its author's picture)
    who: { avatar?: string | null; avatarData?: string | null; avatar_data?: string | null } | null;
    username: string;
    size?: number;      // pixels across, default 32
}

export function Avatar({ who, username, size = 32 }: AvatarProps) {
    const src = avatarUrl(who);

    return (
        <span
            className="avatar"
            style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
            aria-hidden="true"
        >
            {src
                ? <img src={src} alt="" width={size} height={size} loading="lazy" />
                : (username[0] ?? '?').toUpperCase()}
        </span>
    );
}
