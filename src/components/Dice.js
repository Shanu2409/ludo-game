import React, { useState } from "react";
import { motion } from "framer-motion";

/**
 * Dice component renders the current dice value and handles rolling.
 * When the dice is clicked and `canRoll` is true, it invokes the
 * provided `onRoll` callback. If cheat mode is unlocked for the current
 * player, a cheat button is displayed that allows choosing the next
 * dice value. The chosen forced value is displayed beside the dice
 * while active.
 */
export default function Dice({
  value,
  canRoll,
  onRoll,
  isBluePlayer, // This prop name is misleading - it's actually "showCheatMode"
  onCheat,
  forceNumber,
  onSkipTurn,
  showSkip,
}) {
  const [cheatOpen, setCheatOpen] = useState(false);

  const handleCheatClick = () => {
    setCheatOpen((open) => !open);
  };

  const handleNumberSelect = (num) => {
    onCheat(num);
    setCheatOpen(false);
  };

  // Get dice face representation
  const getDiceFace = (val) => {
    const faces = {
      1: "⚀",
      2: "⚁",
      3: "⚂",
      4: "⚃",
      5: "⚄",
      6: "⚅",
    };
    return faces[val] || "🎲";
  };

  // Determine the display for the dice.  If a value has been rolled
  // already we show that value; otherwise a question mark is displayed.
  const face = value !== null ? getDiceFace(value) : "🎲";

  const handleDiceClick = () => {
    console.log("🎲 Dice clicked, canRoll:", canRoll);
    if (canRoll && onRoll) {
      onRoll();
    }
  };

  return (
    <div className="controls">
      <div className="dice-container">
        <motion.div
          className={`dice ${!canRoll ? "disabled" : ""}`}
          onClick={handleDiceClick}
          animate={{
            rotate: value !== null ? [0, 360, 720] : 0,
            scale: value !== null ? [1, 1.2, 1] : 1,
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          // whileHover={canRoll ? { scale: 1.1 } : {}}
          whileTap={canRoll ? { scale: 0.95 } : {}}
        >
          {face}
        </motion.div>
        {canRoll && (
          <div
            style={{
              color: "white",
              fontSize: "1rem",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            Click to Roll!
          </div>
        )}
      </div>

      {showSkip && (
        <div style={{ textAlign: "center" }}>
          <button
            className="skip-turn-btn"
            onClick={onSkipTurn}
            style={{
              padding: "0.8rem 1.5rem",
              background: "linear-gradient(135deg, #ff6b6b, #ee5a6f)",
              color: "white",
              border: "none",
              borderRadius: "25px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(255, 107, 107, 0.3)",
              transition: "all 0.3s",
            }}
          >
            ⏭️ Skip Turn (No Valid Moves)
          </button>
        </div>
      )}

      {isBluePlayer && (
        <div style={{ position: "relative" }}>
          <button className="cheat-button" onClick={handleCheatClick}>
            🎯 Cheat Mode
          </button>
          {cheatOpen && (
            <div className="cheat-popover">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className={`cheat-number ${
                    forceNumber === n ? "selected" : ""
                  }`}
                  onClick={() => handleNumberSelect(n)}
                >
                  {n}
                </div>
              ))}
            </div>
          )}
          {forceNumber && (
            <div
              style={{
                marginTop: "0.5rem",
                color: "white",
                fontSize: "0.9rem",
                textAlign: "center",
              }}
            >
              Next roll: {forceNumber}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
