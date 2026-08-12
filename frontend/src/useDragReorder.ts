// ============================================================
// useDragReorder.ts - drag a team slot to a new position.
//
// Used by the counter tool and the submit-build form so a player
// can set their team's ORDER, which matters in game (front/middle/
// rear positioning).
//
// This uses the browser's built-in HTML5 drag and drop rather than
// a library. The tricky part is that dragging has to move SEVERAL
// parallel arrays at once - the cookie names and their builds live
// in separate state - so the hook hands back the from/to indexes
// and lets the caller move whatever it needs to.
//
// Keyboard users are covered too: the caller wires moveLeft and
// moveRight to buttons, because dragging is mouse-only.
// ============================================================

import { useState } from 'react';

/** Move one item in an array from `from` to `to`, returning a copy. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
        return list;
    }
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

export interface DragReorder {
    /** index currently being dragged, or null */
    dragging: number | null;
    /** index currently being hovered over as a drop target */
    over: number | null;
    /** spread onto each draggable slot wrapper */
    slotProps: (index: number) => {
        draggable: boolean;
        onDragStart: (e: React.DragEvent) => void;
        onDragOver: (e: React.DragEvent) => void;
        onDragEnter: () => void;
        onDragLeave: () => void;
        onDrop: (e: React.DragEvent) => void;
        onDragEnd: () => void;
        className: string;
    };
}

/**
 * @param onReorder called with (from, to) when a drag completes
 */
export function useDragReorder(onReorder: (from: number, to: number) => void): DragReorder {
    const [dragging, setDragging] = useState<number | null>(null);
    const [over, setOver] = useState<number | null>(null);

    function slotProps(index: number) {
        return {
            draggable: true,
            onDragStart: (e: React.DragEvent) => {
                setDragging(index);
                // Firefox refuses to start a drag unless some data is
                // set, so this is required even though we never read it.
                e.dataTransfer.setData('text/plain', String(index));
                e.dataTransfer.effectAllowed = 'move';
            },
            onDragOver: (e: React.DragEvent) => {
                // preventDefault is what marks this as a valid drop
                // target - without it the browser refuses the drop
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            },
            onDragEnter: () => setOver(index),
            onDragLeave: () => setOver(o => (o === index ? null : o)),
            onDrop: (e: React.DragEvent) => {
                e.preventDefault();
                const from = Number(e.dataTransfer.getData('text/plain'));
                if (Number.isInteger(from) && from !== index) onReorder(from, index);
                setDragging(null);
                setOver(null);
            },
            onDragEnd: () => { setDragging(null); setOver(null); },
            className: 'drag-slot'
                + (dragging === index ? ' dragging' : '')
                + (over === index && dragging !== index ? ' drop-target' : ''),
        };
    }

    return { dragging, over, slotProps };
}
