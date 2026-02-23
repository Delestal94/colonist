import { useState } from 'react';
import { RESOURCE_ICONS } from '../utils/hexMath.js';

const RESOURCES = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

export default function TradeDialog({ myPlayer, players, emit, onClose, activeTrade, myPlayerId }) {
    const [offering, setOffering] = useState({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });
    const [requesting, setRequesting] = useState({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });
    const [mode, setMode] = useState('player'); // 'player' | 'bank'
    const [bankOffer, setBankOffer] = useState('');
    const [bankRequest, setBankRequest] = useState('');

    // Check if there's an incoming trade
    const incomingTrade = activeTrade && activeTrade.proposerId !== myPlayerId;
    const myTradeResponse = activeTrade?.responses?.[myPlayerId];

    async function handlePropose() {
        const offerFiltered = Object.fromEntries(Object.entries(offering).filter(([, v]) => v > 0));
        const requestFiltered = Object.fromEntries(Object.entries(requesting).filter(([, v]) => v > 0));

        if (Object.keys(offerFiltered).length === 0 || Object.keys(requestFiltered).length === 0) return;
        await emit('propose-trade', { offering: offerFiltered, requesting: requestFiltered });
    }

    async function handleAccept() {
        await emit('respond-trade', { accepted: true });
        onClose();
    }

    async function handleReject() {
        await emit('respond-trade', { accepted: false });
    }

    async function handleCancel() {
        await emit('cancel-trade');
        onClose();
    }

    async function handleBankTrade() {
        if (!bankOffer || !bankRequest || bankOffer === bankRequest) return;

        // Determine ratio based on ports
        let ratio = 4;
        const playerVertices = [...(myPlayer.settlements || []), ...(myPlayer.cities || [])];
        // We'd need port info here; default to 4:1 for now

        await emit('bank-trade', {
            offering: { resource: bankOffer, amount: ratio },
            requesting: { resource: bankRequest, amount: 1 },
        });
    }

    return (
        <div className="trade-overlay" onClick={onClose}>
            <div className="trade-dialog" onClick={e => e.stopPropagation()}>
                {/* Incoming trade */}
                {incomingTrade && (
                    <>
                        <h2>📨 Trade Offer</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            {players.find(p => p.id === activeTrade.proposerId)?.name} wants to trade:
                        </p>

                        <div className="trade-section">
                            <h4>They Offer</h4>
                            <div className="trade-resources">
                                {Object.entries(activeTrade.offering).map(([res, amt]) => (
                                    <div key={res} className="trade-resource-btn">
                                        <span className="resource-icon">{RESOURCE_ICONS[res]}</span>
                                        <span className="count">{amt}</span>
                                        <span className="resource-label">{res}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="trade-section">
                            <h4>They Want</h4>
                            <div className="trade-resources">
                                {Object.entries(activeTrade.requesting).map(([res, amt]) => (
                                    <div key={res} className="trade-resource-btn">
                                        <span className="resource-icon">{RESOURCE_ICONS[res]}</span>
                                        <span className="count">{amt}</span>
                                        <span className="resource-label">{res}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {myTradeResponse === undefined && (
                            <div className="trade-buttons">
                                <button className="btn btn-success" onClick={handleAccept} style={{ flex: 1 }}>
                                    ✅ Accept
                                </button>
                                <button className="btn btn-danger" onClick={handleReject} style={{ flex: 1 }}>
                                    ❌ Decline
                                </button>
                            </div>
                        )}
                        {myTradeResponse !== undefined && (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>
                                You {myTradeResponse ? 'accepted' : 'declined'} this trade.
                            </p>
                        )}
                    </>
                )}

                {/* My trade offer */}
                {!incomingTrade && (
                    <>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <button
                                className={`btn btn-small ${mode === 'player' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setMode('player')}
                            >
                                🤝 Player Trade
                            </button>
                            <button
                                className={`btn btn-small ${mode === 'bank' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setMode('bank')}
                            >
                                🏦 Bank Trade
                            </button>
                        </div>

                        {mode === 'player' && (
                            <>
                                <h2>🤝 Propose Trade</h2>

                                <div className="trade-section">
                                    <h4>I'm Offering</h4>
                                    <div className="trade-resources">
                                        {RESOURCES.map(res => (
                                            <div key={res} className="trade-resource-btn" onClick={() => {
                                                if (offering[res] < (myPlayer.resources[res] || 0)) {
                                                    setOffering({ ...offering, [res]: offering[res] + 1 });
                                                }
                                            }}>
                                                <span className="resource-icon">{RESOURCE_ICONS[res]}</span>
                                                <span className="count">{offering[res]}</span>
                                                <span className="resource-label">{res}</span>
                                                {offering[res] > 0 && (
                                                    <button className="btn btn-small btn-danger" onClick={e => {
                                                        e.stopPropagation();
                                                        setOffering({ ...offering, [res]: offering[res] - 1 });
                                                    }}>-</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="trade-section">
                                    <h4>I Want</h4>
                                    <div className="trade-resources">
                                        {RESOURCES.map(res => (
                                            <div key={res} className="trade-resource-btn" onClick={() => {
                                                setRequesting({ ...requesting, [res]: requesting[res] + 1 });
                                            }}>
                                                <span className="resource-icon">{RESOURCE_ICONS[res]}</span>
                                                <span className="count">{requesting[res]}</span>
                                                <span className="resource-label">{res}</span>
                                                {requesting[res] > 0 && (
                                                    <button className="btn btn-small btn-danger" onClick={e => {
                                                        e.stopPropagation();
                                                        setRequesting({ ...requesting, [res]: requesting[res] - 1 });
                                                    }}>-</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="trade-buttons">
                                    <button className="btn btn-primary" onClick={handlePropose} style={{ flex: 1 }}>
                                        📤 Send Offer
                                    </button>
                                    <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}

                        {mode === 'bank' && (
                            <>
                                <h2>🏦 Bank Trade (4:1)</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                    Trade 4 of one resource for 1 of another. Ports may give better rates.
                                </p>

                                <div className="trade-section">
                                    <h4>Give (4x)</h4>
                                    <div className="trade-resources">
                                        {RESOURCES.map(res => (
                                            <div
                                                key={res}
                                                className="trade-resource-btn"
                                                onClick={() => setBankOffer(res)}
                                                style={{
                                                    borderColor: bankOffer === res ? 'var(--accent-blue)' : 'var(--border-color)',
                                                    opacity: (myPlayer.resources[res] || 0) < 4 ? 0.4 : 1,
                                                }}
                                            >
                                                <span className="resource-icon">{RESOURCE_ICONS[res]}</span>
                                                <span className="count">{myPlayer.resources[res] || 0}</span>
                                                <span className="resource-label">{res}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="trade-section">
                                    <h4>Receive (1x)</h4>
                                    <div className="trade-resources">
                                        {RESOURCES.filter(r => r !== bankOffer).map(res => (
                                            <div
                                                key={res}
                                                className="trade-resource-btn"
                                                onClick={() => setBankRequest(res)}
                                                style={{ borderColor: bankRequest === res ? 'var(--accent-green)' : 'var(--border-color)' }}
                                            >
                                                <span className="resource-icon">{RESOURCE_ICONS[res]}</span>
                                                <span className="resource-label">{res}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="trade-buttons">
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleBankTrade}
                                        disabled={!bankOffer || !bankRequest}
                                        style={{ flex: 1 }}
                                    >
                                        🔄 Trade
                                    </button>
                                    <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
