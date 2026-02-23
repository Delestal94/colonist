export default function ActionPanel({ gameState, isMyTurn, phase, buildMode, setBuildMode, emit, setShowTrade, freeRoads, setFreeRoads }) {
    const myPlayer = gameState.players.find(p => p.id === gameState.myPlayerId);

    async function handleRollDice() {
        await emit('roll-dice');
    }

    async function handleEndTurn() {
        setBuildMode(null);
        await emit('end-turn');
    }

    async function handleBuyDevCard() {
        await emit('buy-dev-card');
    }

    async function handlePlayDevCard(cardType) {
        const params = {};

        if (cardType === 'year_of_plenty') {
            const resources = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
            const r1 = prompt('Choose first resource (wood/brick/wheat/sheep/ore):');
            const r2 = prompt('Choose second resource (wood/brick/wheat/sheep/ore):');
            if (!resources.includes(r1) || !resources.includes(r2)) return;
            params.resource1 = r1;
            params.resource2 = r2;
        } else if (cardType === 'monopoly') {
            const r = prompt('Choose a resource to monopolize (wood/brick/wheat/sheep/ore):');
            if (!['wood', 'brick', 'wheat', 'sheep', 'ore'].includes(r)) return;
            params.resource = r;
        }

        const result = await emit('play-dev-card', { cardType, params });

        if (result?.success && cardType === 'road_building') {
            setBuildMode('road');
            setFreeRoads(2);
        }
    }

    const isMain = phase === 'main' && isMyTurn;
    const isRoll = phase === 'roll_dice' && isMyTurn;
    const isSetup = phase?.startsWith('setup_') && isMyTurn;

    const canAffordSettlement = myPlayer && checkAfford(myPlayer.resources, { wood: 1, brick: 1, wheat: 1, sheep: 1 });
    const canAffordCity = myPlayer && checkAfford(myPlayer.resources, { ore: 3, wheat: 2 });
    const canAffordRoad = myPlayer && checkAfford(myPlayer.resources, { wood: 1, brick: 1 });
    const canAffordDevCard = myPlayer && checkAfford(myPlayer.resources, { ore: 1, wheat: 1, sheep: 1 });

    // Playable dev cards (not bought this turn, not VP)
    const playableCards = myPlayer?.devCards?.filter(c => c !== 'victory_point') || [];
    const uniquePlayable = [...new Set(playableCards)];

    return (
        <div className="action-panel">
            {/* Setup Phase */}
            {isSetup && (
                <span className="action-status">
                    <strong>{phase.includes('settlement') ? 'Click a valid spot to place your settlement' : 'Click a valid spot to place your road'}</strong>
                </span>
            )}

            {/* Roll Phase */}
            {isRoll && (
                <button className="btn btn-primary" onClick={handleRollDice}>
                    🎲 Roll Dice
                </button>
            )}

            {/* Main Phase */}
            {isMain && (
                <>
                    <div className="action-group">
                        <button
                            className={`btn btn-small ${buildMode === 'road' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setBuildMode(buildMode === 'road' ? null : 'road')}
                            disabled={!canAffordRoad && freeRoads === 0}
                        >
                            🛤️ Road {freeRoads > 0 ? `(${freeRoads} free)` : ''}
                        </button>
                        <button
                            className={`btn btn-small ${buildMode === 'settlement' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setBuildMode(buildMode === 'settlement' ? null : 'settlement')}
                            disabled={!canAffordSettlement}
                        >
                            🏠 Settlement
                        </button>
                        <button
                            className={`btn btn-small ${buildMode === 'city' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setBuildMode(buildMode === 'city' ? null : 'city')}
                            disabled={!canAffordCity}
                        >
                            🏙️ City
                        </button>
                    </div>

                    <div className="action-divider" />

                    <div className="action-group">
                        <button className="btn btn-small btn-secondary" onClick={handleBuyDevCard} disabled={!canAffordDevCard}>
                            🃏 Buy Card
                        </button>
                        <button className="btn btn-small btn-secondary" onClick={() => setShowTrade(true)}>
                            🤝 Trade
                        </button>
                    </div>

                    {/* Play Dev Cards */}
                    {uniquePlayable.length > 0 && (
                        <>
                            <div className="action-divider" />
                            <div className="action-group">
                                {uniquePlayable.map(card => (
                                    <button
                                        key={card}
                                        className="btn btn-small btn-secondary"
                                        onClick={() => handlePlayDevCard(card)}
                                        title={`Play ${card}`}
                                    >
                                        {getCardEmoji(card)} Play
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="action-divider" />

                    <button className="btn btn-small btn-success" onClick={handleEndTurn}>
                        ✅ End Turn
                    </button>
                </>
            )}

            {/* Not my turn */}
            {!isMyTurn && !isSetup && phase !== 'discard' && (
                <span className="action-status">
                    Waiting for <strong>{gameState.players[gameState.currentPlayerIndex]?.name}</strong>...
                </span>
            )}

            {/* Active trade notification for non-current players */}
            {gameState.activeTrade && gameState.activeTrade.proposerId !== gameState.myPlayerId && (
                <button className="btn btn-small btn-primary" onClick={() => setShowTrade(true)} style={{ marginLeft: 'auto' }}>
                    📨 Trade Offer!
                </button>
            )}
        </div>
    );
}

function checkAfford(resources, costs) {
    return Object.entries(costs).every(([r, amount]) => (resources[r] || 0) >= amount);
}

function getCardEmoji(card) {
    const emojis = { knight: '⚔️', road_building: '🛤️', year_of_plenty: '🎁', monopoly: '💰' };
    return emojis[card] || '🃏';
}
