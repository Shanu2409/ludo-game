# Manual Testing Guide for Player Management Changes

## Setup
1. Start the development server: `npm start`
2. Open multiple browser windows/tabs or use different devices
3. Make sure Firebase is properly configured in `src/firebase.js`

## Test Case 1: Two-Player Game - Both Players Present

**Steps:**
1. Open browser window 1
2. Click "2 Players" button
3. Click "Create New Room"
4. Note the Room ID in the URL (e.g., `room-abc123`)
5. Open browser window 2
6. Click "Join Existing Room"
7. Enter the Room ID from step 4
8. Click "Join Room"

**Expected Results:**
- Window 1: Shows as Red player
- Window 2: Shows as Blue player
- Player list shows only 2 slots: Red and Blue
- Green and Yellow are not displayed
- Turns cycle only between Red and Blue
- No skipped turns for non-existent players

## Test Case 2: Two-Player Game - Only One Player

**Steps:**
1. Open browser window 1
2. Click "2 Players" button
3. Click "Create New Room"
4. Try to roll dice and play

**Expected Results:**
- Player list shows Red (joined) and Blue (Waiting)
- Blue slot has reduced opacity
- Blue shows "Not joined yet" status
- Turn indicator shows "Red's Turn"
- After rolling dice and moving, turn stays with Red
- Game is playable with just one player

## Test Case 3: Three-Player Game

**Steps:**
1. Create a room with "3 Players" selected
2. Join from 3 different browser windows/tabs
3. Verify each gets assigned Red, Blue, and Green

**Expected Results:**
- Player list shows only 3 slots
- Yellow is not displayed
- Turns cycle through Red → Blue → Green → Red
- All 3 players can play normally

## Test Case 4: Room Capacity Enforcement

**Steps:**
1. Create a room with "2 Players" selected
2. Join with Player 1 (Red)
3. Join with Player 2 (Blue)
4. Try to join with a 3rd browser window/tab

**Expected Results:**
- 3rd player sees "This room is full! All player slots are occupied."
- 3rd player is redirected back to lobby
- Only Red and Blue can play in the room

## Test Case 5: Four-Player Game (Default Behavior)

**Steps:**
1. Create a room with "4 Players" selected
2. Join with 2 players initially
3. Start playing
4. Add 3rd and 4th players mid-game

**Expected Results:**
- Game works with 2 players at first
- Turns cycle only between joined players
- As new players join, they are added to turn rotation
- Eventually all 4 colors are in rotation

## Test Case 6: Live Rooms Display

**Steps:**
1. Create several rooms with different player counts
2. Join some partially (e.g., 1/2, 2/3, 3/4)
3. Fill some rooms completely
4. Check the Live Rooms panel

**Expected Results:**
- Shows "X/Y" where Y matches the room's player selection
- Example: "1/2" for 2-player room with 1 joined
- Example: "2/3" for 3-player room with 2 joined
- Full rooms show "2/2 (Full)" or "3/3 (Full)"
- Can't join full rooms (Join button disabled)

## Test Case 7: URL-Based Joining

**Steps:**
1. Create a room with 2 players
2. Copy the room link (using "Copy Room Link" button)
3. Open the link in a new browser window
4. After room is full, try to open the link again

**Expected Results:**
- First and second players successfully join
- Third attempt shows "Room is full" alert
- Player is sent back to lobby

## Test Case 8: Game Restart

**Steps:**
1. Create a 3-player game
2. Join with all 3 players
3. Play until someone wins
4. Click "Play Again" button

**Expected Results:**
- Game resets
- numPlayers setting is preserved (still 3 players)
- Player list still shows only 3 slots
- All 3 players remain in activePlayers
- Turns reset to first player

## Test Case 9: Mid-Game Player Join

**Steps:**
1. Create a 4-player game
2. Join with 2 players
3. Play several turns
4. Add a 3rd player mid-game

**Expected Results:**
- 3rd player sees current game state
- 3rd player is added to turn rotation
- Next time it would be their turn, they can play
- Game continues smoothly

## Verification Checklist

For each test case, verify:
- [ ] No JavaScript console errors
- [ ] Turn indicator shows correct player's turn
- [ ] Dice can only be rolled by current turn player
- [ ] Tokens can only be moved by current turn player
- [ ] Turn advances correctly to next active player
- [ ] No turns are wasted on non-joined players
- [ ] Player list shows correct number of slots
- [ ] Inactive players show "(Waiting)" status
- [ ] Room capacity is enforced correctly

## Common Issues to Watch For

1. **Turn Stuck:** If turns don't advance, check:
   - activePlayers array is populated
   - currentTurn is not null
   - getNextPlayer is using activePlayers correctly

2. **Wrong Player Count:** If seeing 4 players when 2 selected:
   - Check numPlayers is passed correctly
   - Verify createInitialGameState receives numPlayers
   - Check player list slicing logic

3. **Can Join Full Room:** If able to join full room:
   - Check isRoomFull logic in LiveRooms.js
   - Verify room capacity check in App.js
   - Check activePlayers.length vs numPlayers

## Debug Information

To see detailed logs:
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for log messages with emojis:
   - 🎲 Dice rolls
   - ✅ Successful operations
   - ❌ Errors or invalid moves
   - ⏭️ Turn changes
   - 🏆 Win condition

## Performance Check

Monitor Firestore operations:
1. Open Firebase Console
2. Go to Firestore Database
3. Check read/write counts
4. Verify no unnecessary updates

Expected operations per turn:
- 1 write for dice roll
- 1 write for token move
- Real-time listener updates on all clients

## Cleanup

After testing:
1. Delete test rooms from Firebase Console
2. Or use the 🗑️ button in Live Rooms panel
3. Clear browser cache if needed
