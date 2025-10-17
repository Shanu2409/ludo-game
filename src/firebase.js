import { initializeApp, getApps } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// TODO: Replace the following configuration with your own Firebase project
// details.  You can find these values in the Firebase console under
// Project Settings > General > Your apps.  Without a valid configuration
// the game will not be able to connect to Firestore.
// Firebase configuration supplied by the user.  These values
// correspond to a specific Firebase project and must be kept
// confidential.  Without valid credentials the game will be unable
// to connect to Firestore.
const firebaseConfig = {
  apiKey: "AIzaSyBl-CM-4rhET5lTw-ISdl7gQN7_zKgfUOk",
  authDomain: "advance-mobility-fe25a.firebaseapp.com",
  databaseURL: "https://advance-mobility-fe25a-default-rtdb.firebaseio.com",
  projectId: "advance-mobility-fe25a",
  storageBucket: "advance-mobility-fe25a.appspot.com",
  messagingSenderId: "455987767127",
  appId: "1:455987767127:web:ccc6e77b5314f61bc44012",
  measurementId: "G-MD1SKXQJLJ",
};

// Initialize Firebase and export a Firestore instance.  If the app has
// already been initialized elsewhere in the bundle this call is idempotent.
let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}

const db = getFirestore(firebaseApp);

// Uncomment the following lines if you want to use the Firestore emulator for local development
// if (window.location.hostname === 'localhost') {
//   connectFirestoreEmulator(db, 'localhost', 8080);
// }

export { db, firebaseApp };
