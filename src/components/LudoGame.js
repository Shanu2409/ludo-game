import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import Board from "./Board";
import Dice from "./Dice";

// Define the order of players around the table.  The turn will cycle
// through this array when moving to the next player.
const PLAYER_COLORS = ["red", "blue", "green", "yellow"];

// Starting index of each colour on the 52‑cell board.  These offsets are
// used when computing the absolute board index from a token's number of
// steps taken since leaving the base.
const START_INDICES = {
  red: 0,
  blue: 13,
  green: 26,
  yellow: 39,
};

// Number of cells in the home path for each player.  Standard Ludo uses 6
// steps including the final finishing spot.  A token has finished when
// `steps === BOARD_CELLS + HOME_STEPS`.
const BOARD_CELLS = 52;
const HOME_STEPS = 6;

/**
 * Create an initial game state object.  Each player starts with four
 * tokens in the base (represented as `steps = -1`).  The first turn
 * belongs to the red player.  `diceValue` is null until a roll occurs.
 * 
 * Note: activePlayers starts empty and gets populated as players join the room.
 * This allows the game to work with any number of players (2, 3, or 4).
 */
function createInitialGameState(numPlayers = 4) {
  const players = {};

  PLAYER_COLORS.forEach((color) => {
    players[color] = {
      tokens: Array.from({ length: 4 }, () => ({ steps: -1 })),
      isActive: false,
    };
  });

  return {
    players,
    currentTurn: null, // Will be set when first player joins
    diceValue: null,
    forceNumber: null,
    winner: null,
    activePlayers: [], // Start empty, populate as players join
    numPlayers, // Store the intended number of players
  };
}

/**
 * Compute the absolute board index for a token given its colour and
 * number of steps taken.  Only valid for steps between 0 and 51.  When a
 * token enters the home path its board index is no longer relevant.
 */
function computeBoardIndex(color, steps) {
  return (START_INDICES[color] + steps) % BOARD_CELLS;
}

/**
 * Get the next active player in turn order.
 * Only cycles through players who have actually joined the room.
 */
function getNextPlayer(currentColor, activePlayers) {
  if (!activePlayers || activePlayers.length === 0) {
    return currentColor; // No other players, stay with current
  }
  const currentIndex = activePlayers.indexOf(currentColor);
  const nextIndex = (currentIndex + 1) % activePlayers.length;
  return activePlayers[nextIndex];
}

