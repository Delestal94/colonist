import { useState } from 'react';

const MAP_OPTIONS = [
    { id: 'base', label: 'Base', icon: '🏝️', description: 'Scales with players', players: '2-8' },
    { id: 'base_5_6', label: 'Base 5-6P', icon: '🗺️', description: 'Classic Extended', players: '2-8' },
    { id: 'diamond', label: 'Diamond', icon: '💎', description: 'Scalable Diamond', players: '2-8' },
    { id: 'random', label: 'Random', icon: '🎲', description: 'Scalable Random', players: '2-8' },
    { id: 'big', label: 'Big 7-8P', icon: '🌍', description: 'Always Massive', players: '2-8' },
    { id: 'fog_island', label: 'Fog Island', icon: '🌫️', description: 'Scalable Exploration', players: '2-8' },
    { id: 'archipelago', label: 'Archipelago', icon: '🏝️🏝️', description: 'Scaling Islands', players: '2-8' },
    { id: 'ring_of_fire', label: 'Ring of Fire', icon: '🌋', description: 'Scalable Ring', players: '2-8' },
    { id: 'twin_peaks', label: 'Twin Peaks', icon: '🏔️🏔️', description: 'Scaling Peaks', players: '2-8' },
];

export default function Lobby({ connected, gameState, emit }) {
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');
    const [view, setView] = useState('home'); // 'home' | 'waiting'

    const inRoom = gameState && gameState.phase === 'lobby';

    async function handleCreate() {
        if (!name.trim()) return setError('Enter your name');
        const result = await emit('create-room', { name: name.trim() });
        if (result?.error) setError(result.error);
        else setView('waiting');
    }

    async function handleJoin() {
        if (!name.trim()) return setError('Enter your name');
        if (!roomCode.trim()) return setError('Enter a room code');
        const result = await emit('join-room', { roomCode: roomCode.trim().toUpperCase(), name: name.trim() });
        if (result?.error) setError(result.error);
        else setView('waiting');
    }

    async function handleStart() {
        const result = await emit('start-game');
        if (result?.error) setError(result.error);
    }

    async function handleUpdateSettings(newSettings) {
        const result = await emit('update-settings', { settings: newSettings });
        if (result?.error) setError(result.error);
    }

    if (inRoom) {
        const isHost = gameState.players[0]?.id === gameState.myPlayerId;
        const settings = gameState.settings || { mapType: 'base', friendlyRobber: false, speedMode: false, victoryPoints: 10 };

        return (
            <div className="lobby">
                <div className="connection-status">
                    <div className={`connection-dot ${connected ? '' : 'disconnected'}`} />
                    {connected ? 'Connected' : 'Reconnecting...'}
                </div>

                <h1 className="lobby-title">Colonist</h1>
                <p className="lobby-subtitle">Waiting for players...</p>

                <div className="lobby-card">
                    <h2>Room Code</h2>
                    <div className="lobby-room-code">{gameState.roomCode}</div>

                    <h2>Players ({gameState.players.length}/8)</h2>
                    <ul className="lobby-players">
                        {gameState.players.map((player, i) => (
                            <li key={player.id} className="lobby-player">
                                <div className="lobby-player-color" style={{ background: player.color }} />
                                <span className="lobby-player-name">{player.name}</span>
                                {player.id === gameState.myPlayerId && (
                                    <span className="lobby-player-you">YOU</span>
                                )}
                                {i === 0 && <span className="lobby-player-you">HOST</span>}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Map Selection & Settings */}
                <div className="lobby-card">
                    <h2>🗺️ Map</h2>
                    <div className="map-selector">
                        <div style={{ gridColumn: '1 / -1', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Core Maps</div>
                        {MAP_OPTIONS.slice(0, 6).map(map => (
                            <button
                                key={map.id}
                                className={`map-card ${settings.mapType === map.id ? 'selected' : ''}`}
                                onClick={() => isHost && handleUpdateSettings({ mapType: map.id })}
                                disabled={!isHost}
                                title={map.description}
                            >
                                <span className="map-card-icon">{map.icon}</span>
                                <span className="map-card-label">{map.label}</span>
                                <span className="map-card-players">{map.players}</span>
                            </button>
                        ))}
                        <div style={{ gridColumn: '1 / -1', fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0.25rem', fontWeight: 600 }}>Expert Maps</div>
                        {MAP_OPTIONS.slice(6).map(map => (
                            <button
                                key={map.id}
                                className={`map-card ${settings.mapType === map.id ? 'selected' : ''}`}
                                onClick={() => isHost && handleUpdateSettings({ mapType: map.id })}
                                disabled={!isHost}
                                title={map.description}
                            >
                                <span className="map-card-icon">{map.icon}</span>
                                <span className="map-card-label">{map.label}</span>
                                <span className="map-card-players">{map.players}</span>
                            </button>
                        ))}
                    </div>

                    <h2>⚙️ Settings</h2>
                    <div className="settings-toggles">
                        <label className={`setting-toggle ${!isHost ? 'disabled' : ''}`}>
                            <input
                                type="checkbox"
                                checked={settings.friendlyRobber}
                                onChange={(e) => isHost && handleUpdateSettings({ friendlyRobber: e.target.checked })}
                                disabled={!isHost}
                            />
                            <span className="toggle-slider"></span>
                            <div className="toggle-info">
                                <span className="toggle-label">🛡️ Friendly Robber</span>
                                <span className="toggle-desc">Can't target players with ≤2 VP</span>
                            </div>
                        </label>

                        <label className={`setting-toggle ${!isHost ? 'disabled' : ''}`}>
                            <input
                                type="checkbox"
                                checked={settings.speedMode}
                                onChange={(e) => isHost && handleUpdateSettings({ speedMode: e.target.checked })}
                                disabled={!isHost}
                            />
                            <span className="toggle-slider"></span>
                            <div className="toggle-info">
                                <span className="toggle-label">⚡ Speed Mode</span>
                                <span className="toggle-desc">Start with 2 of each resource</span>
                            </div>
                        </label>

                        <label className={`setting-toggle ${!isHost ? 'disabled' : ''}`}>
                            <input
                                type="checkbox"
                                checked={settings.harbormaster}
                                onChange={(e) => isHost && handleUpdateSettings({ harbormaster: e.target.checked })}
                                disabled={!isHost}
                            />
                            <span className="toggle-slider"></span>
                            <div className="toggle-info">
                                <span className="toggle-label">⚓ Harbormaster</span>
                                <span className="toggle-desc">+2 VP for most port points (min 3)</span>
                            </div>
                        </label>
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                        <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>🏆 Victory Points to Win: {settings.victoryPoints}</h4>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {[10, 12, 14, 16, 18].map(vp => (
                                <button
                                    key={vp}
                                    className={`btn btn-small ${settings.victoryPoints === vp ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => isHost && handleUpdateSettings({ victoryPoints: vp })}
                                    disabled={!isHost}
                                    style={{ flex: 1 }}
                                >
                                    {vp}
                                </button>
                            ))}
                        </div>

                        {error && <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', margin: '1rem 0 0.5rem' }}>{error}</p>}

                        {isHost && (
                            <button
                                className="btn btn-primary"
                                onClick={handleStart}
                                disabled={gameState.players.length < 1}
                                style={{ width: '100%', marginTop: '1.5rem', padding: '1rem' }}
                            >
                                🎮 Start Game ({gameState.players.length} players)
                            </button>
                        )}
                        {!isHost && (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                Waiting for host to start the game...
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="lobby">
            <div className="connection-status">
                <div className={`connection-dot ${connected ? '' : 'disconnected'}`} />
                {connected ? 'Connected' : 'Connecting...'}
            </div>

            <h1 className="lobby-title">Colonist</h1>
            <p className="lobby-subtitle">A multiplayer settlers board game · up to 8 players</p>

            <div className="lobby-card">
                <h2>Enter Your Name</h2>
                <input
                    className="lobby-input"
                    type="text"
                    placeholder="Your name..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={20}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />

                {error && <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</p>}

                <div className="lobby-actions">
                    <button className="btn btn-primary" onClick={handleCreate} disabled={!connected || !name.trim()}>
                        🏝️ Create Room
                    </button>
                </div>

                <div className="lobby-divider">or join an existing room</div>

                <input
                    className="lobby-input"
                    type="text"
                    placeholder="Room code (e.g. AB3K)"
                    value={roomCode}
                    onChange={e => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={4}
                    style={{ textAlign: 'center', letterSpacing: '0.2em', fontWeight: 700 }}
                />

                <div className="lobby-actions">
                    <button className="btn btn-secondary" onClick={handleJoin} disabled={!connected || !name.trim() || !roomCode.trim()}>
                        🚪 Join Room
                    </button>
                </div>
            </div>
        </div>
    );
}
