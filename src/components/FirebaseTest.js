import React, { useState } from "react";
import { db } from "../firebase";
import { collection, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

export default function FirebaseTest() {
  const [status, setStatus] = useState("");
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    setTesting(true);
    setStatus("🔄 Testing Firebase connection...\n\n");

    try {
      // Test 1: Check if db object exists
      setStatus((prev) => prev + "✓ Step 1: Firebase initialized\n");

      // Test 2: Try to write a document
      const testRef = doc(db, "test-connection", "test-doc");
      setStatus(
        (prev) => prev + "🔄 Step 2: Attempting to write to Firestore...\n"
      );

      await setDoc(testRef, {
        timestamp: new Date().toISOString(),
        test: "Hello Firebase!",
      });

      setStatus((prev) => prev + "✓ Step 2: Successfully wrote to Firestore\n");

      // Test 3: Try to read the document
      setStatus(
        (prev) => prev + "🔄 Step 3: Attempting to read from Firestore...\n"
      );
      const snap = await getDoc(testRef);

      if (snap.exists()) {
        setStatus(
          (prev) => prev + `✓ Step 3: Successfully read from Firestore\n`
        );
        setStatus((prev) => prev + `   Data: ${JSON.stringify(snap.data())}\n`);
      } else {
        setStatus((prev) => prev + "⚠️ Step 3: Document not found\n");
      }

      // Test 4: Clean up
      setStatus((prev) => prev + "🔄 Step 4: Cleaning up test data...\n");
      await deleteDoc(testRef);
      setStatus((prev) => prev + "✓ Step 4: Test data cleaned up\n\n");

      setStatus((prev) => prev + "✅ ALL TESTS PASSED!\n");
      setStatus(
        (prev) =>
          prev +
          "Firebase is working correctly. Your Ludo game should work now.\n"
      );
      setStatus(
        (prev) =>
          prev + "If the game still doesn't work, try refreshing the page.\n"
      );
    } catch (error) {
      setStatus((prev) => prev + `\n❌ ERROR: ${error.message}\n\n`);

      if (error.code === "permission-denied") {
        setStatus((prev) => prev + "🔴 PERMISSION DENIED ERROR\n\n");
        setStatus(
          (prev) =>
            prev + "This means your Firestore rules are blocking access.\n\n"
        );
        setStatus((prev) => prev + "TO FIX:\n");
        setStatus(
          (prev) =>
            prev +
            "1. Go to Firebase Console: https://console.firebase.google.com/\n"
        );
        setStatus(
          (prev) => prev + "2. Select your project: advance-mobility-fe25a\n"
        );
        setStatus(
          (prev) => prev + '3. Click "Firestore Database" in the left menu\n'
        );
        setStatus((prev) => prev + '4. Click the "Rules" tab\n');
        setStatus((prev) => prev + "5. Make sure you have these rules:\n\n");
        setStatus((prev) => prev + "rules_version = '2';\n");
        setStatus((prev) => prev + "service cloud.firestore {\n");
        setStatus(
          (prev) => prev + "  match /databases/{database}/documents {\n"
        );
        setStatus((prev) => prev + "    match /{document=**} {\n");
        setStatus((prev) => prev + "      allow read, write: if true;\n");
        setStatus((prev) => prev + "    }\n");
        setStatus((prev) => prev + "  }\n");
        setStatus((prev) => prev + "}\n\n");
        setStatus((prev) => prev + '6. Click "Publish"\n');
        setStatus(
          (prev) => prev + "7. Wait 1-2 minutes, then run this test again\n"
        );
      } else if (error.code === "unavailable") {
        setStatus((prev) => prev + "🔴 NETWORK/UNAVAILABLE ERROR\n\n");
        setStatus((prev) => prev + "Possible causes:\n");
        setStatus((prev) => prev + "- No internet connection\n");
        setStatus((prev) => prev + "- Firestore database not created yet\n");
        setStatus((prev) => prev + "- Firebase services are down\n\n");
        setStatus((prev) => prev + "TO FIX:\n");
        setStatus((prev) => prev + "1. Check your internet connection\n");
        setStatus(
          (prev) =>
            prev +
            "2. Go to Firebase Console and make sure Firestore database is created\n"
        );
        setStatus(
          (prev) =>
            prev +
            "3. Check Firebase status: https://status.firebase.google.com/\n"
        );
      } else {
        setStatus((prev) => prev + "🔴 UNKNOWN ERROR\n\n");
        setStatus((prev) => prev + `Error code: ${error.code || "unknown"}\n`);
        setStatus((prev) => prev + `Error message: ${error.message}\n\n`);
        setStatus(
          (prev) =>
            prev + "Please check the browser console (F12) for more details.\n"
        );
      }
    }

    setTesting(false);
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "800px",
        margin: "20px auto",
        backgroundColor: "#f5f5f5",
        borderRadius: "8px",
        fontFamily: "monospace",
      }}
    >
      <h2>🔥 Firebase Connection Test</h2>
      <p>Click the button below to test if Firebase is configured correctly.</p>

      <button
        onClick={runTest}
        disabled={testing}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          backgroundColor: testing ? "#ccc" : "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: testing ? "not-allowed" : "pointer",
          marginBottom: "20px",
        }}
      >
        {testing ? "Testing..." : "Run Firebase Test"}
      </button>

      {status && (
        <pre
          style={{
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "5px",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            fontSize: "14px",
            maxHeight: "500px",
            overflow: "auto",
            border: "1px solid #ddd",
          }}
        >
          {status}
        </pre>
      )}
    </div>
  );
}
