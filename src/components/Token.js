import React from "react";
import { motion } from "framer-motion";

// Board constants
const BOARD_CELLS = 52;
const HOME_STEPS = 6;

// Mapping of colour names to friendly hex codes.  These values are
// intentionally vibrant to distinguish the tokens against the board.
const COLOUR_MAP = {
  red: "#f44336",
  blue: "#2196F3",
  green: "#4CAF50",
  yellow: "#FFEB3B",
};

/**
 * Token represents a single player's piece on the board.  Tokens are
 * animated between positions using Framer Motion.  Clicking on a
 * token will trigger the provided onClick handler, which the parent
 * component uses to attempt a move.
 */
export default function Token({
  x,
  y,
  color,
  index,
  steps,
  onClick,
  stackCount = 1,
  stackIndex = 0,
}) {
  // Determine the background colour of the token.
  const bg = COLOUR_MAP[color] || color;
  // Offset by half the token size to centre the circle on the given
  // coordinate.  The token is 32×32 pixels (defined in styles.css).
  const size = 32;
  const offsetX = x - size / 2;
  const offsetY = y - size / 2;

  // Check if token is finished
  const isFinished = steps === BOARD_CELLS + HOME_STEPS;

  // If multiple tokens are stacked, add visual indication
  const isStacked = stackCount > 1;

  return (
    <motion.div
      className={`token ${isStacked ? "stacked-token" : ""}`}
      style={{
        backgroundColor: bg,
        boxShadow: isStacked
          ? `0 0 0 2px rgba(255,255,255,0.8), 0 4px 12px rgba(0,0,0,0.3)`
          : undefined,
        zIndex: isStacked ? 10 + stackIndex : 5,
      }}
      animate={{ x: offsetX, y: offsetY }}
      transition={{ type: "spring", stiffness: 260, damping: 25 }}
      onClick={onClick}
      title={`${color.charAt(0).toUpperCase() + color.slice(1)} Token ${
        index + 1
      }${isStacked ? ` (${stackCount} tokens here)` : ""}`}
      // whileHover={{ scale: 1.15, zIndex: 20 }}
      whileTap={{ scale: 1.05 }}
    >
      {/* Display token index or finished indicator */}
      {isFinished ? "★" : steps >= 0 ? index + 1 : "○"}
      {/* Badge showing count if stacked */}
      {isStacked && (
        <motion.div
          className="stack-badge"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {stackCount}
        </motion.div>
      )}
    </motion.div>
  );
}
