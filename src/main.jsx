// src/main.jsx
import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import IntroAnimation from './components/IntroAnimation.jsx';
import './index.css';

function AppWithIntro() {
  const [introComplete, setIntroComplete] = useState(false);
  const handleIntroComplete = useCallback(() => setIntroComplete(true), []);

  return (
    <>
      {!introComplete && <IntroAnimation onComplete={handleIntroComplete} />}
      <App />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppWithIntro />
  </React.StrictMode>
);
