// src/watermark/components/WatermarkSelectionCanvas.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';

export default function WatermarkSelectionCanvas({
  videoUrl,
  metadata,
  selection, // { x, y, width, height } normalized 0 to 1
  onSelectionChange,
  onClearSelection,
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [interactionMode, setInteractionMode] = useState(null); // 'drawing' | 'moving' | 'resizing'
  const [resizeHandle, setResizeHandle] = useState(null); // 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  const [dragStart, setDragStart] = useState(null);
  const [containerRect, setContainerRect] = useState(null);

  // Update container bounding rect
  const updateRect = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
  }, []);

  useEffect(() => {
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [updateRect]);

  // Video playback time updates
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  // Convert client pointer event to normalized coordinates [0, 1] relative to video box
  const getNormalizedPoint = (e) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    return {
      x: Math.max(0, Math.min(1, px / rect.width)),
      y: Math.max(0, Math.min(1, py / rect.height)),
    };
  };

  // Pointer Down handler
  const handlePointerDown = (e, handleType = null) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const pt = getNormalizedPoint(e);

    if (handleType) {
      // User clicked on a resize handle
      setInteractionMode('resizing');
      setResizeHandle(handleType);
      setDragStart({ pt, initialSelection: { ...selection } });
    } else if (e.target.dataset.role === 'selection-box') {
      // User clicked inside selection box to move it
      setInteractionMode('moving');
      setDragStart({ pt, initialSelection: { ...selection } });
    } else {
      // User clicked on empty canvas -> start drawing new box
      setInteractionMode('drawing');
      setDragStart({ pt, startPoint: pt });
      onSelectionChange({ x: pt.x, y: pt.y, width: 0, height: 0 });
    }
  };

  // Pointer Move handler
  const handlePointerMove = (e) => {
    if (!interactionMode || !dragStart) return;
    e.preventDefault();

    const currentPt = getNormalizedPoint(e);

    if (interactionMode === 'drawing') {
      const sx = dragStart.startPoint.x;
      const sy = dragStart.startPoint.y;
      const x = Math.min(sx, currentPt.x);
      const y = Math.min(sy, currentPt.y);
      const width = Math.abs(currentPt.x - sx);
      const height = Math.abs(currentPt.y - sy);

      onSelectionChange({
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
        width: Math.min(1 - x, width),
        height: Math.min(1 - y, height),
      });
    } else if (interactionMode === 'moving') {
      const dx = currentPt.x - dragStart.pt.x;
      const dy = currentPt.y - dragStart.pt.y;
      const init = dragStart.initialSelection;

      let newX = init.x + dx;
      let newY = init.y + dy;

      // Clamp within 0 to 1
      newX = Math.max(0, Math.min(1 - init.width, newX));
      newY = Math.max(0, Math.min(1 - init.height, newY));

      onSelectionChange({
        x: newX,
        y: newY,
        width: init.width,
        height: init.height,
      });
    } else if (interactionMode === 'resizing') {
      const init = dragStart.initialSelection;
      let left = init.x;
      let top = init.y;
      let right = init.x + init.width;
      let bottom = init.y + init.height;

      if (resizeHandle.includes('w')) {
        left = Math.min(currentPt.x, right - 0.02);
      }
      if (resizeHandle.includes('e')) {
        right = Math.max(currentPt.x, left + 0.02);
      }
      if (resizeHandle.includes('n')) {
        top = Math.min(currentPt.y, bottom - 0.02);
      }
      if (resizeHandle.includes('s')) {
        bottom = Math.max(currentPt.y, top + 0.02);
      }

      left = Math.max(0, Math.min(1, left));
      top = Math.max(0, Math.min(1, top));
      right = Math.max(0, Math.min(1, right));
      bottom = Math.max(0, Math.min(1, bottom));

      onSelectionChange({
        x: left,
        y: top,
        width: Math.max(0.01, right - left),
        height: Math.max(0.01, bottom - top),
      });
    }
  };

  // Pointer Up handler
  const handlePointerUp = (e) => {
    if (interactionMode) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}

      // If drawn box was too small (accidental click), discard
      if (
        interactionMode === 'drawing' &&
        selection &&
        (selection.width < 0.02 || selection.height < 0.02)
      ) {
        onClearSelection();
      }

      setInteractionMode(null);
      setResizeHandle(null);
      setDragStart(null);
    }
  };

  // Keyboard accessibility: arrow keys nudge selection, Delete clears
  const handleKeyDown = (e) => {
    if (!selection) return;

    const step = e.shiftKey ? 0.04 : 0.01;
    let handled = false;

    if (e.key === 'ArrowLeft') {
      onSelectionChange({
        ...selection,
        x: Math.max(0, selection.x - step),
      });
      handled = true;
    } else if (e.key === 'ArrowRight') {
      onSelectionChange({
        ...selection,
        x: Math.min(1 - selection.width, selection.x + step),
      });
      handled = true;
    } else if (e.key === 'ArrowUp') {
      onSelectionChange({
        ...selection,
        y: Math.max(0, selection.y - step),
      });
      handled = true;
    } else if (e.key === 'ArrowDown') {
      onSelectionChange({
        ...selection,
        y: Math.min(1 - selection.height, selection.y + step),
      });
      handled = true;
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      onClearSelection();
      handled = true;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const hasValidSelection = selection && selection.width > 0.01 && selection.height > 0.01;

  // Pixel coordinates display
  const pixelBox = hasValidSelection && metadata
    ? {
        x: Math.round(selection.x * metadata.width),
        y: Math.round(selection.y * metadata.height),
        w: Math.round(selection.width * metadata.width),
        h: Math.round(selection.height * metadata.height),
      }
    : null;

  return (
    <div className="space-y-4">
      {/* Helpful Instructions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
          </span>
          <span className="font-medium">
            {hasValidSelection
              ? 'Watermark area selected. You can resize or drag to adjust it.'
              : 'Select the area containing the watermark.'}
          </span>
        </div>

        {hasValidSelection && (
          <div className="flex items-center gap-3">
            {pixelBox && (
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                {pixelBox.w} × {pixelBox.h} px (at {pixelBox.x}, {pixelBox.y})
              </span>
            )}
            <button
              type="button"
              onClick={onClearSelection}
              className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-semibold text-xs flex items-center gap-1 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reset Selection
            </button>
          </div>
        )}
      </div>

      {/* Video & Selection Overlay Container */}
      <div className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800 select-none">
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={(e) => handlePointerDown(e)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative w-full cursor-crosshair outline-none"
          style={{
            aspectRatio: metadata?.aspectRatio || 16 / 9,
          }}
          aria-label="Watermark selection canvas"
        >
          {/* Main Video Preview */}
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            muted
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-contain pointer-events-none"
          />

          {/* Prompt Overlay when no selection is made */}
          {!hasValidSelection && !interactionMode && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[1px]">
              <div className="glass-card px-4 py-2.5 rounded-xl border border-white/20 shadow-lg text-center animate-pulse">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Click and drag to draw a box around the watermark
                </div>
              </div>
            </div>
          )}

          {/* Interactive Bounding Box */}
          {hasValidSelection && (
            <div
              data-role="selection-box"
              onPointerDown={(e) => handlePointerDown(e)}
              className="absolute z-10 border-2 border-brand-400 bg-brand-500/20 backdrop-blur-[0.5px] cursor-move transition-shadow shadow-[0_0_15px_rgba(59,130,246,0.35)]"
              style={{
                left: `${selection.x * 100}%`,
                top: `${selection.y * 100}%`,
                width: `${selection.width * 100}%`,
                height: `${selection.height * 100}%`,
              }}
            >
              {/* Badge */}
              <div className="absolute -top-6 left-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-brand-600 text-white shadow pointer-events-none whitespace-nowrap">
                Watermark Area
              </div>

              {/* Resize Handles (8 directions) */}
              {/* NW */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'nw')}
                className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md cursor-nwse-resize"
              />
              {/* N */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'n')}
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md cursor-ns-resize"
              />
              {/* NE */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'ne')}
                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md cursor-nesw-resize"
              />
              {/* E */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'e')}
                className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md cursor-ew-resize"
              />
              {/* SE */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'se')}
                className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md cursor-nwse-resize"
              />
              {/* S */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 's')}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md cursor-ns-resize"
              />
              {/* SW */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'sw')}
                className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md cursor-nesw-resize"
              />
              {/* W */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'w')}
                className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md cursor-ew-resize"
              />
            </div>
          )}
        </div>

        {/* Video Player Scrubber & Transport Bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/95 border-t border-slate-800 text-white">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition active:scale-95"
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Time scrubber */}
          <input
            type="range"
            min={0}
            max={metadata?.duration || 1}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Timeline scrubber"
            className="flex-1 h-1.5 rounded-lg appearance-none bg-slate-700 accent-brand-500 cursor-pointer"
          />

          {/* Time display */}
          <div className="font-mono text-xs text-slate-400 whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(metadata?.duration || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
