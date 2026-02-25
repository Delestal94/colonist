import { useState, useMemo } from 'react';
import HexGrid from './HexGrid.jsx';
import PlayerHUD from './PlayerHUD.jsx';
import ActionPanel from './ActionPanel.jsx';
import DiceDisplay from './DiceDisplay.jsx';
import ChatPanel from './ChatPanel.jsx';
import TradeDialog from './TradeDialog.jsx';

const PHASE_LABELS = {
    setup_settlement_1: '📍 Setup — Place Settlement #1',
    setup_road_1: '🛤️ Setup — Place Road #1',
    setup_settlement_2: '📍 Setup — Place Settlement #2',
    setup_road_2: '🛤️ Setup — Place Road #2',
    roll_dice: '🎲 Roll the Dice',
    discard: '⚠️ Discard Resources',
    move_robber: '🦹 Move the Robber',
    steal: '💰 Steal a Resource',
    main: '🏗️ Build, Trade, or End Turn',
    game_over: '🏆 Game Over',
};

export default function GameBoard({ gameState, lastDice, chatMessages, emit, emitNoAck, buildMode, setBuildMode, freeRoads, setFreeRoads }) {
    const [showTrade, setShowTrade] = useState(false);
    const [discardAmounts, setDiscardAmounts] = useState({});
    const [isDebugPortMode, setIsDebugPortMode] = useState(false);

    const myPlayer = gameState.players.find(p => p.id === gameState.myPlayerId);
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isMyTurn = currentPlayer?.id === gameState.myPlayerId;
    const phase = gameState.phase;

    // Determine what placements to show
    const validPlacements = gameState.validPlacements || {};

    // Phase-based actions
    const showSetupSettlement = (phase === 'setup_settlement_1' || phase === 'setup_settlement_2') && isMyTurn;
    const showSetupRoad = (phase === 'setup_road_1' || phase === 'setup_road_2') && isMyTurn;
    const showDiscard = phase === 'discard' && myPlayer?.mustDiscard > 0;
    const showMoveRobber = phase === 'move_robber' && isMyTurn;
    const showSteal = phase === 'steal' && isMyTurn;

    const winnerPlayer = gameState.winner ? gameState.players.find(p => p.id === gameState.winner) : null;

    async function handleVertexClick(vertexId) {
        if (showSetupSettlement) {
            await emit('place-setup-settlement', { vertexId });
        } else if (buildMode === 'settlement') {
            const result = await emit('build-settlement', { vertexId });
            if (result?.success) setBuildMode(null);
        } else if (buildMode === 'city') {
            const result = await emit('build-city', { vertexId });
            if (result?.success) setBuildMode(null);
        }
    }

    async function handleEdgeClick(edgeId) {
        if (showSetupRoad) {
            await emit('place-setup-road', { edgeId });
        } else if (buildMode === 'road') {
            if (freeRoads > 0) {
                const result = await emit('build-free-road', { edgeId });
                if (result?.success) {
                    const remaining = freeRoads - 1;
                    setFreeRoads(remaining);
                    if (remaining === 0) setBuildMode(null);
                }
            } else {
                const result = await emit('build-road', { edgeId });
                if (result?.success) setBuildMode(null);
            }
        }
    }

    async function handleHexClick(hexId) {
        if (showMoveRobber) {
            const result = await emit('move-robber', { hexId });
            if (result?.success && result.stealTargets?.length === 0) {
                // No one to steal from
            }
        }
    }

    async function handleSteal(targetId) {
        await emit('steal-resource', { targetId });
    }

    async function handleDiscard() {
        await emit('discard-resources', { resources: discardAmounts });
        setDiscardAmounts({});
    }

    const PORT_CYCLE = [null, 'generic', 'wood', 'brick', 'wheat', 'sheep', 'ore'];
    async function handleDebugEdgeClick(edgeId) {
        const currentPort = gameState.board.ports.find(p => p.edgeId === edgeId);
        const currentIndex = PORT_CYCLE.indexOf(currentPort ? currentPort.type : null);
        const nextType = PORT_CYCLE[(currentIndex + 1) % PORT_CYCLE.length];
        await emit('debug-update-port', { edgeId, type: nextType });
    }

    function exportPorts() {
        const ports = gameState.board.ports.map(p => ({
            edgeId: p.edgeId,
            vertexIds: p.vertexIds,
            type: p.type
        }));
        const json = JSON.stringify(ports, null, 2);
        console.log("BOARD PORTS CONFIG:", json);
        alert("Configuración de puertos copiada a la consola (F12)");
    }

    return (
        <div className="game-container">
            {/* Header */}
            <div className="game-header">
                <div className="game-header-left">
                    <span className="game-logo">Colonist</span>
                    <span className="game-phase">{PHASE_LABELS[phase] || phase}</span>
                </div>
                <div className="game-header-right">
                    <DiceDisplay dice={lastDice || gameState.lastDiceRoll} />
                    <span className="room-code-badge">{gameState.roomCode}</span>
                    <span className="turn-indicator">
                        Turn <strong>{gameState.turnNumber}</strong> · <strong style={{ color: currentPlayer?.color }}>{currentPlayer?.name}</strong>
                    </span>
                </div>
            </div>

            {/* Board */}
            <div className="board-area">
                {gameState.board && (
                    <HexGrid
                        board={gameState.board}
                        validPlacements={validPlacements}
                        onVertexClick={handleVertexClick}
                        onEdgeClick={handleEdgeClick}
                        onDebugEdgeClick={handleDebugEdgeClick}
                        onHexClick={handleHexClick}
                        showSetupSettlement={showSetupSettlement}
                        showSetupRoad={showSetupRoad}
                        showMoveRobber={showMoveRobber}
                        buildMode={buildMode}
                        players={gameState.players}
                        isDebug={isDebugPortMode}
                    />
                )}
            </div>

            {/* Action Panel */}
            <ActionPanel
                gameState={gameState}
                isMyTurn={isMyTurn}
                phase={phase}
                buildMode={buildMode}
                setBuildMode={setBuildMode}
                emit={emit}
                setShowTrade={setShowTrade}
                freeRoads={freeRoads}
                setFreeRoads={setFreeRoads}
            />

            {/* Sidebar */}
            <div className="sidebar">
                <PlayerHUD
                    myPlayer={myPlayer}
                    players={gameState.players}
                    currentPlayerId={currentPlayer?.id}
                    myPlayerId={gameState.myPlayerId}
                />

                {/* Game Log */}
                <div className="sidebar-section">
                    <h3>Game Log</h3>
                    <div className="game-log">
                        {gameState.log?.map((entry, i) => (
                            <div key={i} className="log-entry">{entry.message}</div>
                        ))}
                    </div>
                </div>

                {/* Chat */}
                <ChatPanel
                    messages={chatMessages}
                    emitNoAck={emitNoAck}
                />

                {/* Debug Panel */}
                <div className="sidebar-section debug-section">
                    <h3>🛠️ Design Tools</h3>
                    <button
                        className={`btn ${isDebugPortMode ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => setIsDebugPortMode(!isDebugPortMode)}
                    >
                        {isDebugPortMode ? '🛑 Stop Design' : '⚓ Edit Ports'}
                    </button>
                    {isDebugPortMode && (
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                            <button className="btn btn-primary" onClick={exportPorts} style={{ flex: 1 }}>
                                📋 JSON
                            </button>
                            <button className="btn btn-danger btn-small" onClick={() => emit('debug-clear-ports')} title="Clear all ports">
                                🗑️ Clear
                            </button>
                        </div>
                    )}
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Click on edges to cycle port types.
                    </p>
                </div>
            </div>

            {/* Steal Dialog */}
            {showSteal && (
                <div className="trade-overlay">
                    <div className="trade-dialog">
                        <h2>🦹 Steal a Resource</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            Choose a player to steal from:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {gameState.players
                                .filter(p => (validPlacements.stealTargets || []).includes(p.id))
                                .map(p => (
                                    <button
                                        key={p.id}
                                        className="btn btn-secondary"
                                        onClick={() => handleSteal(p.id)}
                                    >
                                        <div className="player-color-dot" style={{ background: p.color }} />
                                        {p.name} ({p.totalResources} cards)
                                    </button>
                                ))}
                            {(validPlacements.stealTargets || []).length === 0 && (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No one to steal from.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Discard Dialog */}
            {showDiscard && (
                <div className="discard-overlay">
                    <div className="discard-dialog">
                        <h2>⚠️ Discard Resources</h2>
                        <p className="discard-info">
                            You have too many cards! Discard {myPlayer.mustDiscard} resources.
                        </p>
                        <div className="trade-resources">
                            {Object.entries(myPlayer.resources).map(([res, count]) => {
                                const discarding = discardAmounts[res] || 0;
                                const totalDiscarding = Object.values(discardAmounts).reduce((a, b) => a + b, 0);
                                return (
                                    <div key={res} className="trade-resource-btn" onClick={() => {
                                        if (discarding < count && totalDiscarding < myPlayer.mustDiscard) {
                                            setDiscardAmounts({ ...discardAmounts, [res]: discarding + 1 });
                                        }
                                    }}>
                                        <span className="resource-icon">{getResourceIcon(res)}</span>
                                        <span className="count">{discarding}/{count}</span>
                                        <span className="resource-label">{res}</span>
                                        {discarding > 0 && (
                                            <button className="btn btn-small btn-danger" onClick={(e) => {
                                                e.stopPropagation();
                                                setDiscardAmounts({ ...discardAmounts, [res]: Math.max(0, discarding - 1) });
                                            }}>-</button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="trade-buttons">
                            <button
                                className="btn btn-danger"
                                onClick={handleDiscard}
                                disabled={Object.values(discardAmounts).reduce((a, b) => a + b, 0) !== myPlayer.mustDiscard}
                                style={{ flex: 1 }}
                            >
                                Discard ({Object.values(discardAmounts).reduce((a, b) => a + b, 0)}/{myPlayer.mustDiscard})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Trade Dialog */}
            {showTrade && (
                <TradeDialog
                    myPlayer={myPlayer}
                    players={gameState.players}
                    board={gameState.board}
                    emit={emit}
                    onClose={() => setShowTrade(false)}
                    activeTrade={gameState.activeTrade}
                    myPlayerId={gameState.myPlayerId}
                />
            )}

            {/* Winner Overlay */}
            {winnerPlayer && (
                <div className="winner-overlay">
                    <div className="winner-card">
                        <div className="winner-trophy">🏆</div>
                        <div className="winner-title">Victory!</div>
                        <div className="winner-name" style={{ color: winnerPlayer.color }}>
                            {winnerPlayer.name} wins with {winnerPlayer.publicVictoryPoints} VP!
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function getResourceIcon(resource) {
    const icons = { wood: '🪵', brick: '🧱', wheat: '🌾', sheep: '🐑', ore: '⛏️' };
    return icons[resource] || '❓';
}
