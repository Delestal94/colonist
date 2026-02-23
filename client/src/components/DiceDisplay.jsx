export default function DiceDisplay({ dice }) {
    if (!dice) return null;

    return (
        <div className="dice-display">
            <div className="dice-container">
                <div className="die">{dice.die1}</div>
                <div className="die">{dice.die2}</div>
            </div>
            <span className="dice-total">= {dice.total}</span>
        </div>
    );
}
