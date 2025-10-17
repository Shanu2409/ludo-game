import React, { useMemo } from "react";

const BOARD_CENTER = 400; // Center point of the SVG
const BOARD_RADIUS = 200; // Radius of the circular board
const BOARD_SIZE = 52; // Total cells in the board
const HOME_PATH_SIZE = 6; // Cells in the home path
const PLAYER_COLORS = ["red", "green", "yellow", "blue"];

// Starting positions for each color on the board
const START_INDICES = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

const Board = ({
  players,
  currentTurn,
  onTokenClick,
  onCenterClick,
  diceValue,
  validTokens = [],
}) => {
  // Wrapper to pass both color and index to the token click handler
  const handleTokenClickWithColor = (color, index) => {
    // Only allow clicking tokens of the current player
    if (color === currentTurn) {
      onTokenClick(index);
    }
  };
  // Compute positions for the 52 cells on the circular board
  const { positions: boardPositions, angles } = useMemo(() => {
    const positions = [];
    const angles = [];
    const angleStep = (2 * Math.PI) / BOARD_SIZE;

    for (let i = 0; i < BOARD_SIZE; i++) {
      const angle = i * angleStep - Math.PI / 2; // Start from top
      angles.push(angle);
      const x = BOARD_CENTER + BOARD_RADIUS * Math.cos(angle);
      const y = BOARD_CENTER + BOARD_RADIUS * Math.sin(angle);
      positions.push({ x, y });
    }

    return { positions, angles };
  }, []);

  // Compute home positions for each player
  const homePositions = useMemo(() => {
    return computeHomePositions(angles);
  }, [angles]);

  // Compute base positions for each player
  const basePositions = useMemo(() => {
    return computeBasePositions(angles);
  }, [angles]);

  return (
    <div className="board" style={{ position: "relative" }}>
      <svg
        viewBox="0 0 800 800"
        className="board-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Draw circular board cells */}
        {boardPositions.map((pos, index) => {
          const isStartPosition = index % 13 === 0; // Starting positions
          return (
            <circle
              key={`cell-${index}`}
              cx={pos.x}
              cy={pos.y}
              r="12"
              fill={isStartPosition ? "#FFD700" : "#E8E8E8"}
              stroke={isStartPosition ? "#FFA500" : "#CCC"}
              strokeWidth="2"
            />
          );
        })}

        {/* Draw home paths */}
        {PLAYER_COLORS.map((color, playerIndex) => {
          return homePositions[color].map((pos, cellIndex) => (
            <circle
              key={`home-${color}-${cellIndex}`}
              cx={pos.x}
              cy={pos.y}
              r="10"
              fill={color}
              opacity="0.5"
              stroke={color}
              strokeWidth="2"
            />
          ));
        })}

        {/* Draw bases */}
        {PLAYER_COLORS.map((color, playerIndex) => {
          const base = basePositions[color];
          return (
            <g key={`base-${color}`}>
              <circle
                cx={base.cx}
                cy={base.cy}
                r="80"
                fill={color}
                opacity="0.3"
                stroke={color}
                strokeWidth="3"
              />
              {/* Draw 4 token slots in the base */}
              {base.slots.map((slot, slotIndex) => (
                <circle
                  key={`base-slot-${color}-${slotIndex}`}
                  cx={slot.x}
                  cy={slot.y}
                  r="15"
                  fill="white"
                  stroke={color}
                  strokeWidth="2"
                />
              ))}
            </g>
          );
        })}

        {/* Center clickable area for cheat unlock */}
        <circle
          cx={BOARD_CENTER}
          cy={BOARD_CENTER}
          r="40"
          fill="white"
          stroke="#888"
          strokeWidth="2"
          style={{ cursor: "pointer" }}
          onClick={onCenterClick}
        />
        <text
          x={BOARD_CENTER}
          y={BOARD_CENTER + 5}
          textAnchor="middle"
          fontSize="20"
          fontWeight="bold"
          fill="#888"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          LODU
        </text>

        {/* Render tokens inside SVG */}
        {renderTokensInSVG(
          players,
          boardPositions,
          homePositions,
          basePositions,
          handleTokenClickWithColor,
          currentTurn,
          validTokens
        )}
      </svg>
    </div>
  );
}; // Function to get token position based on steps
function getTokenPosition(
  color,
  tokenIndex,
  steps,
  boardPositions,
  homePositions,
  basePositions
) {
  // Token in base
  if (steps < 0) {
    return basePositions[color].slots[tokenIndex];
  }

  // Token on main board path
  if (steps < BOARD_SIZE) {
    const boardIndex = (START_INDICES[color] + steps) % BOARD_SIZE;
    return boardPositions[boardIndex];
  }

  // Token in home path
  if (steps < BOARD_SIZE + HOME_PATH_SIZE) {
    const homeIndex = steps - BOARD_SIZE;
    return homePositions[color][homeIndex];
  }

  // Token finished - center position
  return { x: BOARD_CENTER, y: BOARD_CENTER };
}

