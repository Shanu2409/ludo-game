import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

/**
 * LiveRooms component displays active game rooms in real-time
 */
export default function LiveRooms({ onJoinRoom }) {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      // Query the games collection for recent rooms
      const gamesRef = collection(db, "games");
      const q = query(gamesRef, orderBy("__name__"), limit(20));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const roomsList = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            // Only show rooms that are not finished and have recent activity
            if (!data.winner) {
              roomsList.push({
                id: doc.id,
                ...data,
              });
            }
          });
          setRooms(roomsList);
          setIsLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Error fetching rooms:", err);
          setError(err.message);
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up rooms listener:", err);
      setError(err.message);
      setIsLoading(false);
    }
  }, []);

  // Count active players in a room
  const getActivePlayersCount = (room) => {
    if (!room.players) return 0;
    return Object.values(room.players).filter((player) =>
      player.tokens.some((token) => token.steps >= 0)
    ).length;
  };

  // Get current turn color name
  const getCurrentTurnName = (room) => {
    if (!room.currentTurn) return "Unknown";
    return room.currentTurn.charAt(0).toUpperCase() + room.currentTurn.slice(1);
  };

  // Handle room deletion
  const handleDeleteRoom = async (roomId, e) => {
    e.stopPropagation(); // Prevent triggering join room
    if (window.confirm(`Are you sure you want to delete room "${roomId}"?`)) {
      try {
        await deleteDoc(doc(db, "games", roomId));
      } catch (err) {
        console.error("Error deleting room:", err);
        alert("Failed to delete room. Please try again.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="live-rooms-container">
        <h3>🌐 Live Rooms</h3>
        <div className="loading-text">Loading rooms...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-rooms-container">
        <h3>🌐 Live Rooms</h3>
        <div className="error-text">Unable to load rooms</div>
      </div>
    );
  }

  return (
    <div className="live-rooms-container">
      <h3>🌐 Live Rooms ({rooms.length})</h3>

      {rooms.length === 0 ? (
        <div className="no-rooms">
          <p>No active rooms right now</p>
          <p className="hint">Create a new room to get started!</p>
        </div>
      ) : (
        <div className="rooms-list">
          <AnimatePresence>
            {rooms.slice(0, 10).map((room) => (
              <motion.div
                key={room.id}
                className="room-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                // whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="room-header">
                  <div className="room-id">
                    🎮{" "}
                    {room.id.length > 15
                      ? room.id.substring(0, 15) + "..."
                      : room.id}
                  </div>
                  <div className="room-header-actions">
                    <div className="room-status">
                      <span className="status-dot"></span>
                      Live
                    </div>
                    <button
                      className="delete-room-btn"
                      onClick={(e) => handleDeleteRoom(room.id, e)}
                      title="Delete room"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="room-details">
                  <div className="room-info">
                    <span className="info-label">Turn:</span>
                    <span
                      className="info-value"
                      style={{ color: room.currentTurn || "#666" }}
                    >
                      {getCurrentTurnName(room)}
                    </span>
                  </div>

                  <div className="room-info">
                    <span className="info-label">Players:</span>
                    <span className="info-value">
                      {room.activePlayers ? room.activePlayers.length : 4}
                    </span>
                  </div>
                </div>

                <button
                  className="join-room-btn"
                  onClick={() => onJoinRoom(room.id)}
                >
                  Join Room
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
