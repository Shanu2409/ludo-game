import React, { useState, useEffect } from "react";
import { useMemo } from "react";
import LudoGame from "./components/LudoGame";
import FirebaseTest from "./components/FirebaseTest";
import Lobby from "./components/Lobby";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * Parse a query string into an object.
 * Returns an empty object if there is no query string.
 * @param {string} search The search part of the location (e.g. ?player=red&room=test)
 */
function parseQuery(search) {
  const params = {};
  if (!search || search.length < 2) return params;
  search
    .substring(1)
    .split("&")
    .forEach((pair) => {
      const [key, value] = pair.split("=");
      params[decodeURIComponent(key)] = decodeURIComponent(value || "");
    });
  return params;
}

export default function App() {
  const [inLobby, setInLobby] = useState(true);
  const [gameSettings, setGameSettings] = useState(null);

  // Derive the player colour and room ID from the URL query string.
  // This makes it easy to join as different colours on multiple devices
  // simply by changing the query parameters.
  const { player, room, test, numPlayers } = useMemo(
    () => parseQuery(window.location.search),
    []
  );

  useEffect(() => {
    // If URL has player and room params, skip lobby
    if (player && room) {
      const playerColour =
        player &&
        ["red", "blue", "green", "yellow"].includes(player.toLowerCase())
          ? player.toLowerCase()
          : "red";
      const roomId = room || "default-room";
      const playerCount = numPlayers ? parseInt(numPlayers) : 4;
      setGameSettings({
        playerColor: playerColour,
        roomId,
        numPlayers: playerCount,
      });
      setInLobby(false);
    }
  }, [player, room, numPlayers]);

  // If test mode is enabled, show the Firebase test component
  if (test === "true" || test === "1") {
    return (
      <div>
        <FirebaseTest />
        <div
          style={{ textAlign: "center", marginTop: "20px", padding: "20px" }}
        >
          <p>
            To go back to the game, remove <code>?test=true</code> from the URL
          </p>
          <p>
            Or <a href="/">click here to start playing</a>
          </p>
        </div>
      </div>
    );
  }

  const handleJoinGame = async (roomId, numPlayers = 4) => {
    try {
      // Check if room exists and get available colors
      const roomRef = doc(db, "games", roomId);
      const roomSnap = await getDoc(roomRef);
      
      let assignedColor = null;
      const availableColors = ["red", "blue", "green", "yellow"];
      
      if (roomSnap.exists()) {
        // Room exists - find an available color
        const roomData = roomSnap.data();
        const activePlayers = roomData.activePlayers || [];
        
        // Find the first color that's not already taken
        assignedColor = availableColors.find(color => !activePlayers.includes(color));
        
        if (!assignedColor) {
          // All colors are taken
          alert("This room is full! All player slots are occupied. Please try another room or create a new one.");
          return;
        }
      } else {
        // New room - assign the first color (red)
        assignedColor = availableColors[0];
      }
      
      // Update URL without reloading
      const newUrl = `${window.location.pathname}?player=${assignedColor}&room=${roomId}&numPlayers=${numPlayers}`;
      window.history.pushState({}, "", newUrl);

      setGameSettings({ playerColor: assignedColor, roomId, numPlayers });
      setInLobby(false);
    } catch (err) {
      console.error("Error joining game:", err);
      alert("Failed to join the game. Please check your connection and try again.");
    }
  };

  if (inLobby) {
    return <Lobby onJoinGame={handleJoinGame} />;
  }

  return (
    <LudoGame
      playerColor={gameSettings.playerColor}
      roomId={gameSettings.roomId}
      numPlayers={gameSettings.numPlayers}
    />
  );
}
