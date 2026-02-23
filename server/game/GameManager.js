// ============================================
// GAME MANAGER - Room Management
// ============================================

import { GameState } from './GameState.js';

export class GameManager {
    constructor() {
        this.games = new Map(); // roomCode -> GameState
    }

    createRoom() {
        const roomCode = this._generateCode();
        const game = new GameState(roomCode);
        this.games.set(roomCode, game);
        return game;
    }

    getGame(roomCode) {
        return this.games.get(roomCode);
    }

    deleteRoom(roomCode) {
        this.games.delete(roomCode);
    }

    _generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code;
        do {
            code = '';
            for (let i = 0; i < 4; i++) {
                code += chars[Math.floor(Math.random() * chars.length)];
            }
        } while (this.games.has(code));
        return code;
    }
}
