import { nanoid } from 'nanoid';

export const generateRoomId = () => nanoid(6);

export function createEmptyBoard(rows, cols) {
    return Array.from({ length: rows }, () => 
        Array.from({ length: cols }, () => ({ texture: null }))
    );
}

