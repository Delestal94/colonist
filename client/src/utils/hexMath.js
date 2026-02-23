// ============================================
// HEX MATH - Coordinate Utilities
// ============================================

// Hex size in pixels
export const HEX_SIZE = 50;

// Axial to pixel (flat-top hexagons)
export function hexToPixel(q, r, size = HEX_SIZE) {
    const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = size * ((3 / 2) * r);
    return { x, y };
}

// Get the 6 corner points of a hexagon
export function hexCorners(centerX, centerY, size = HEX_SIZE) {
    const corners = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i - 30);
        corners.push({
            x: centerX + size * Math.cos(angle),
            y: centerY + size * Math.sin(angle),
        });
    }
    return corners;
}

// Convert hex corners to SVG polygon points string
export function hexPointsString(centerX, centerY, size = HEX_SIZE) {
    return hexCorners(centerX, centerY, size)
        .map(p => `${p.x},${p.y}`)
        .join(' ');
}

// Get midpoint between two points
export function midpoint(p1, p2) {
    return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
    };
}

// Calculate board bounds for SVG viewBox
export function calculateBoardBounds(hexes, size = HEX_SIZE) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    hexes.forEach(hex => {
        const center = hexToPixel(hex.q, hex.r, size);
        const corners = hexCorners(center.x, center.y, size);
        corners.forEach(c => {
            minX = Math.min(minX, c.x);
            minY = Math.min(minY, c.y);
            maxX = Math.max(maxX, c.x);
            maxY = Math.max(maxY, c.y);
        });
    });

    const padding = size * 2.5; // Extra padding for port labels outside the board
    return {
        x: minX - padding,
        y: minY - padding,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
    };
}

// Terrain colors
export const TERRAIN_COLORS = {
    forest: '#2d5a27',
    hills: '#c0392b',
    fields: '#f1c40f',
    pasture: '#27ae60',
    mountains: '#7f8c8d',
    desert: '#e8d5a3',
};

// Lighter terrain fills for hex backgrounds
export const TERRAIN_FILLS = {
    forest: '#4a8c3f',
    hills: '#d35400',
    fields: '#f9e547',
    pasture: '#58d68d',
    mountains: '#95a5a6',
    desert: '#f5e6c8',
};

// Resource icons (emoji for now)
export const RESOURCE_ICONS = {
    wood: '🪵',
    brick: '🧱',
    wheat: '🌾',
    sheep: '🐑',
    ore: '⛏️',
};

// Number token probability dots
export function getNumberDots(number) {
    return 6 - Math.abs(7 - number);
}
