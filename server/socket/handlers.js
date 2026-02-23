// ============================================
// SOCKET HANDLERS - All Socket.IO Events
// ============================================

export function registerSocketHandlers(io, gameManager) {
    io.on('connection', (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);
        let currentRoom = null;
        let playerName = null;

        // ---- LOBBY ----

        socket.on('create-room', ({ name }, callback) => {
            const game = gameManager.createRoom();
            const result = game.addPlayer(socket.id, name);

            if (result.error) {
                callback({ error: result.error });
                return;
            }

            currentRoom = game.roomCode;
            playerName = name;
            socket.join(currentRoom);

            callback({ roomCode: game.roomCode });
            broadcastState(game);
        });

        socket.on('join-room', ({ roomCode, name }, callback) => {
            const game = gameManager.getGame(roomCode);
            if (!game) {
                callback({ error: 'Room not found' });
                return;
            }

            const result = game.addPlayer(socket.id, name);
            if (result.error) {
                callback({ error: result.error });
                return;
            }

            currentRoom = roomCode;
            playerName = name;
            socket.join(currentRoom);

            callback({ roomCode });
            broadcastState(game);
        });

        socket.on('start-game', (_, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.startGame();
            if (result.error) return callback?.({ error: result.error });

            callback?.({ success: true });
            broadcastState(game);
        });

        // ---- SETUP ----

        socket.on('place-setup-settlement', ({ vertexId }, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.placeSetupSettlement(socket.id, vertexId);
            callback?.(result);
            broadcastState(game);
        });

        socket.on('place-setup-road', ({ edgeId }, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.placeSetupRoad(socket.id, edgeId);
            callback?.(result);
            broadcastState(game);
        });

        // ---- GAMEPLAY ----

        socket.on('roll-dice', (_, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.rollDice(socket.id);
            callback?.(result);
            broadcastState(game);

            if (result.success) {
                io.to(currentRoom).emit('dice-rolled', result.dice);
            }
        });

        socket.on('discard-resources', ({ resources }, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.discardResources(socket.id, resources);
            callback?.(result);
            broadcastState(game);
        });

        socket.on('move-robber', ({ hexId }, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.moveRobber(socket.id, hexId);
            callback?.(result);
            broadcastState(game);
        });

        socket.on('steal-resource', ({ targetId }, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.stealResource(socket.id, targetId);
            callback?.(result);
            broadcastState(game);
        });

        // ---- BUILDING ----

        socket.on('build-settlement', ({ vertexId }, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.buildSettlement(socket.id, vertexId);
            callback?.(result);
            broadcastState(game);
        });

        socket.on('build-city', ({ vertexId }, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.buildCity(socket.id, vertexId);
            callback?.(result);
            broadcastState(game);
        });

        socket.on('build-road', ({ edgeId }, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.buildRoad(socket.id, edgeId);
            callback?.(result);
            broadcastState(game);
        });

        socket.on('build-free-road', ({ edgeId }, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.buildFreeRoad(socket.id, edgeId);
            callback?.(result);
            broadcastState(game);
        });

        // ---- DEV CARDS ----

        socket.on('buy-dev-card', (_, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.buyDevCard(socket.id);
            callback?.(result);
            broadcastState(game);
        });

        socket.on('play-dev-card', ({ cardType, params }, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.playDevCard(socket.id, cardType, params || {});
            callback?.(result);
            broadcastState(game);
        });

        // ---- TRADING ----

        socket.on('propose-trade', ({ offering, requesting }, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.proposeTrade(socket.id, offering, requesting);
            callback?.(result);
            broadcastState(game);
        });

        socket.on('respond-trade', ({ accepted }, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.respondToTrade(socket.id, accepted);
            callback?.(result);
            broadcastState(game);
        });

        socket.on('cancel-trade', (_, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.cancelTrade(socket.id);
            callback?.(result);
            broadcastState(game);
        });

        socket.on('bank-trade', ({ offering, requesting }, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.bankTrade(socket.id, offering, requesting);
            callback?.(result);
            broadcastState(game);
        });

        // ---- TURN ----

        socket.on('end-turn', (_, callback) => {
            const game = getGame();
            if (!game) return callback?.({ error: 'Not in a room' });

            const result = game.endTurn(socket.id);
            callback?.(result);
            broadcastState(game);
        });

        // ---- CHAT ----

        socket.on('chat-message', ({ message }) => {
            if (!currentRoom || !playerName) return;
            io.to(currentRoom).emit('chat-message', {
                sender: playerName,
                message,
                timestamp: Date.now(),
            });
        });

        // ---- DISCONNECT ----

        socket.on('disconnect', () => {
            console.log(`[Socket] Disconnected: ${socket.id}`);
            if (currentRoom) {
                const game = gameManager.getGame(currentRoom);
                if (game) {
                    game.removePlayer(socket.id);
                    broadcastState(game);

                    // Clean up empty rooms
                    if (game.players.every(p => !p.connected)) {
                        gameManager.deleteRoom(currentRoom);
                    }
                }
            }
        });

        // ---- HELPERS ----

        function getGame() {
            return currentRoom ? gameManager.getGame(currentRoom) : null;
        }

        function broadcastState(game) {
            // Send personalized state to each player
            for (const player of game.players) {
                const state = game.getStateForPlayer(player.id);
                io.to(player.id).emit('game-state', state);
            }
        }
    });
}
