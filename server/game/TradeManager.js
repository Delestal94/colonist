// ============================================
// TRADE MANAGER - Trading Logic
// ============================================

export class TradeManager {
    constructor() {
        this.activeTrade = null; // { proposerId, offering: {}, requesting: {}, responses: {} }
    }

    proposeTrade(proposerId, offering, requesting) {
        this.activeTrade = {
            proposerId,
            offering,    // { resource: amount }
            requesting,  // { resource: amount }
            responses: {},
        };
        return this.activeTrade;
    }

    respondToTrade(playerId, accepted) {
        if (!this.activeTrade) return null;
        if (playerId === this.activeTrade.proposerId) return null;

        this.activeTrade.responses[playerId] = accepted;
        return this.activeTrade;
    }

    getAcceptedPlayer() {
        if (!this.activeTrade) return null;
        const entry = Object.entries(this.activeTrade.responses).find(([, v]) => v === true);
        return entry ? entry[0] : null;
    }

    cancelTrade() {
        this.activeTrade = null;
    }

    // Check if a bank trade is valid
    static canBankTrade(player, offering, requesting, board) {
        const { resource: offerResource, amount: offerAmount } = offering;
        const { resource: requestResource, amount: requestAmount } = requesting;

        if (requestAmount !== 1) return false;

        // Check ports for better ratios
        let ratio = 4; // default bank trade ratio

        // Check if player has a port
        const playerVertices = [...player.settlements, ...player.cities];
        for (const vertexId of playerVertices) {
            const vertex = board.vertices[vertexId];
            if (vertex && vertex.port) {
                if (vertex.port === offerResource) {
                    ratio = Math.min(ratio, 2); // 2:1 specific port
                } else if (vertex.port === 'generic') {
                    ratio = Math.min(ratio, 3); // 3:1 generic port
                }
            }
        }

        if (offerAmount !== ratio) return false;
        if (player.resources[offerResource] < offerAmount) return false;

        return true;
    }

    static executeBankTrade(player, offering, requesting) {
        player.resources[offering.resource] -= offering.amount;
        player.resources[requesting.resource] += requesting.amount;
    }
}
