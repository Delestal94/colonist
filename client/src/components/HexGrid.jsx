import { useMemo, useState, useRef, useEffect } from 'react';
import { hexToPixel, hexPointsString, calculateBoardBounds, TERRAIN_FILLS, RESOURCE_ICONS, getNumberDots, HEX_SIZE } from '../utils/hexMath.js';

export default function HexGrid({ board, validPlacements, onVertexClick, onEdgeClick, onDebugEdgeClick, onHexClick, showSetupSettlement, showSetupRoad, showMoveRobber, buildMode, players, isDebug }) {

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

    const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
    const svgRef = useRef(null);
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        const handleWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setView(prev => ({
                ...prev,
                scale: Math.min(Math.max(prev.scale * delta, 0.4), 5)
            }));
        };

        svg.addEventListener('wheel', handleWheel, { passive: false });
        return () => svg.removeEventListener('wheel', handleWheel);
    }, []);

    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only left click for pan
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        const dx = (lastPos.current.x - e.clientX) * (1 / view.scale);
        const dy = (lastPos.current.y - e.clientY) * (1 / view.scale);

        setView(prev => ({
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy
        }));

        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    // Calculate dynamic viewBox
    const zoomedViewBox = useMemo(() => {
        const w = bounds.width / view.scale;
        const h = bounds.height / view.scale;
        const x = bounds.x + view.x + (bounds.width - w) / 2;
        const y = bounds.y + view.y + (bounds.height - h) / 2;
        return `${x} ${y} ${w} ${h}`;
    }, [bounds, view]);

    return (
        <svg
            ref={svgRef}
            className="board-svg"
            viewBox={zoomedViewBox}
            preserveAspectRatio="xMidYMid meet"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging.current ? 'grabbing' : 'default', touchAction: 'none' }}
        >
            <defs>
                {/* Water gradient background (Tropical Ocean Style) */}
                <radialGradient id="ocean-gradient" cx="50%" cy="50%" r="70%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="20%" stopColor="#0369a1" />
                    <stop offset="100%" stopColor="#0c4a6e" />
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

                        {/* Resource / Terrain Icon */}
                        {(() => {
                            let icon = null;
                            let fontSize = 28;
                            let yOffset = 0;
                            let opacity = 0.9;

                            if (hex.terrain === 'desert') {
                                icon = '🏜️';
                                fontSize = 20;
                            } else if (hex.terrain === 'fog') {
                                icon = '☁️';
                                fontSize = 26;
                                opacity = 0.7;
                            } else if (hex.resource && RESOURCE_ICONS[hex.resource]) {
                                icon = RESOURCE_ICONS[hex.resource];
                                if (hex.numberToken) {
                                    fontSize = 18;
                                    yOffset = -25;
                                    opacity = 0.6;
                                }
                            }

                            if (!icon || (hex.hasRobber && hex.terrain === 'desert')) return null;

                            return (
                                <text
                                    x={center.x}
                                    y={center.y + yOffset}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize={fontSize}
                                    opacity={opacity}
                                    style={{ pointerEvents: 'none', userSelect: 'none', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}
                                >
                                    {icon}
                                </text>
                            );
                        })()}

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
                const isFogIsland = board.mapType === 'fog_island';
                const isInternalPort = isFogIsland && dist < 140; // Detection threshold for "inner" ports

                // Push inward for internal ports, outward for normal ones
                // Gap is roughly 50px to 110px. -0.7 * 50 = -35. 110-35 = 75 (Middle!)
                const pushDist = HEX_SIZE * (isInternalPort ? -0.7 : 0.8);
                const outX = dist > 0 ? mx + (mx / dist) * pushDist : mx;
                const outY = dist > 0 ? my + (my / dist) * pushDist : my - pushDist;

                const label = port.type === 'generic' ? '3:1' : `2:1`;
                const resourceIcon = port.type !== 'generic' ? (RESOURCE_ICONS[port.type] || '') : '⚓';
                const icon = isFogIsland ? `⛵` : resourceIcon; // Just ship for the icon slot, resource in label maybe?
                // Actually, let's keep the resource emoji for clarity but styled better.
                const shipEmoji = "⛵";

                return (
                    <g key={`port-${i}`} style={{ pointerEvents: 'none' }}>
                        {/* Lines from port label to the two vertices */}
                        <line
                            x1={outX} y1={outY}
                            x2={v1.x} y2={v1.y}
                            stroke={isInternalPort ? "rgba(255, 255, 255, 0.5)" : "rgba(150, 200, 255, 0.35)"}
                            strokeWidth={isInternalPort ? 2 : 1.5}
                            strokeDasharray="3 2"
                        />
                        <line
                            x1={outX} y1={outY}
                            x2={v2.x} y2={v2.y}
                            stroke={isInternalPort ? "rgba(255, 255, 255, 0.5)" : "rgba(150, 200, 255, 0.35)"}
                            strokeWidth={isInternalPort ? 2 : 1.5}
                            strokeDasharray="3 2"
                        />

                        {/* Water ripple for ships */}
                        {isInternalPort && (
                            <ellipse
                                cx={outX} cy={outY + 4}
                                rx={14} ry={6}
                                fill="rgba(255, 255, 255, 0.15)"
                            />
                        )}

                        {/* Port vertex dots */}
                        <circle cx={v1.x} cy={v1.y} r={3} fill="rgba(150, 200, 255, 0.5)" />
                        <circle cx={v2.x} cy={v2.y} r={3} fill="rgba(150, 200, 255, 0.5)" />

                        {/* Port label background (Only for external ports) */}
                        {!isInternalPort && (
                            <rect
                                className="port-bg"
                                x={outX - 18}
                                y={outY - 12}
                                width={36}
                                height={24}
                                rx={6}
                            />
                        )}

                        {/* Port icon */}
                        <text
                            x={outX} y={isInternalPort ? outY - 4 : outY - 3}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={isInternalPort ? "20" : "12"}
                        >
                            {icon}
                        </text>

                        {/* Resource icon inside for ship */}
                        {isInternalPort && (
                            <text x={outX + 6} y={outY + 2} fontSize="10">
                                {resourceIcon}
                            </text>
                        )}

                        {/* Port ratio */}
                        <text
                            className="port-label"
                            x={outX} y={isInternalPort ? outY + 12 : outY + 7}
                            fontSize={isInternalPort ? "8" : "9"}
                            fill={isInternalPort ? "white" : undefined}
                            style={isInternalPort ? { fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)' } : {}}
                        >
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

                // An edge is a boundary/gap edge if it touches sea/foso
                const isBoundary = board.vertices[edge.vertices[0]].hexIds.length < 3 ||
                    board.vertices[edge.vertices[1]].hexIds.length < 3;

                return (
                    <g key={`edge-${edge.id}`} className="edge-spot">
                        {/* Debug Mode: clickable hitboxes for ALL edges */}
                        {isDebug && (
                            <line
                                x1={v1.x} y1={v1.y}
                                x2={v2.x} y2={v2.y}
                                stroke={board.ports.some(p => p.edgeId === edge.id) ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.1)"}
                                strokeWidth={10}
                                onClick={(e) => { e.stopPropagation(); onDebugEdgeClick(edge.id); }}
                                style={{ cursor: 'copy' }}
                            />
                        )}
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
