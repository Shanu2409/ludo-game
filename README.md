# Ludo Multiplayer Game

This project implements a fully‑functional multiplayer **Ludo** board game using **React** and **Firebase** for real‑time synchronisation between different devices. The game rules, animations and state management are all handled on the client and persisted via Firebase Firestore so that any move on one device is instantly reflected on all other connected clients.

## Features

- **Multiplayer:** Join the same room from multiple devices and play against each other. The underlying game state is stored in Firestore and updated in real time.
- **Turn based logic:** The full Ludo game logic is implemented in JavaScript. Players must roll a six to move a token onto the board, complete a full lap and then enter the home path to finish. Rolling a six grants an additional turn. Landing on another player’s token will send that piece back to the base.
- **Animations:** Movements of the dice and tokens are animated using Framer Motion for a smooth and polished experience.
- **Blue cheat button:** A small button is displayed only for the _blue_ player that allows them to select any number from one to six. The chosen number is used for the next dice roll, effectively altering the odds in their favour.
- **Responsive board:** The board is drawn using SVG and CSS, and the token positions are calculated mathematically. This makes it easy to adjust sizes without breaking the layout.

## Running the game

1. Install dependencies with `npm install`.
2. Create a Firebase project and enable Firestore. Copy your configuration into `src/firebase.js` where indicated.
3. **Configure Firestore Database Rules** (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions):
   - Go to Firebase Console > Firestore Database > Rules
   - For testing, use open rules (see FIREBASE_SETUP.md)
   - Click "Publish" to apply the rules
4. Start the development server with `npm start` and open `http://localhost:3000/?player=red` in your browser. Change the `player` query parameter to `blue`, `green` or `yellow` on other devices to join as a different colour.

## Troubleshooting Firebase Issues

### Quick Test Tool 🔧

**If you're having Firebase issues, use the built-in test tool:**

1. Open: `http://localhost:3000/?test=true`
2. Click "Run Firebase Test"
3. Follow the instructions provided by the test results

This will diagnose exactly what's wrong with your Firebase setup!

### Common Issues

If Firebase isn't working, check the following:

1. **Firestore Rules**: The most common issue is that Firestore rules are blocking access. See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for the correct rules configuration.

2. **Database Not Created**: Make sure you've created the Firestore database (not just set rules). See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) Step 1.

3. **Rules Not Published**: After setting rules, you MUST click the "Publish" button and wait 1-2 minutes.

4. **Internet Connection**: Ensure you have an active internet connection.

5. **Firebase Configuration**: Verify that the configuration in `src/firebase.js` matches your Firebase project settings.

6. **Browser Console**: Open the browser console (F12) to see detailed error messages. The app now includes error handling that will display helpful messages.

For complete troubleshooting steps, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## Folder structure

```
ludo-game/
├── package.json
├── README.md
└── src
    ├── index.js
    ├── App.js
    ├── firebase.js
    ├── styles.css
    └── components
        ├── LudoGame.js
        ├── Board.js
        ├── Dice.js
        └── Token.js
```

## Notes

- This project relies on `react-scripts` and other dependencies that must be installed via npm. Because the environment in which this code was generated does not allow network access, the dependencies are listed but not installed here. To run the game locally you will need to run `npm install` yourself.
- Firebase configuration values (apiKey, authDomain, projectId, etc.) are intentionally left as placeholders. Replace them with your own project’s values before running the application.
