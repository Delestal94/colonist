import { RESOURCE_ICONS } from '../utils/hexMath.js';

export default function PlayerHUD({ myPlayer, players, currentPlayerId, myPlayerId }) {
    if (!myPlayer) return null;

    return (
        <>
            {/* My Resources */}
            <div className="sidebar-section">
                <h3>My Resources</h3>
                <div className="my-resources">
                    {Object.entries(myPlayer.resources || {}).map(([res, count]) => (
                        <div key={res} className="resource-item">
                            <span className="resource-icon">{RESOURCE_ICONS[res] || '?'}</span>
                            <span className="resource-count">{count}</span>
                            <span className="resource-label">{res.slice(0, 4)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Dev Cards */}
            {myPlayer.devCards && myPlayer.devCards.length > 0 && (
                <div className="sidebar-section">
                    <h3>Dev Cards ({myPlayer.devCards.length})</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {myPlayer.devCards.map((card, i) => (
                            <span key={i} style={{
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.4rem',
                                background: 'var(--bg-card)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                            }}>
                                {formatCardName(card)}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Players */}
            <div className="sidebar-section">
                <h3>Players</h3>
                <div className="players-list">
                    {players.map(player => (
                        <div
                            key={player.id}
                            className={`player-row ${player.id === currentPlayerId ? 'active' : ''} ${player.id === myPlayerId ? 'is-me' : ''}`}
                        >
                            <div className="player-color-dot" style={{ background: player.color }} />
                            <div className="player-info">
                                <div className="player-name-row">
                                    <span className="player-name">{player.name}</span>
                                    {player.id === myPlayerId && <span className="player-you-badge">YOU</span>}
                                </div>
                                <div className="player-stats">
                                    <span className="player-vp">⭐ {player.publicVictoryPoints || 0}</span>
                                    <span>🃏 {player.devCardCount || 0}</span>
                                    <span>📦 {player.totalResources || 0}</span>
                                    {player.hasLargestArmy && <span>⚔️</span>}
                                    {player.hasLongestRoad && <span>🛤️</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

function formatCardName(card) {
    const names = {
        knight: '⚔️ Knight',
        victory_point: '⭐ VP',
        road_building: '🛤️ Roads',
        year_of_plenty: '🎁 Year of Plenty',
        monopoly: '💰 Monopoly',
    };
    return names[card] || card;
}
