# Player Management Changes

## Overview
This document describes the changes made to fix the player selection and turn management system in the Ludo multiplayer game.

## Problem Statement
Previously, when creating a room with 2 or 3 players selected, the game would still cycle through all 4 colors (red, blue, green, yellow), even if some players hadn't joined. This caused turns to be skipped for non-existent players.

## Solution
The game now properly tracks only the players who have actually joined the room and cycles turns only among active players.

## Key Changes

### 1. Dynamic Player Tracking (`src/components/LudoGame.js`)

**Before:**
- `createInitialGameState()` created an `activePlayers` array based on `numPlayers` parameter
- All intended player slots were marked as active immediately
- Game would cycle through all intended players, even if they hadn't joined

**After:**
- `activePlayers` array starts empty
- Players are added to `activePlayers` only when they actually join the room
- `currentTurn` is set to `null` initially and gets set when the first player joins
- Turn cycling only happens among players who have joined

### 2. Turn Management

**Updated Functions:**
- `getNextPlayer()`: Now returns the current player if no other players exist (instead of falling back to all 4 colors)
- `rollDice()`: Uses only `activePlayers` for turn cycling
- `handleTokenClick()`: Uses only `activePlayers` for turn cycling
- `handleSkipTurn()`: Uses only `activePlayers` for turn cycling

### 3. Room Capacity Management (`src/App.js`)

**Updates:**
- Room capacity checks now respect the `numPlayers` setting stored in each room
- When joining via URL parameters, the system checks if the room is full based on `numPlayers`
- Color assignment is limited to the first N colors based on `numPlayers` (e.g., for 2 players, only red and blue are available)

### 4. UI Updates

**Player List Display (`src/components/LudoGame.js`):**
- Shows only the number of player slots that were selected when creating the room
- Displays "Waiting" status for players who haven't joined yet
- Uses reduced opacity (0.5) for inactive players
- Shows "Not joined yet" instead of token count for inactive players

**Live Rooms Display (`src/components/LiveRooms.js`):**
- Shows "X/Y players" where Y is the actual `numPlayers` setting (not hardcoded 4)
- Room full check uses the room's `numPlayers` setting
- Prevents joining rooms that have reached their player limit

## Testing Scenarios

### Scenario 1: 2-Player Game
1. Create a new room with "2 Players" selected
2. Player 1 (red) joins → should be their turn
3. Player 1 rolls dice and moves → turn should pass to Player 1 (stays with them until another player joins)
4. Player 2 (blue) joins → turn should now cycle between red and blue only
5. Verify green and yellow are not shown in the player list

### Scenario 2: 3-Player Game with Partial Join
1. Create a new room with "3 Players" selected
2. Player 1 (red) joins
3. Player 2 (blue) joins
4. Start playing with just 2 players → turns should cycle only between red and blue
5. Player 3 (green) joins mid-game → turns should now include green in the rotation
6. Verify yellow is not shown in the player list

### Scenario 3: 4-Player Game (Existing Behavior)
1. Create a new room with "4 Players" selected
2. Players join one by one
3. Turns cycle only among joined players until all 4 are present
4. Once all 4 players are joined, turns cycle through all colors

### Scenario 4: Room Capacity Enforcement
1. Create a 2-player room
2. Player 1 and Player 2 join
3. Player 3 tries to join → should see "Room is full" message
4. Verify in Live Rooms list that the room shows "2/2 (Full)"

## Technical Details

### State Structure
```javascript
{
  players: {
    red: { tokens: [...], isActive: true/false },
    blue: { tokens: [...], isActive: true/false },
    green: { tokens: [...], isActive: true/false },
    yellow: { tokens: [...], isActive: true/false }
  },
  currentTurn: "red" | "blue" | "green" | "yellow" | null,
  diceValue: null | 1-6,
  forceNumber: null | 1-6,
  winner: null | "red" | "blue" | "green" | "yellow",
  activePlayers: [], // Array of colors that have joined
  numPlayers: 2 | 3 | 4 // Intended number of players
}
```

### Player Join Flow
1. Player navigates to game with room ID and color
2. `LudoGame` component mounts
3. `useEffect` checks if room exists in Firestore
4. If room doesn't exist, creates it with `createInitialGameState(numPlayers)`
5. If room exists, adds player color to `activePlayers` array
6. If this is the first player, sets `currentTurn` to their color
7. Updates `players[color].isActive = true`

### Turn Cycling Logic
1. When a player finishes their turn (without rolling 6 or capturing)
2. `getNextPlayer(currentColor, activePlayers)` is called
3. Finds current player's index in `activePlayers` array
4. Returns the next player in the array (wrapping around)
5. Only players in `activePlayers` are considered

## Backward Compatibility

### Existing Rooms
Existing rooms created before this change may have:
- `activePlayers` array with pre-populated colors
- No `numPlayers` field

**Handling:**
- Default `numPlayers` to 4 if not present
- Use existing `activePlayers` array if populated
- Turn cycling will work with whatever is in `activePlayers`

### Migration
No data migration is required. Old rooms will continue to work, and new rooms will use the improved logic.

## Edge Cases Handled

1. **Single Player:** If only one player joins, turns stay with that player until another joins
2. **Empty activePlayers:** Display shows "Waiting for players to join..."
3. **Room Restart:** Preserves the `numPlayers` setting from before restart
4. **URL-based Joining:** Respects the room's existing `numPlayers` setting
5. **Color Conflicts:** Auto-assigns available colors when requested color is taken

## Files Modified
- `src/components/LudoGame.js` - Core game logic and state management
- `src/App.js` - Room joining and color assignment logic
- `src/components/LiveRooms.js` - Room list display and capacity checks

## Benefits
1. ✅ Turns only cycle among players who have joined
2. ✅ Rooms can be configured for 2, 3, or 4 players
3. ✅ Game is playable even before all intended players join
4. ✅ Clear UI indication of which players are active vs waiting
5. ✅ Proper enforcement of room capacity limits
6. ✅ Backward compatible with existing rooms
