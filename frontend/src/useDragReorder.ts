// drag to reorder team slots

import { useState } from 'react';

// move an item in a list
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
    // index being dragged
    dragging: number | null;
    // index being hovered
    over: number | null;
    // props for each slot
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

// onReorder(from, to) runs when a drag finishes
export function useDragReorder(onReorder: (from: number, to: number) => void): DragReorder {
    const [dragging, setDragging] = useState<number | null>(null);
    const [over, setOver] = useState<number | null>(null);

    function slotProps(index: number) {
        return {
            draggable: true,
            onDragStart: (e: React.DragEvent) => {
                setDragging(index);
                // firefox needs data set to start a drag
                e.dataTransfer.setData('text/plain', String(index));
                e.dataTransfer.effectAllowed = 'move';
            },
            onDragOver: (e: React.DragEvent) => {
                // marks this as a drop target
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
