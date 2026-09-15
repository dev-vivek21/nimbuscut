// src/watermark/components/WatermarkResultViewer.jsx
import React, { useRef, useState, useCallback } from 'react';
import { saveAs } from 'file-saver';

export default function WatermarkResultViewer({
  originalUrl,
  result,
  metadata,
  onReset,
}) {
  const origVideoRef = useRef(null);
  const resultVideoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side' | 'result-only' | 'original-only'
  const [currentTime, setCurrentTime] = useState(0);

  const effectiveDuration = (isFinite(result?.duration) && result.duration > 0)
    ? result.duration
    : (metadata?.duration && isFinite(metadata.duration) && metadata.duration > 0 ? metadata.duration : 1);

  // Synchronized playback controls
  const togglePlay = () => {
    const orig = origVideoRef.current;
    const res = resultVideoRef.current;
    if (!res) return;

    if (res.paused) {
      // If at end, restart from beginning
      if (Math.abs(res.currentTime - effectiveDuration) < 0.1 || res.currentTime >= effectiveDuration) {
        res.currentTime = 0;
        if (orig) orig.currentTime = 0;
      }
      res.play();
      if (orig) orig.play();
      setIsPlaying(true);
    } else {
      res.pause();
      if (orig) orig.pause();
      setIsPlaying(false);
    }
  };

  const handleEnded = useCallback(() => {
    const orig = origVideoRef.current;
    const res = resultVideoRef.current;

    if (isLooping) {
      if (orig) {
        orig.currentTime = 0;
        orig.play();
      }
      if (res) {
        res.currentTime = 0;
        res.play();
      }
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
      if (orig) {
        orig.pause();
        orig.currentTime = 0;
      }
      if (res) {
        res.pause();
        res.currentTime = 0;
      }
    }
  }, [isLooping]);

  const handleSeek = (e) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    if (origVideoRef.current) origVideoRef.current.currentTime = t;
    if (resultVideoRef.current) resultVideoRef.current.currentTime = t;
  };

  const handleDownload = () => {
    if (!result?.blob) {
      console.warn('No result blob available to download');
      return;
    }

    const baseName = (metadata?.name || 'video').replace(/\.[^/.]+$/, '');
    const extension = result.mimeType?.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `${baseName}_watermark_removed.${extension}`;

    try {
      const blobUrl = result.url || URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 500);
    } catch (err) {
      console.warn('Direct link download failed, falling back to saveAs:', err);
      saveAs(result.blob, fileName);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Top Bar: Controls & View Mode */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-card border border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
            Watermark Removed Successfully
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
            {result?.method === 'client-blur' ? 'Blurred' : 'Inpainted'}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {result?.fps || metadata?.fps || 30} FPS
          </span>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              viewMode === 'side-by-side'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Split Compare
          </button>
          <button
            type="button"
            onClick={() => setViewMode('result-only')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              viewMode === 'result-only'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Processed Only
          </button>
          <button
            type="button"
            onClick={() => setViewMode('original-only')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              viewMode === 'original-only'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Original
          </button>
        </div>
      </div>

      {/* Synchronized Video Players */}
      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
        <div
          className={`grid gap-px bg-slate-800 ${
            viewMode === 'side-by-side' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {/* Original Video */}
          {(viewMode === 'side-by-side' || viewMode === 'original-only') && (
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={origVideoRef}
                src={originalUrl}
                playsInline
                muted
                className="w-full h-full object-contain pointer-events-none"
              />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/70 text-slate-300 backdrop-blur-sm border border-slate-700">
                Original (With Watermark)
              </div>
            </div>
          )}

          {/* Processed Video */}
          {(viewMode === 'side-by-side' || viewMode === 'result-only') && (
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={resultVideoRef}
                src={result?.url}
                playsInline
                muted
                onTimeUpdate={() => {
                  if (resultVideoRef.current) {
                    setCurrentTime(resultVideoRef.current.currentTime);
                  }
                }}
                onEnded={handleEnded}
                className="w-full h-full object-contain pointer-events-none"
              />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-600/90 text-white backdrop-blur-sm border border-brand-400 shadow">
                Watermark Removed
              </div>
            </div>
          )}
        </div>

        {/* Unified Playback Bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-t border-slate-800 text-white">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition active:scale-95"
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

          <input
            type="range"
            min={0}
            max={effectiveDuration}
            step={0.05}
            value={Math.min(effectiveDuration, currentTime)}
            onChange={handleSeek}
            aria-label="Timeline scrubber"
            className="flex-1 h-1.5 rounded-lg appearance-none bg-slate-700 accent-brand-500 cursor-pointer"
          />

          <div className="font-mono text-xs text-slate-400 whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(effectiveDuration)}
          </div>

          {/* Loop toggle button */}
          <button
            type="button"
            onClick={() => setIsLooping(!isLooping)}
            title={isLooping ? 'Loop is ON' : 'Loop is OFF'}
            className={`p-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              isLooping
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-[10px] hidden sm:inline">Loop</span>
          </button>
        </div>
      </div>

      {/* Action Bar: Download & New Video */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl glass-card border border-slate-200/80 dark:border-slate-800/80">
        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
          <div>
            Format: <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">{result?.mimeType || 'video/webm'}</span>
          </div>
          <div>
            Resolution: <span className="font-semibold text-slate-700 dark:text-slate-300">{result?.width} × {result?.height}</span>
            <span className="mx-2">•</span>
            Duration: <span className="font-semibold text-slate-700 dark:text-slate-300">{effectiveDuration.toFixed(1)}s</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition active:scale-95"
          >
            Remove Another Video
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Video
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(sec) {
  if (!isFinite(sec) || isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