// Function to render tokens as SVG circles (instead of DOM elements)
function renderTokensInSVG(
  players,
  boardPositions,
  homePositions,
  basePositions,
  onTokenClick,
  currentTurn,
  validTokens = []
) {
  if (!players) return null;

  const elements = [];
  const positionMap = new Map();

  // Color mapping for tokens
  const COLOR_MAP = {
    red: "#f44336",
    green: "#4CAF50",
    yellow: "#FFEB3B",
    blue: "#2196F3",
  };

  PLAYER_COLORS.forEach((color) => {
    const player = players[color];
    if (!player || !player.tokens) return;

    player.tokens.forEach((token, index) => {
      const pos = getTokenPosition(
        color,
        index,
        token.steps,
        boardPositions,
        homePositions,
        basePositions
      );

      const posKey = `${Math.round(pos.x)},${Math.round(pos.y)}`;

      if (!positionMap.has(posKey)) {
        positionMap.set(posKey, []);
      }
      positionMap.get(posKey).push({
        color,
        index,
        steps: token.steps,
        basePos: pos,
      });
    });
  });

  // Render tokens with offsets if multiple tokens share a position
  positionMap.forEach((tokensAtPos) => {
    const count = tokensAtPos.length;

    tokensAtPos.forEach((tokenInfo, stackIndex) => {
      const { color, index, steps, basePos } = tokenInfo;
      let finalPos = { ...basePos };

      // If multiple tokens at same position, arrange them in a circle
      if (count > 1) {
        const angle = (2 * Math.PI * stackIndex) / count;
        const offsetRadius = 15;
        finalPos.x += offsetRadius * Math.cos(angle);
        finalPos.y += offsetRadius * Math.sin(angle);
      }

      const tokenRadius = 16;
      const isFinished = steps === BOARD_SIZE + HOME_PATH_SIZE;
      const isCurrentPlayer = color === currentTurn;
      const isValidMove = isCurrentPlayer && validTokens.includes(index);

      elements.push(
        <g key={`${color}-${index}`}>
          {/* Highlight ring for valid moves */}
          {isValidMove && (
            <circle
              cx={finalPos.x}
              cy={finalPos.y}
              r={tokenRadius + 6}
              fill="none"
              stroke="#FFD700"
              strokeWidth="3"
              opacity="0.8"
            >
              <animate
                attributeName="r"
                values={`${tokenRadius + 4};${tokenRadius + 8};${
                  tokenRadius + 4
                }`}
                dur="1s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.6;1;0.6"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          )}

          {/* Token circle */}
          <circle
            cx={finalPos.x}
            cy={finalPos.y}
            r={tokenRadius}
            fill={COLOR_MAP[color]}
            stroke={isValidMove ? "#FFD700" : "rgba(255, 255, 255, 0.8)"}
            strokeWidth={isValidMove ? "4" : "3"}
            style={{
              cursor: isCurrentPlayer ? "pointer" : "default",
              opacity: isCurrentPlayer ? 1 : 0.8,
            }}
            onClick={() => onTokenClick(color, index)}
            className="token-circle"
          >
            <title>
              {color.charAt(0).toUpperCase() + color.slice(1)} Token {index + 1}
              {isValidMove ? " (Click to move!)" : ""}
            </title>
          </circle>

          {/* Token number or finished indicator */}
          <text
            x={finalPos.x}
            y={finalPos.y + 5}
            textAnchor="middle"
            fontSize="14"
            fontWeight="bold"
            fill="white"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {isFinished ? "★" : steps >= 0 ? index + 1 : "○"}
          </text>

          {/* Stack count badge */}
          {count > 1 && (
            <>
              <circle
                cx={finalPos.x + 10}
                cy={finalPos.y - 10}
                r="8"
                fill="rgba(0, 0, 0, 0.7)"
                stroke="white"
                strokeWidth="1.5"
              />
              <text
                x={finalPos.x + 10}
                y={finalPos.y - 7}
                textAnchor="middle"
                fontSize="10"
                fontWeight="bold"
                fill="white"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {count}
              </text>
            </>
          )}
        </g>
      );
    });
  });

  return elements;
}

