import { useMemo } from 'react';
import { hexToPixel, hexPointsString, calculateBoardBounds, TERRAIN_FILLS, RESOURCE_ICONS, getNumberDots, HEX_SIZE } from '../utils/hexMath.js';

export default function HexGrid({ board, validPlacements, onVertexClick, onEdgeClick, onHexClick, showSetupSettlement, showSetupRoad, showMoveRobber, buildMode, players }) {

    const bounds = useMemo(() => {
        if (!board?.hexes) return { x: -200, y: -200, width: 400, height: 400 };
        return calculateBoardBounds(board.hexes, HEX_SIZE);
    }, [board?.hexes]);

    if (!board) return null;

    const validSettlements = validPlacements?.settlements || [];
    const validRoads = validPlacements?.roads || [];
    const validCities = validPlacements?.cities || [];

    // Build vertex position map from board data
    const vertexPositions = useMemo(() => {
        const map = {};
        board.vertices?.forEach(v => {
            map[v.id] = {
                x: v.position.x * HEX_SIZE,
                y: v.position.y * HEX_SIZE,
            };
        });
        return map;
    }, [board.vertices]);

    return (
        <svg
            className="board-svg"
            viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                {/* Water gradient background */}
                <radialGradient id="ocean-gradient" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="#1a3a5c" />
                    <stop offset="100%" stopColor="#0a1628" />
                </radialGradient>

                {/* Glow filter */}
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Ocean background */}
            <rect
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                fill="url(#ocean-gradient)"
            />

            {/* Hexes */}
            {board.hexes.map(hex => {
                const center = hexToPixel(hex.q, hex.r, HEX_SIZE);
                const points = hexPointsString(center.x, center.y, HEX_SIZE);
                const fill = TERRAIN_FILLS[hex.terrain] || '#666';
                const isHighProb = hex.numberToken === 6 || hex.numberToken === 8;
                const dots = hex.numberToken ? getNumberDots(hex.numberToken) : 0;

                return (
                    <g
                        key={hex.id}
                        className="hex-tile"
                        onClick={() => onHexClick(hex.id)}
                        style={{ cursor: showMoveRobber ? 'pointer' : 'default' }}
                    >
                        <polygon
                            className="hex-polygon"
                            points={points}
                            fill={fill}
                            style={showMoveRobber && !hex.hasRobber ? { stroke: 'rgba(231, 76, 60, 0.4)', strokeWidth: 2 } : {}}
                        />

                        {/* Number token */}
                        {hex.numberToken && (
                            <>
                                <circle className="hex-number-bg" cx={center.x} cy={center.y} r={15} />
                                <text
                                    className={`hex-number-text ${isHighProb ? 'high-prob' : ''}`}
                                    x={center.x}
                                    y={center.y - 2}
                                    fontSize="14"
                                >
                                    {hex.numberToken}
                                </text>
                                {/* Probability dots as circles */}
                                {dots > 0 && (() => {
                                    const dotRadius = 1.5;
                                    const dotSpacing = 4.5;
                                    const totalWidth = (dots - 1) * dotSpacing;
                                    const startX = center.x - totalWidth / 2;
                                    const dotY = center.y + 9;
                                    const dotColor = isHighProb ? '#c0392b' : '#888';
                                    return Array.from({ length: dots }, (_, di) => (
                                        <circle
                                            key={`dot-${hex.id}-${di}`}
                                            cx={startX + di * dotSpacing}
                                            cy={dotY}
                                            r={dotRadius}
                                            fill={dotColor}
                                        />
                                    ));
                                })()}
                            </>
                        )}

                        {/* Desert icon */}
                        {hex.terrain === 'desert' && !hex.hasRobber && (
                            <text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="central" fontSize="18">
                                🏜️
                            </text>
                        )}

                        {/* Robber */}
                        {hex.hasRobber && (
                            <>
                                <circle className="hex-robber" cx={center.x} cy={center.y} r={14} />
                                <text className="hex-robber-icon" x={center.x} y={center.y}>🦹</text>
                            </>
                        )}
                    </g>
                );
            })}

            {/* Ports */}
            {board.ports?.map((port, i) => {
                const v1 = vertexPositions[port.vertexIds[0]];
                const v2 = vertexPositions[port.vertexIds[1]];
                if (!v1 || !v2) return null;

                // Midpoint between the two port vertices
                const mx = (v1.x + v2.x) / 2;
                const my = (v1.y + v2.y) / 2;

                // Push the label outward from the board center (0,0)
                const dist = Math.sqrt(mx * mx + my * my);
                const pushDist = HEX_SIZE * 0.8;
                const outX = dist > 0 ? mx + (mx / dist) * pushDist : mx;
                const outY = dist > 0 ? my + (my / dist) * pushDist : my - pushDist;

                const label = port.type === 'generic' ? '3:1' : `2:1`;
                const icon = port.type !== 'generic' ? (RESOURCE_ICONS[port.type] || '') : '⚓';

                return (
                    <g key={`port-${i}`}>
                        {/* Lines from port label to the two vertices */}
                        <line
                            x1={outX} y1={outY}
                            x2={v1.x} y2={v1.y}
                            stroke="rgba(150, 200, 255, 0.35)"
                            strokeWidth={1.5}
                            strokeDasharray="3 2"
                        />
                        <line
                            x1={outX} y1={outY}
                            x2={v2.x} y2={v2.y}
                            stroke="rgba(150, 200, 255, 0.35)"
                            strokeWidth={1.5}
                            strokeDasharray="3 2"
                        />
                        {/* Port vertex dots */}
                        <circle cx={v1.x} cy={v1.y} r={3} fill="rgba(150, 200, 255, 0.5)" />
                        <circle cx={v2.x} cy={v2.y} r={3} fill="rgba(150, 200, 255, 0.5)" />
                        {/* Port label background */}
                        <rect
                            className="port-bg"
                            x={outX - 16}
                            y={outY - 10}
                            width={32}
                            height={20}
                            rx={4}
                        />
                        {/* Port icon */}
                        <text x={outX} y={outY - 2} textAnchor="middle" dominantBaseline="central" fontSize="8">
                            {icon}
                        </text>
                        {/* Port ratio */}
                        <text className="port-label" x={outX} y={outY + 6} fontSize="7">
                            {label}
                        </text>
                    </g>
                );
            })}

            {/* Edges (roads) */}
            {board.edges?.map(edge => {
                const v1 = vertexPositions[edge.vertices[0]];
                const v2 = vertexPositions[edge.vertices[1]];
                if (!v1 || !v2) return null;

                const isValid = validRoads.includes(edge.id);
                const hasRoad = edge.road;
                const player = hasRoad ? players?.find(p => p.id === edge.road.playerId) : null;

                return (
                    <g key={`edge-${edge.id}`} className="edge-spot">
                        {/* Valid placement: fat invisible hitbox + visible indicator */}
                        {isValid && (buildMode === 'road' || showSetupRoad) && (
                            <>
                                {/* Invisible fat hitbox for easy clicking */}
                                <line
                                    x1={v1.x} y1={v1.y}
                                    x2={v2.x} y2={v2.y}
                                    stroke="transparent"
                                    strokeWidth={14}
                                    onClick={(e) => { e.stopPropagation(); onEdgeClick(edge.id); }}
                                    style={{ cursor: 'pointer' }}
                                />
                                {/* Visible indicator */}
                                <line
                                    className="edge-valid-indicator"
                                    x1={v1.x} y1={v1.y}
                                    x2={v2.x} y2={v2.y}
                                    onClick={(e) => { e.stopPropagation(); onEdgeClick(edge.id); }}
                                    style={{ cursor: 'pointer', pointerEvents: 'none' }}
                                />
                            </>
                        )}

                        {/* Existing road */}
                        {hasRoad && (
                            <line
                                className="road-line"
                                x1={v1.x} y1={v1.y}
                                x2={v2.x} y2={v2.y}
                                stroke={player?.color || '#fff'}
                            />
                        )}
                    </g>
                );
            })}

            {/* Vertices (settlements/cities) */}
            {board.vertices?.map(vertex => {
                const pos = vertexPositions[vertex.id];
                if (!pos) return null;

                const isValidSettlement = validSettlements.includes(vertex.id);
                const isValidCity = validCities.includes(vertex.id);
                const hasBuilding = vertex.building;
                const player = hasBuilding ? players?.find(p => p.id === vertex.building.playerId) : null;
                const isClickable = isValidSettlement || isValidCity;

                return (
                    <g
                        key={`vertex-${vertex.id}`}
                        className={`vertex-spot ${isClickable ? 'valid' : ''}`}
                        onClick={isClickable ? () => onVertexClick(vertex.id) : undefined}
                        style={{ cursor: isClickable ? 'pointer' : 'default' }}
                    >
                        {/* Valid placement indicator */}
                        {isValidSettlement && (showSetupSettlement || buildMode === 'settlement') && (
                            <circle
                                className="vertex-valid-indicator"
                                cx={pos.x} cy={pos.y} r={6}
                            />
                        )}

                        {/* Valid city upgrade indicator */}
                        {isValidCity && buildMode === 'city' && (
                            <circle
                                className="vertex-valid-indicator"
                                cx={pos.x} cy={pos.y} r={8}
                                style={{ stroke: 'gold', fill: 'rgba(255, 215, 0, 0.2)' }}
                            />
                        )}

                        {/* Settlement (house shape) */}
                        {hasBuilding && vertex.building.type === 'settlement' && (
                            <polygon
                                className="settlement-shape"
                                points={`${pos.x},${pos.y - 8} ${pos.x + 6},${pos.y - 2} ${pos.x + 6},${pos.y + 5} ${pos.x - 6},${pos.y + 5} ${pos.x - 6},${pos.y - 2}`}
                                fill={player?.color || '#fff'}
                            />
                        )}

                        {/* City (larger shape) */}
                        {hasBuilding && vertex.building.type === 'city' && (
                            <polygon
                                className="city-shape"
                                points={`${pos.x - 4},${pos.y - 10} ${pos.x + 4},${pos.y - 10} ${pos.x + 8},${pos.y - 4} ${pos.x + 8},${pos.y + 6} ${pos.x - 8},${pos.y + 6} ${pos.x - 8},${pos.y - 4}`}
                                fill={player?.color || '#fff'}
                            />
                        )}
                    </g>
                );
            })}
        </svg>
    );
}
