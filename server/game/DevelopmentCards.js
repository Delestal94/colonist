// ============================================
// DEVELOPMENT CARDS - Deck Management
// ============================================

import { DEV_CARD_TYPES, BASE_DEV_DECK } from './constants.js';

export class DevelopmentCards {
    constructor(playerCount) {
        this.deck = [];
        this._buildDeck(playerCount);
    }

    _buildDeck(playerCount) {
        // Scale deck for larger games
        const multiplier = playerCount > 6 ? 2 : playerCount > 4 ? 1.5 : 1;

        Object.entries(BASE_DEV_DECK).forEach(([type, count]) => {
            const scaledCount = Math.round(count * multiplier);
            for (let i = 0; i < scaledCount; i++) {
                this.deck.push(type);
            }
        });

        this._shuffle();
    }

    _shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    draw() {
        if (this.deck.length === 0) return null;
        return this.deck.pop();
    }

    get remaining() {
        return this.deck.length;
    }
}
