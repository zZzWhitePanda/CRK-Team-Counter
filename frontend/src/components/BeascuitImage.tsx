// a beascuit picture, falling back to the plain art if the elemental
// version has not been added to the wiki yet

import { useState } from 'react';
import { beascuitImageUrl, beascuitFallbackUrl, findElement } from '../gear';

interface Props {
    typeKey: string;
    element: string | null;
    anniversary?: boolean;
    size?: number;
}

export function BeascuitImage({ typeKey, element, anniversary = false, size = 44 }: Props) {
    const [failed, setFailed] = useState(false);
    const src = failed
        ? beascuitFallbackUrl(typeKey)
        : beascuitImageUrl(typeKey, element, anniversary);
    const colour = findElement(element)?.color;

    return (
        <img
            src={src}
            alt=""
            width={size}
            height={size}
            loading="lazy"
            onError={() => setFailed(true)}
            style={colour ? { filter: `drop-shadow(0 0 6px ${colour}66)` } : undefined}
        />
    );
}
