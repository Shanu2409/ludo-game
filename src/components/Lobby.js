import React, { useState } from "react";
import LiveRooms from "./LiveRooms";
import "../styles.css";

/**
 * Lobby component for creating and joining game rooms
 */
export default function Lobby({ onJoinGame }) {
  const [roomId, setRoomId] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [numPlayers, setNumPlayers] = useState(4);

  const generateRoomId = () => {
    return "room-" + Math.random().toString(36).substring(2, 9);
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    onJoinGame(newRoomId, numPlayers);
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      onJoinGame(roomId.trim(), numPlayers);
    } else {
      alert("Please enter a room ID");
    }
  };

  const handleQuickPlay = () => {
    onJoinGame("quick-play", numPlayers);
  };

  const handleJoinLiveRoom = (roomId) => {
    onJoinGame(roomId, numPlayers);
  };

  return (
    <div className="app-container">
      <div className="lobby-container">
        <div className="lobby-header">
          <h1>🎲 LODU MULTIPLAYER 🎲</h1>
          <p className="lobby-subtitle">Play with friends in real-time!</p>
        </div>

        <div className="lobby-main-content">
          {/* Left Panel - Game Setup */}
          <div className="lobby-content">
            {/* Number of Players Selection */}
            <div className="player-count-selection">
              <h3>Number of Players</h3>
              <div className="player-count-buttons">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    className={`player-count-btn ${
                      numPlayers === count ? "selected" : ""
                    }`}
                    onClick={() => setNumPlayers(count)}
                  >
                    {count} Players
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Color Assignment Info */}
            <div className="color-selection">
              <h3>🎨 Color Assignment</h3>
              <p style={{ fontSize: "0.9rem", color: "#666", margin: "0.5rem 0" }}>
                Your color will be automatically assigned when you join a room
              </p>
            </div>

            {/* Game Options */}
            <div className="game-options">
              <button className="lobby-btn primary" onClick={handleCreateRoom}>
                🎮 Create New Room
              </button>

              <button className="lobby-btn secondary" onClick={handleQuickPlay}>
                ⚡ Quick Play
              </button>

              <button
                className="lobby-btn tertiary"
                onClick={() => setShowJoin(!showJoin)}
              >
                🔗 Join Existing Room
              </button>

              {showJoin && (
                <div className="join-room-section">
                  <input
                    type="text"
                    placeholder="Enter Room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="room-input"
                    onKeyPress={(e) => e.key === "Enter" && handleJoinRoom()}
                  />
                  <button
                    className="lobby-btn primary"
                    onClick={handleJoinRoom}
                  >
                    Join Room
                  </button>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="instructions">
              <h4>How to Play</h4>
              <ul>
                <li>🎯 Roll the dice and move your tokens around the board</li>
                <li>🏠 Get all 4 tokens to the center to win</li>
                <li>⚔️ Capture opponent tokens by landing on them</li>
                <li>🎲 Roll a 6 to get an extra turn or start a new token</li>
                <li>👥 Share your room link with friends to play together!</li>
              </ul>
            </div>
          </div>

          {/* Right Panel - Live Rooms */}
          <LiveRooms onJoinRoom={handleJoinLiveRoom} />
        </div>
      </div>
    </div>
  );
}
