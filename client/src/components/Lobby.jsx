import { useState } from 'react';

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

    if (inRoom) {
        const isHost = gameState.players[0]?.id === gameState.myPlayerId;

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

                    {error && <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</p>}

                    {isHost && (
                        <button
                            className="btn btn-primary"
                            onClick={handleStart}
                            disabled={gameState.players.length < 2}
                            style={{ width: '100%' }}
                        >
                            🎮 Start Game ({gameState.players.length} players)
                        </button>
                    )}
                    {!isHost && (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>
                            Waiting for host to start the game...
                        </p>
                    )}
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
