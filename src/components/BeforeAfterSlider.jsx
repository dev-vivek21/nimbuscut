import React, { useState, useRef, useCallback, useEffect } from 'react';
import { isValidElement } from 'react';

export default function BeforeAfterSlider({ original, processed, background }) {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const updatePosition = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.min(100, Math.max(0, percentage)));
  }, []);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging) return;
      updatePosition(e.clientX);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, updatePosition]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, prev + 5));
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">
      {/* Labels bar */}
      <div className="flex justify-between items-center px-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          Original
        </span>
        <span className="text-brand-500 dark:text-brand-400 font-mono">
          {Math.round(sliderPosition)}% split
        </span>
        <span className="flex items-center gap-1.5">
          Background Removed
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        </span>
      </div>

      {/* Interactive slider frame */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="Before and after image comparison slider. Use arrow keys to adjust split."
        aria-valuenow={Math.round(sliderPosition)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative w-full aspect-[4/3] sm:aspect-video rounded-2xl overflow-hidden cursor-ew-resize select-none border border-slate-200 dark:border-slate-800 shadow-2xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-checkerboard"
        style={background?.type === 'color' ? { backgroundColor: background.value } : background?.type === 'image' ? { backgroundImage: `url(${background.value})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {/* Optional background image layer (when type=image) */}
        {background?.type === 'image' && (
          <img src={background.value} alt="Background" className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ transform: `scale(${background.scale || 1})`, transformOrigin: 'center center' }} />
        )}
        {/* Layer 1 (Bottom): Processed image with transparent background */}
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <img
            src={processed}
            alt="Processed image with background removed"
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Layer 2 (Top): Original image clipped by slider position */}
        <div
          className="absolute inset-0 overflow-hidden bg-slate-950/20"
          style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
        >
          <div className="w-full h-full flex items-center justify-center p-2">
            <img
              src={original}
              alt="Original source image"
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
          </div>
        </div>

        {/* Vertical Divider Line & Draggable Handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white dark:bg-slate-900 border-2 border-brand-500 shadow-xl flex items-center justify-center pointer-events-auto">
            <svg
              className="w-5 h-5 text-brand-500 dark:text-brand-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 9l-3 3m0 0l3 3m-3-3h14m-3-3l3 3m0 0l-3 3" />
            </svg>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-slate-400">
        Drag the handle or use Left/Right arrow keys on keyboard
      </p>
    </div>
  );
}
