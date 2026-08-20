// a profile picture, or the first letter if there isn't one

import { avatarUrl } from '../api';

interface AvatarProps {
    // anything carrying a picture
    who: { avatar?: string | null; avatarData?: string | null; avatar_data?: string | null } | null;
    username: string;
    size?: number;      // size in pixels
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
