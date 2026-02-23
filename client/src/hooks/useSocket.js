// ============================================
// useSocket - Socket.IO Connection Hook
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
    const [connected, setConnected] = useState(false);
    const [gameState, setGameState] = useState(null);
    const [lastDice, setLastDice] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const socketRef = useRef(null);

    useEffect(() => {
        // In production, connect to same origin. In dev, connect to backend port.
        const serverUrl = import.meta.env.PROD
            ? window.location.origin
            : 'http://localhost:3001';

        const socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to server');
            setConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            setConnected(false);
        });

        socket.on('game-state', (state) => {
            setGameState(state);
        });

        socket.on('dice-rolled', (dice) => {
            setLastDice(dice);
        });

        socket.on('chat-message', (msg) => {
            setChatMessages(prev => [...prev.slice(-99), msg]);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const emit = useCallback((event, data) => {
        return new Promise((resolve) => {
            socketRef.current?.emit(event, data, (response) => {
                resolve(response);
            });
        });
    }, []);

    const emitNoAck = useCallback((event, data) => {
        socketRef.current?.emit(event, data);
    }, []);

    return {
        connected,
        gameState,
        lastDice,
        chatMessages,
        emit,
        emitNoAck,
        socket: socketRef,
    };
}