// Old renderTokens function - keeping for reference but not using
function renderTokens(
  players,
  boardPositions,
  homePositions,
  basePositions,
  onTokenClick
) {
  if (!players) return null;

  const elements = [];

  // Group tokens by position to handle stacking
  const positionMap = new Map();

  PLAYER_COLORS.forEach((color) => {
    const player = players[color];
    if (!player || !player.tokens) return;

    player.tokens.forEach((token, index) => {
      const pos = getTokenPosition(
        color,
        index,
        token.steps,
        boardPositions,
        homePositions,
        basePositions
      );

      const posKey = `${Math.round(pos.x)},${Math.round(pos.y)}`;

      if (!positionMap.has(posKey)) {
        positionMap.set(posKey, []);
      }
      positionMap.get(posKey).push({
        color,
        index,
        steps: token.steps,
        basePos: pos,
      });
    });
  });

  // Render tokens with offsets if multiple tokens share a position
  positionMap.forEach((tokensAtPos, posKey) => {
    const count = tokensAtPos.length;

    tokensAtPos.forEach((tokenInfo, stackIndex) => {
      const { color, index, steps, basePos } = tokenInfo;
      let finalPos = { ...basePos };

      // If multiple tokens at same position, arrange them in a circle
      if (count > 1) {
        const angle = (2 * Math.PI * stackIndex) / count;
        const offsetRadius = 12;
        finalPos.x += offsetRadius * Math.cos(angle);
        finalPos.y += offsetRadius * Math.sin(angle);
      }

      elements.push(
        <Token
          key={`${color}-${index}`}
          x={finalPos.x}
          y={finalPos.y}
          color={color}
          index={index}
          onClick={() => onTokenClick(index)}
          steps={steps}
          stackCount={count}
          stackIndex={stackIndex}
        />
      );
    });
  });

  return elements;
}

// Helper function to compute home path positions (keeping existing)
function computeHomePositions(angles) {
  const homePositions = {};
  const playerAngles = [angles[0], angles[13], angles[26], angles[39]]; // Red, Green, Yellow, Blue starting angles

  PLAYER_COLORS.forEach((color, playerIndex) => {
    const positions = [];
    const startAngle = playerAngles[playerIndex];

    for (let i = 0; i < HOME_PATH_SIZE; i++) {
      const distance = BOARD_RADIUS - (i + 1) * 25; // Move inward
      const x = BOARD_CENTER + distance * Math.cos(startAngle);
      const y = BOARD_CENTER + distance * Math.sin(startAngle);
      positions.push({ x, y });
    }

    homePositions[color] = positions;
  });

  return homePositions;
}

// Helper function to compute base positions
function computeBasePositions(angles) {
  const basePositions = {};
  const baseAngles = [angles[51], angles[12], angles[25], angles[38]]; // Positions before start

  PLAYER_COLORS.forEach((color, playerIndex) => {
    const angle = baseAngles[playerIndex];
    const baseDistance = BOARD_RADIUS + 120; // Distance from center
    const cx = BOARD_CENTER + baseDistance * Math.cos(angle);
    const cy = BOARD_CENTER + baseDistance * Math.sin(angle);

    // Create 4 token slots in a 2x2 grid
    const slots = [
      { x: cx - 25, y: cy - 25 },
      { x: cx + 25, y: cy - 25 },
      { x: cx - 25, y: cy + 25 },
      { x: cx + 25, y: cy + 25 },
    ];

    basePositions[color] = { cx, cy, slots };
  });

  return basePositions;
}

export default Board;
