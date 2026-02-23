import { useState, useRef, useEffect } from 'react';

export default function ChatPanel({ messages, emitNoAck }) {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    function handleSend() {
        if (!input.trim()) return;
        emitNoAck('chat-message', { message: input.trim() });
        setInput('');
    }

    return (
        <div className="chat-section">
            <h3>Chat</h3>
            <div className="chat-messages">
                {messages.map((msg, i) => (
                    <div key={i} className="chat-msg">
                        <span className="sender">{msg.sender}: </span>
                        {msg.message}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-row">
                <input
                    className="chat-input"
                    type="text"
                    placeholder="Type a message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    maxLength={200}
                />
                <button className="chat-send-btn" onClick={handleSend}>Send</button>
            </div>
        </div>
    );
}
