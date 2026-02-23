// ============================================
// SERVER ENTRY POINT
// ============================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GameManager } from './game/GameManager.js';
import { registerSocketHandlers } from './socket/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

const isProduction = process.env.NODE_ENV === 'production';

const io = new Server(httpServer, {
    cors: isProduction ? {} : {
        origin: ['http://localhost:5173', 'http://localhost:5174'],
        methods: ['GET', 'POST'],
    },
});

const gameManager = new GameManager();

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', games: gameManager.games.size });
});

// In production, serve the built client
if (isProduction) {
    const clientDist = join(__dirname, '..', 'client', 'dist');
    app.use(express.static(clientDist));

    // SPA fallback — serve index.html for all non-API routes
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
            res.sendFile(join(clientDist, 'index.html'));
        }
    });
}

// Register socket handlers
registerSocketHandlers(io, gameManager);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🏝️  Colonist server running on http://localhost:${PORT}`);
    console.log(`   Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
});
