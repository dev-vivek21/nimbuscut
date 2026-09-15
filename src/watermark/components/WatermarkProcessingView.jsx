// src/watermark/components/WatermarkProcessingView.jsx
import React, { useRef, useEffect } from 'react';

export default function WatermarkProcessingView({ progress, onCancel }) {
  const canvasContainerRef = useRef(null);

  // Mount/update the preview canvas if available
  useEffect(() => {
    if (progress?.previewCanvas && canvasContainerRef.current) {
      canvasContainerRef.current.innerHTML = '';
      const c = progress.previewCanvas;
      c.style.width = '100%';
      c.style.height = '100%';
      c.style.objectFit = 'contain';
      canvasContainerRef.current.appendChild(c);
    }
  }, [progress?.previewCanvas]);

  const percent = progress?.percent || 0;
  const frame = progress?.frame || 0;
  const totalFrames = progress?.totalFrames || 0;
  const statusMsg = progress?.statusMessage || 'Removing watermark...';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl text-center space-y-6">
        {/* Animated Processing Spinner */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-2xl bg-brand-500/20 animate-ping opacity-60"></div>
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-violet-600 flex items-center justify-center text-white shadow-lg">
            <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
          </div>
        </div>

        {/* Title & Status Message */}
        <div className="space-y-1.5">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Removing watermark...
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {statusMsg}
          </p>
        </div>

        {/* Live Processing Preview Monitor */}
        <div className="relative w-full max-w-md mx-auto aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
          <div ref={canvasContainerRef} className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-slate-500">Live monitor active...</span>
          </div>
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/70 text-emerald-400 backdrop-blur-sm border border-emerald-500/30">
            Live Stream
          </div>
        </div>

        {/* Progress Bar & Metrics */}
        <div className="space-y-2.5 max-w-md mx-auto">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>{percent}% Complete</span>
            {totalFrames > 0 && (
              <span>
                Frame {frame} / {totalFrames}
              </span>
            )}
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full transition-all duration-200 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Speed & ETA stats */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1">
            <span>
              {progress?.fps ? `Processing speed: ${progress.fps} FPS` : 'Processing video stream'}
            </span>
            {progress?.timeRemaining != null && (
              <span>~{progress.timeRemaining}s remaining</span>
            )}
          </div>
        </div>

        {/* Cancel Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 transition active:scale-95"
          >
            Cancel Processing
          </button>
        </div>
      </div>
    </div>
  );
}
