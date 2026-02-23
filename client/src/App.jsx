import { useState } from 'react';
import { useSocket } from './hooks/useSocket.js';
import Lobby from './components/Lobby.jsx';
import GameBoard from './components/GameBoard.jsx';

function App() {
    const { connected, gameState, lastDice, chatMessages, emit, emitNoAck } = useSocket();
    const [buildMode, setBuildMode] = useState(null); // 'settlement' | 'city' | 'road' | null
    const [freeRoads, setFreeRoads] = useState(0);

    const isInGame = gameState && gameState.phase !== 'lobby';

    return (
        <div className="app">
            {!isInGame ? (
                <Lobby
                    connected={connected}
                    gameState={gameState}
                    emit={emit}
                />
            ) : (
                <GameBoard
                    gameState={gameState}
                    lastDice={lastDice}
                    chatMessages={chatMessages}
                    emit={emit}
                    emitNoAck={emitNoAck}
                    buildMode={buildMode}
                    setBuildMode={setBuildMode}
                    freeRoads={freeRoads}
                    setFreeRoads={setFreeRoads}
                />
            )}
        </div>
    );
}

export default App;
