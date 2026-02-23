// ============================================
// PLAYER COLORS - 8-color palette
// ============================================

export const PLAYER_COLORS = [
    '#E74C3C', // Red
    '#3498DB', // Blue
    '#2ECC71', // Green
    '#F39C12', // Orange
    '#9B59B6', // Purple
    '#1ABC9C', // Teal
    '#E91E63', // Pink
    '#FF9800', // Amber
];

export function getPlayerColor(index) {
    return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
