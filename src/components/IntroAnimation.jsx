// src/components/IntroAnimation.jsx
import React, { useState, useEffect, useRef } from 'react';

/**
 * Premium intro animation that visually communicates:
 * "Original image → AI background removal → transparent result"
 *
 * - ~2.5s total duration
 * - Skipped for returning users (sessionStorage)
 * - Respects prefers-reduced-motion
 * - Skip button for accessibility
 * - Fully self-contained, does not touch any existing component
 */

const INTRO_SESSION_KEY = 'nimbuscut-intro-seen';

// Inline SVG of a person silhouette to demonstrate removal
// This avoids external dependencies and network requests
const SILHOUETTE_PATH =
  'M12 2C9.24 2 7 4.24 7 7s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 13c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z';

export default function IntroAnimation({ onComplete }) {
  const [phase, setPhase] = useState('enter'); // enter | removing | reveal | exit
  const [visible, setVisible] = useState(true);
  const timerRef = useRef([]);

  // Check if we should skip
  useEffect(() => {
    // Skip for returning users this session
    if (sessionStorage.getItem(INTRO_SESSION_KEY)) {
      setVisible(false);
      onComplete();
      return;
    }

    // Respect prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      sessionStorage.setItem(INTRO_SESSION_KEY, '1');
      setVisible(false);
      onComplete();
      return;
    }

    // Phase timeline
    const t1 = setTimeout(() => setPhase('removing'), 400);
    const t2 = setTimeout(() => setPhase('reveal'), 1400);
    const t3 = setTimeout(() => setPhase('exit'), 2200);
    const t4 = setTimeout(() => {
      sessionStorage.setItem(INTRO_SESSION_KEY, '1');
      setVisible(false);
      onComplete();
    }, 2800);

    timerRef.current = [t1, t2, t3, t4];
    return () => timerRef.current.forEach(clearTimeout);
  }, [onComplete]);

  const handleSkip = () => {
    timerRef.current.forEach(clearTimeout);
    sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    setVisible(false);
    onComplete();
  };

  if (!visible) return null;

  return (
    <div
      className={`intro-overlay ${phase === 'exit' ? 'intro-fade-out' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="NimbusCut intro animation"
    >
      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="intro-skip"
        aria-label="Skip intro animation"
      >
        Skip
      </button>

      {/* Central demo card */}
      <div className="intro-stage">
        {/* Simulated image frame */}
        <div className="intro-frame">
          {/* Background layer — fades out during "removing" */}
          <div
            className={`intro-bg-layer ${
              phase === 'removing' || phase === 'reveal' || phase === 'exit'
                ? 'intro-bg-removed'
                : ''
            }`}
          >
            {/* Gradient sky + ground to simulate a photo background */}
            <div className="intro-sky" />
            <div className="intro-ground" />
          </div>

          {/* Checkerboard layer — fades in when bg is removed */}
          <div
            className={`intro-checker-layer ${
              phase === 'reveal' || phase === 'exit' ? 'intro-checker-visible' : ''
            }`}
          />

          {/* Subject silhouette — always visible */}
          <div className="intro-subject">
            <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
              <path d={SILHOUETTE_PATH} />
            </svg>
          </div>

          {/* Scan line effect during removal */}
          {phase === 'removing' && <div className="intro-scanline" />}
        </div>

        {/* Status text */}
        <div className={`intro-text ${phase === 'enter' ? 'intro-text-hidden' : ''}`}>
          {(phase === 'removing') && (
            <span className="intro-status">Removing background<span className="intro-dots" /></span>
          )}
          {(phase === 'reveal' || phase === 'exit') && (
            <span className="intro-status intro-done">✓ Background removed</span>
          )}
        </div>

        {/* Brand */}
        <div className={`intro-brand ${phase !== 'enter' ? 'intro-brand-visible' : ''}`}>
          <span className="intro-brand-text">NimbusCut</span>
        </div>
      </div>

      {/* Inline styles — fully self-contained, no external CSS file needed */}
      <style>{`
        .intro-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          transition: opacity 0.5s ease, visibility 0.5s ease;
        }
        .dark .intro-overlay {
          background: #090d16;
        }
        .intro-fade-out {
          opacity: 0;
          visibility: hidden;
        }

        .intro-skip {
          position: absolute;
          top: 1.25rem;
          right: 1.5rem;
          padding: 0.35rem 0.9rem;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: #94a3b8;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 10;
        }
        .dark .intro-skip {
          color: #64748b;
          border-color: #1e293b;
        }
        .intro-skip:hover {
          color: #475569;
          border-color: #cbd5e1;
        }
        .dark .intro-skip:hover {
          color: #94a3b8;
          border-color: #334155;
        }

        .intro-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
          animation: intro-scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes intro-scale-in {
          from { transform: scale(0.92); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }

        .intro-frame {
          position: relative;
          width: 220px;
          height: 160px;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow:
            0 4px 6px -1px rgba(0,0,0,0.07),
            0 20px 40px -4px rgba(12,135,235,0.12);
          border: 1px solid #e2e8f0;
        }
        .dark .intro-frame {
          border-color: #1e293b;
          box-shadow:
            0 4px 6px -1px rgba(0,0,0,0.3),
            0 20px 40px -4px rgba(12,135,235,0.15);
        }

        /* Photo background simulation */
        .intro-bg-layer {
          position: absolute;
          inset: 0;
          transition: opacity 0.8s ease;
        }
        .intro-bg-removed {
          opacity: 0;
        }
        .intro-sky {
          position: absolute;
          inset: 0;
          bottom: 40%;
          background: linear-gradient(180deg, #7dd3fc 0%, #bae6fd 50%, #e0f2fe 100%);
        }
        .dark .intro-sky {
          background: linear-gradient(180deg, #1e3a5f 0%, #1e293b 50%, #0f172a 100%);
        }
        .intro-ground {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          height: 40%;
          background: linear-gradient(180deg, #86efac 0%, #4ade80 100%);
        }
        .dark .intro-ground {
          background: linear-gradient(180deg, #14532d 0%, #166534 100%);
        }

        /* Checkerboard */
        .intro-checker-layer {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.5s ease 0.1s;
          background-color: #f1f5f9;
          background-image:
            linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
            linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
            linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
          background-size: 14px 14px;
          background-position: 0 0, 0 7px, 7px -7px, -7px 0px;
        }
        .dark .intro-checker-layer {
          background-color: #0b1120;
          background-image:
            linear-gradient(45deg, #1e293b 25%, transparent 25%),
            linear-gradient(-45deg, #1e293b 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #1e293b 75%),
            linear-gradient(-45deg, transparent 75%, #1e293b 75%);
          background-size: 14px 14px;
          background-position: 0 0, 0 7px, 7px -7px, -7px 0px;
        }
        .intro-checker-visible {
          opacity: 1;
        }

        /* Subject */
        .intro-subject {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          color: #334155;
          padding: 1.5rem 3rem;
        }
        .dark .intro-subject {
          color: #cbd5e1;
        }

        /* Scan line */
        .intro-scanline {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #0c87eb, #8b5cf6, transparent);
          z-index: 3;
          animation: intro-scan 0.9s ease-in-out;
          box-shadow: 0 0 16px 2px rgba(12,135,235,0.4);
        }
        @keyframes intro-scan {
          from { top: 0; }
          to   { top: 100%; }
        }

        /* Text */
        .intro-text {
          height: 1.5rem;
          transition: opacity 0.3s ease;
        }
        .intro-text-hidden {
          opacity: 0;
        }
        .intro-status {
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 0.02em;
        }
        .dark .intro-status {
          color: #94a3b8;
        }
        .intro-done {
          color: #16a34a;
        }
        .dark .intro-done {
          color: #4ade80;
        }

        /* Animated dots */
        .intro-dots::after {
          content: '';
          animation: intro-dots-anim 1s steps(3, end) infinite;
        }
        @keyframes intro-dots-anim {
          0%   { content: '.'; }
          33%  { content: '..'; }
          66%  { content: '...'; }
        }

        /* Brand */
        .intro-brand {
          opacity: 0;
          transform: translateY(4px);
          transition: opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s;
        }
        .intro-brand-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .intro-brand-text {
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #0c87eb, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </div>
  );
}
