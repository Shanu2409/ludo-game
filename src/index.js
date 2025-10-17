import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Create the root element and render the app.  Using React 18's
// createRoot enables concurrent features and improves performance.
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);