export default function LudoGame({ playerColor, roomId, numPlayers = 4 }) {
  const [gameState, setGameState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoMoveToken, setAutoMoveToken] = useState(null);
  const [showCheatInput, setShowCheatInput] = useState(false);
  const [cheatCode, setCheatCode] = useState("");
  const [cheatUnlocked, setCheatUnlocked] = useState(false);

  // On mount subscribe to Firestore for the given room.  If no game
  // document exists yet we create one with the initial state.  All
  // updates are persisted back to Firestore so that all connected
  // clients share the same state.
  useEffect(() => {
    if (!roomId) return;
    const roomRef = doc(db, "games", roomId);
    let unsub;

    (async () => {
      try {
        const snap = await getDoc(roomRef);
        if (!snap.exists()) {
          // Initialise a new game document if it does not exist.
          await setDoc(roomRef, createInitialGameState(numPlayers));
        } else {
          // Room exists - add this player to activePlayers if not already there
          const roomData = snap.data();
          const activePlayers = roomData.activePlayers || [];
          
          if (!activePlayers.includes(playerColor)) {
            // Add this player to the active players list
            const updatedActivePlayers = [...activePlayers, playerColor];
            const updates = {
              activePlayers: updatedActivePlayers,
              [`players.${playerColor}.isActive`]: true,
            };
            
            // If this is the first player joining, set them as current turn
            if (activePlayers.length === 0) {
              updates.currentTurn = playerColor;
            }
            
            await updateDoc(roomRef, updates);
          }
        }
        // Subscribe to realtime updates.  Every time the document
        // changes we update local state.
        unsub = onSnapshot(
          roomRef,
          (docSnap) => {
            const data = docSnap.data();
            setGameState(data);
            setIsLoading(false);
            setError(null);
          },
          (err) => {
            console.error("Firestore error:", err);
            setError(err.message);
            setIsLoading(false);
          }
        );
      } catch (err) {
        console.error("Firebase initialization error:", err);
        setError(err.message);
        setIsLoading(false);
      }
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [roomId, numPlayers, playerColor]);

  /**
   * Check if the current player has any valid moves with the given dice value
   */
  const hasValidMoves = useCallback(
    (diceValue, currentPlayer) => {
      if (!gameState || !gameState.players) return false;

      const player = gameState.players[currentPlayer];

      for (let i = 0; i < player.tokens.length; i++) {
        const token = player.tokens[i];

        // Token in base - can only move with a 6
        if (token.steps < 0) {
          if (diceValue === 6) return true;
        } else {
          // Token on board - check if move would overshoot
          const newSteps = token.steps + diceValue;
          if (newSteps <= BOARD_CELLS + HOME_STEPS) {
            return true;
          }
        }
      }

      return false;
    },
    [gameState]
  );

  /**
   * Get list of valid moveable tokens for the current player
   */
  const getValidTokens = useCallback(
    (diceValue, currentPlayer) => {
      if (!gameState || !gameState.players) return [];

      const player = gameState.players[currentPlayer];
      const validTokens = [];

      for (let i = 0; i < player.tokens.length; i++) {
        const token = player.tokens[i];

        // Token in base - can only move with a 6
        if (token.steps < 0) {
          if (diceValue === 6) {
            validTokens.push(i);
          }
        } else {
          // Token on board - check if move would overshoot
          const newSteps = token.steps + diceValue;
          if (newSteps <= BOARD_CELLS + HOME_STEPS) {
            validTokens.push(i);
          }
        }
      }

      return validTokens;
    },
    [gameState]
  );

  /**
   * Roll the dice for the current player.  If a forced number has
   * previously been set by the blue player we will use that number.
   * Otherwise a fair random value between 1 and 6 is produced.  After
   * rolling, the dice value is stored and the forced number is cleared.
   * If no valid moves exist, show dice value briefly then skip to next player.
   */
  const rollDice = useCallback(async () => {
    console.log("🎲 Roll dice clicked");
    if (!gameState) return;
    if (gameState.winner) return;
    if (gameState.currentTurn !== playerColor) return;
    if (gameState.diceValue !== null) return;
    const roomRef = doc(db, "games", roomId);
    let value;
    if (gameState.forceNumber && cheatUnlocked) {
      value = gameState.forceNumber;
      console.log(`🎯 Using cheat mode: ${value}`);
    } else {
      value = Math.floor(Math.random() * 6) + 1;
    }
    console.log(`🎲 Rolled: ${value}`);

    try {
      // First, always set the dice value so player can see what they rolled
      await updateDoc(roomRef, {
        diceValue: value,
        forceNumber: null,
      });
      console.log(`✅ Dice value ${value} saved to Firestore`);

      // Check if player has valid moves
      const validTokens = getValidTokens(value, playerColor);
      console.log(`🎯 Valid tokens for move:`, validTokens);

      if (validTokens.length === 0) {
        console.log("❌ No valid moves - will skip turn in 1.5s");
        // No valid moves - show dice for 1.5 seconds then skip to next player
        setTimeout(async () => {
          const activePlayers = gameState.activePlayers || [];
          const nextTurn = getNextPlayer(playerColor, activePlayers);
          console.log(`⏭️ Skipping to next player: ${nextTurn}`);
          try {
            await updateDoc(roomRef, {
              diceValue: null,
              currentTurn: nextTurn,
            });
          } catch (err) {
            console.error("Error skipping turn:", err);
          }
        }, 1500);
      } else if (validTokens.length === 1) {
        console.log(`🤖 Auto-moving token ${validTokens[0]} in 0.8s`);
        // Only one valid token - trigger auto-move after showing dice
        setTimeout(() => {
          setAutoMoveToken(validTokens[0]);
        }, 800);
      } else {
        console.log(`👆 Multiple valid moves - waiting for player to choose`);
      }
      // else: Multiple valid moves - let player choose (dice already set)
    } catch (err) {
      console.error("Error rolling dice:", err);
      alert("Failed to roll dice. Please check your connection.");
    }
  }, [gameState, playerColor, roomId, getValidTokens]);

  /**
   * Handle a token click.  If it is the player's turn and the dice has
   * been rolled, attempt to move the chosen token forward by the dice
   * value.  Implements all game rules: starting on a six, entering the
   * home path, capturing other tokens, extra turns on a six, and
   * detecting a win.
   *
   * @param {number} tokenIndex Index of the token within the player's
   *   token array.
   */
  const handleTokenClick = useCallback(
    async (tokenIndex) => {
      console.log(`🖱️ Token ${tokenIndex} clicked`);
      if (!gameState) return;
      if (gameState.winner) return;
      if (gameState.currentTurn !== playerColor) {
        console.log(
          `❌ Not your turn (current: ${gameState.currentTurn}, you: ${playerColor})`
        );
        return;
      }
      const dice = gameState.diceValue;
      if (dice === null) {
        console.log("❌ Must roll dice first");
        return; // must roll before moving
      }

      console.log(`🎲 Dice value: ${dice}, moving token ${tokenIndex}`);
      const roomRef = doc(db, "games", roomId);
      // Deep copy of players to mutate
      const players = JSON.parse(JSON.stringify(gameState.players));
      const player = players[playerColor];
      const token = player.tokens[tokenIndex];
      let steps = token.steps;
      let newSteps;

      // Determine whether the token can move
      if (steps < 0) {
        // Token is in the base; it can only move out on a 6.
        if (dice !== 6) {
          console.log("❌ Token in base - need a 6 to start");
          return;
        }
        newSteps = 0;
        console.log("✅ Token leaving base, moving to start position");
      } else {
        newSteps = steps + dice;
        // If the token would overshoot the finish, disallow the move.
        if (newSteps > BOARD_CELLS + HOME_STEPS) {
          console.log(
            `❌ Would overshoot finish (${newSteps} > ${
              BOARD_CELLS + HOME_STEPS
            })`
          );
          return;
        }
        console.log(`✅ Token moving from ${steps} to ${newSteps}`);
      }

      // Flag to record if a capture happened on this move
      let captured = false;
      let capturedColour = null;

      // If the token lands on the common board (before home), check for
      // captures.  The new board index is only defined when newSteps <= 51.
      let newBoardIndex = null;
      if (newSteps <= BOARD_CELLS - 1) {
        newBoardIndex = computeBoardIndex(playerColor, newSteps);
        // Iterate through other players and send any token occupying this
        // board position back to base.  Tokens on the home path are
        // immune.
        PLAYER_COLORS.forEach((otherColor) => {
          if (otherColor === playerColor) return;
          players[otherColor].tokens = players[otherColor].tokens.map((t) => {
            if (t.steps >= 0 && t.steps <= BOARD_CELLS - 1) {
              const otherIndex = computeBoardIndex(otherColor, t.steps);
              if (otherIndex === newBoardIndex) {
                captured = true;
                capturedColour = otherColor;
                return { ...t, steps: -1 };
              }
            }
            return t;
          });
        });
      }

      // Move the selected token
      player.tokens[tokenIndex].steps = newSteps;
      console.log(`✅ Token moved to position ${newSteps}`);

      // Check for win condition: all of the player's tokens have reached
      // the final home cell (steps === BOARD_CELLS + HOME_STEPS)
      const finished = player.tokens.every(
        (t) => t.steps === BOARD_CELLS + HOME_STEPS
      );

      if (finished) {
        console.log(`🏆 Player ${playerColor} has WON!`);
      }

      // Determine whose turn is next.  If the player rolled a six or
      // captured an opponent, they get another turn; otherwise we move
      // on to the next colour in order.
      let nextTurn = playerColor;
      if (!finished) {
        if (dice === 6 || captured) {
          nextTurn = playerColor;
          console.log(
            `🎲 Extra turn! (rolled 6=${dice === 6}, captured=${captured})`
          );
        } else {
          const activePlayers = gameState.activePlayers || [];
          nextTurn = getNextPlayer(playerColor, activePlayers);
          console.log(`⏭️ Next turn: ${nextTurn}`);
        }
      }

      // Persist the updated state.  Reset the dice value and clear the
      // forced number.  If the player has won, record the winner.
      try {
        await updateDoc(roomRef, {
          players,
          currentTurn: nextTurn,
          diceValue: null,
          forceNumber: null,
          winner: finished ? playerColor : null,
        });
        console.log("✅ Move saved to Firestore successfully");
      } catch (err) {
        console.error("Error moving token:", err);
        alert("Failed to move token. Please check your connection.");
      }
    },
    [gameState, playerColor, roomId]
  );

  /**
   * Cheat function. When cheat mode is unlocked, any player can select
   * a value between one and six. That value becomes the forced number
   * for the next dice roll. After a roll the forced number is cleared
   * automatically.
   *
   * @param {number} value The desired dice outcome (1‑6).
   */
  const handleCheat = useCallback(
    async (value) => {
      if (!gameState) return;
      if (!cheatUnlocked) return;
      if (gameState.currentTurn !== playerColor) return;
      // Only allow setting a cheat if the dice has not yet been rolled.
      if (gameState.diceValue !== null) return;
      const roomRef = doc(db, "games", roomId);
      try {
        await updateDoc(roomRef, {
          forceNumber: value,
        });
        console.log(`🎯 Cheat set to: ${value}`);
      } catch (err) {
        console.error("Error setting cheat:", err);
        alert("Failed to set cheat. Please check your connection.");
      }
    },
    [gameState, playerColor, roomId, cheatUnlocked]
  );

  // Function to skip turn manually
  const handleSkipTurn = useCallback(async () => {
    if (!gameState) return;
    if (gameState.currentTurn !== playerColor) return;
    if (gameState.diceValue === null) return;

    const roomRef = doc(db, "games", roomId);
    const activePlayers = gameState.activePlayers || [];
    const nextTurn = getNextPlayer(playerColor, activePlayers);

    try {
      await updateDoc(roomRef, {
        diceValue: null,
        forceNumber: null,
        currentTurn: nextTurn,
      });
    } catch (err) {
      console.error("Error skipping turn:", err);
      alert("Failed to skip turn. Please check your connection.");
    }
  }, [gameState, playerColor, roomId]);

  // Auto-move effect: when autoMoveToken is set, trigger handleTokenClick
  useEffect(() => {
    if (autoMoveToken !== null) {
      handleTokenClick(autoMoveToken);
      setAutoMoveToken(null); // Reset after triggering
    }
  }, [autoMoveToken, handleTokenClick]);

  // Handle center board click for cheat mode unlock
  const handleCenterClick = () => {
    if (!cheatUnlocked) {
      setShowCheatInput(true);
    }
  };

  // Handle cheat code submission
  const handleCheatCodeSubmit = () => {
    if (cheatCode.trim().toUpperCase() === "BJ") {
      setCheatUnlocked(true);
      setShowCheatInput(false);
      setCheatCode("");
    } else {
      alert("Incorrect code!");
      setCheatCode("");
    }
  };

  // While loading the game state show a simple message.
  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading game...</div>
        </div>
      </div>
    );
  }

  // Display error message if Firebase connection failed
  if (error) {
    const isPermissionError =
      error.includes("permission") || error.includes("PERMISSION_DENIED");
    const isNetworkError =
      error.includes("network") || error.includes("offline");

    return (
      <div className="app-container">
        <div
          style={{
            color: "red",
            padding: "20px",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <h2>🔥 Firebase Connection Error</h2>
          <div
            style={{
              backgroundColor: "#fff3cd",
              color: "#856404",
              padding: "15px",
              borderRadius: "5px",
              marginBottom: "15px",
              border: "1px solid #ffc107",
            }}
          >
            <strong>Error:</strong> {error}
          </div>

          {isPermissionError && (
            <div
              style={{
                backgroundColor: "#f8d7da",
                color: "#721c24",
                padding: "15px",
                borderRadius: "5px",
                marginBottom: "15px",
              }}
            >
              <h3>⚠️ Permission Denied - Database Rules Issue</h3>
              <p>
                Your Firestore rules are blocking access. Follow these steps:
              </p>
              <ol style={{ textAlign: "left", marginLeft: "20px" }}>
                <li>
                  Go to{" "}
                  <a
                    href="https://console.firebase.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Firebase Console
                  </a>
                </li>
                <li>
                  Select project: <strong>advance-mobility-fe25a</strong>
                </li>
                <li>
                  Click <strong>"Firestore Database"</strong> →{" "}
                  <strong>"Rules"</strong> tab
                </li>
                <li>
                  Make sure rules include:{" "}
                  <code>allow read, write: if true;</code>
                </li>
                <li>
                  Click <strong>"Publish"</strong> button
                </li>
                <li>Wait 1-2 minutes and refresh this page</li>
              </ol>
            </div>
          )}

          {isNetworkError && (
            <div
              style={{
                backgroundColor: "#d1ecf1",
                color: "#0c5460",
                padding: "15px",
                borderRadius: "5px",
                marginBottom: "15px",
              }}
            >
              <h3>🌐 Network Error</h3>
              <p>Cannot connect to Firebase. Please check:</p>
              <ul style={{ textAlign: "left", marginLeft: "20px" }}>
                <li>Your internet connection is working</li>
                <li>Firewall isn't blocking Firebase</li>
                <li>
                  Firebase services:{" "}
                  <a
                    href="https://status.firebase.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    status.firebase.google.com
                  </a>
                </li>
              </ul>
            </div>
          )}

          <details style={{ textAlign: "left", marginTop: "15px" }}>
            <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
              📋 Detailed Troubleshooting Steps
            </summary>
            <ul style={{ marginLeft: "20px", marginTop: "10px" }}>
              <li>Check your internet connection</li>
              <li>
                Verify Firebase config in <code>src/firebase.js</code>
              </li>
              <li>Ensure Firestore database is created (not just rules)</li>
              <li>Publish Firestore rules and wait 1-2 minutes</li>
              <li>Try opening in incognito/private mode</li>
              <li>Clear browser cache (Ctrl+Shift+R)</li>
              <li>Check browser console (F12) for more details</li>
            </ul>
            <p style={{ marginTop: "10px" }}>
              See <strong>TROUBLESHOOTING.md</strong> for complete guide
            </p>
          </details>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading game state...</div>
        </div>
      </div>
    );
  }

  // Function to restart the game
  const handleRestart = async () => {
    const roomRef = doc(db, "games", roomId);
    try {
      // Preserve the numPlayers setting when restarting
      const currentNumPlayers = gameState.numPlayers || numPlayers || 4;
      await setDoc(roomRef, createInitialGameState(currentNumPlayers));
    } catch (err) {
      console.error("Error restarting game:", err);
      alert("Failed to restart game. Please check your connection.");
    }
  };

  // Function to copy room link
  const copyRoomLink = () => {
    const link = `${window.location.origin}/?player=${playerColor}&room=${roomId}`;
    navigator.clipboard.writeText(link).then(
      () => alert("Room link copied! Share it with friends to play together."),
      () => alert("Failed to copy link. Please copy the URL manually.")
    );
  };

  // Count tokens at home for each player
  const getTokensAtHome = (color) => {
    return gameState.players[color].tokens.filter(
      (t) => t.steps === BOARD_CELLS + HOME_STEPS
    ).length;
  };

  // Function to go back to lobby
  const handleBackToLobby = () => {
    window.location.href = "/";
  };

  // Check if current player has valid moves with current dice value
  const canMakeMove =
    gameState &&
    gameState.diceValue !== null &&
    gameState.currentTurn === playerColor &&
    hasValidMoves(gameState.diceValue, playerColor);

  return (
    <div className="app-container">
      <div className="game-layout">
        {/* Navbar - Top section with header and room info */}
        <div className="navbar">
          <div className="game-header">
            <h1>🎲 LODU MULTIPLAYER 🎲</h1>
            <div className="subtitle">Play with friends in real-time!</div>
            <button
              className="back-to-lobby-btn"
              onClick={handleBackToLobby}
              style={{
                position: "absolute",
                top: "20px",
                left: "20px",
                padding: "0.7rem 1.2rem",
                background: "rgba(255, 255, 255, 0.95)",
                color: "#667eea",
                border: "none",
                borderRadius: "25px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) =>
                (e.target.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
            >
              ← Back to Lobby
            </button>
          </div>

          <div className="room-info">
            <div style={{ marginBottom: "0.5rem" }}>
              Room: <span className="room-id">{roomId}</span>
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              You are:{" "}
              <span
                style={{
                  fontWeight: 700,
                  color: playerColor,
                  textTransform: "capitalize",
                }}
              >
                {playerColor}
              </span>
            </div>
            <button className="copy-link-btn" onClick={copyRoomLink}>
              📋 Copy Room Link
            </button>
          </div>
        </div>

        {/* Board Area - Center with board and player stats side by side */}
        <div className="board-area">
          {/* Board Container - Turn indicator and board */}
          <div className="board-container">
            <div className="turn-indicator">
              {gameState.currentTurn ? (
                <>
                  <span
                    className="player-dot"
                    style={{ backgroundColor: gameState.currentTurn }}
                  ></span>
                  <span>
                    {gameState.currentTurn.charAt(0).toUpperCase() +
                      gameState.currentTurn.slice(1)}
                    's Turn
                  </span>
                </>
              ) : (
                <span>Waiting for players to join...</span>
              )}
            </div>

            <div className="board-wrapper">
              <Board
                players={gameState.players}
                currentTurn={gameState.currentTurn}
                onTokenClick={handleTokenClick}
                onCenterClick={handleCenterClick}
                diceValue={gameState.diceValue}
                validTokens={
                  gameState.diceValue && gameState.currentTurn === playerColor
                    ? getValidTokens(gameState.diceValue, playerColor)
                    : []
                }
              />
            </div>
          </div>

          {/* Right Panel - Dice and Player Stats */}
          <div className="right-panel">
            <Dice
              value={gameState.diceValue}
              canRoll={
                gameState.currentTurn === playerColor &&
                gameState.diceValue === null &&
                !gameState.winner
              }
              onRoll={rollDice}
              isBluePlayer={
                cheatUnlocked &&
                gameState.currentTurn === playerColor &&
                !gameState.winner
              }
              onCheat={handleCheat}
              forceNumber={gameState.forceNumber}
              onSkipTurn={handleSkipTurn}
              showSkip={
                gameState.currentTurn === playerColor &&
                gameState.diceValue !== null &&
                !canMakeMove &&
                !gameState.winner
              }
            />

            <div className="players-list">
              {PLAYER_COLORS.slice(0, gameState.numPlayers || 4).map((color) => {
                const isJoined = gameState.activePlayers.includes(color);
                return (
                  <div
                    key={color}
                    className={`player-card ${
                      gameState.currentTurn === color ? "active" : ""
                    }`}
                    style={{
                      borderColor:
                        gameState.currentTurn === color ? color : "transparent",
                      opacity: isJoined ? 1 : 0.5,
                    }}
                  >
                    <div
                      className="player-color"
                      style={{ backgroundColor: color }}
                    ></div>
                    <div className="player-info">
                      <div className="player-name">
                        {color} Player {!isJoined && "(Waiting)"}
                      </div>
                      <div className="player-status">
                        {isJoined
                          ? `${getTokensAtHome(color)}/4 tokens finished`
                          : "Not joined yet"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {gameState.winner && (
        <div className="winner-banner">
          <div className="winner-content">
            <h2>🎉 VICTORY! 🎉</h2>
            <div className="emoji">🏆</div>
            <div className="player-name" style={{ color: gameState.winner }}>
              {gameState.winner} Wins!
            </div>
            <button className="restart-button" onClick={handleRestart}>
              🔄 Play Again
            </button>
          </div>
        </div>
      )}

      {showCheatInput && (
        <div
          className="cheat-modal-overlay"
          onClick={() => setShowCheatInput(false)}
        >
          <div className="cheat-modal" onClick={(e) => e.stopPropagation()}>
            <h3>🔐 Test</h3>
            <p>Enter test :</p>
            <input
              type="text"
              value={cheatCode}
              onChange={(e) => setCheatCode(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCheatCodeSubmit()}
              placeholder="Enter text..."
              className="cheat-input"
              autoFocus
            />
            <div className="cheat-modal-buttons">
              <button
                className="cheat-submit-btn"
                onClick={handleCheatCodeSubmit}
              >
                DONE
              </button>
              <button
                className="cheat-cancel-btn"
                onClick={() => setShowCheatInput(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
