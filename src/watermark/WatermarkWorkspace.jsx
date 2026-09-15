// src/watermark/WatermarkWorkspace.jsx
import React from 'react';
import { useVideoWatermark } from './hooks/useVideoWatermark.js';
import WatermarkUploadZone from './components/WatermarkUploadZone.jsx';
import WatermarkSelectionCanvas from './components/WatermarkSelectionCanvas.jsx';
import WatermarkMethodSelector from './components/WatermarkMethodSelector.jsx';
import WatermarkProcessingView from './components/WatermarkProcessingView.jsx';
import WatermarkResultViewer from './components/WatermarkResultViewer.jsx';

export default function WatermarkWorkspace() {
  const {
    stage,
    videoFile,
    videoUrl,
    metadata,
    selection,
    processingMethod,
    blurRadius,
    apiEndpoint,
    progress,
    result,
    error,
    selectVideo,
    setSelection,
    clearSelection,
    setProcessingMethod,
    setBlurRadius,
    setApiEndpoint,
    startProcessing,
    cancelProcessing,
    reset,
  } = useVideoWatermark();

  const hasValidSelection = selection && selection.width > 0.01 && selection.height > 0.01;

  return (
    <div className="w-full space-y-6">
      {/* Error Notification Alert */}
      {error && (
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-start gap-3 text-xs sm:text-sm animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1 space-y-1">
            <div className="font-bold">Processing Error</div>
            <div className="leading-relaxed">{error}</div>
          </div>
          <button
            onClick={() => reset()}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stage: IDLE (Upload Video) */}
      {stage === 'idle' && (
        <div className="space-y-8 animate-fade-in text-center">
          <div className="space-y-3 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Remove video watermarks{' '}
              <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-violet-500 bg-clip-text text-transparent">
                cleanly & easily
              </span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
              Select the area containing any watermark, logo, or timestamp. Inpaint and obscure pixels frame-by-frame.
            </p>
          </div>

          <WatermarkUploadZone
            onVideoSelected={selectVideo}
            onError={(msg) => console.error(msg)}
          />

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-6 text-left">
            <div className="glass-card p-4 rounded-xl space-y-1.5 border border-slate-200/70 dark:border-slate-800/70">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                🎯
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">Precision Selection</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Draw, move, and resize a rectangular box over the watermark with 8 responsive handles.
              </div>
            </div>

            <div className="glass-card p-4 rounded-xl space-y-1.5 border border-slate-200/70 dark:border-slate-800/70">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                🎨
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">Smart Inpainting</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Samples boundary pixels around the watermark to blend colors seamlessly into the video frames.
              </div>
            </div>

            <div className="glass-card p-4 rounded-xl space-y-1.5 border border-slate-200/70 dark:border-slate-800/70">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold">
                🔌
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">Extensible Service</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Works 100% in-browser or connects cleanly to any serverless AI/FFmpeg backend endpoint.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage: SELECTED (Preview & Draw Bounding Box) */}
      {stage === 'selected' && metadata && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          {/* Metadata Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl glass-card border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                🎬
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                  {metadata.name}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{metadata.width} × {metadata.height}</span>
                  <span>•</span>
                  <span>{metadata.fps} FPS</span>
                  <span>•</span>
                  <span>{metadata.duration.toFixed(1)}s</span>
                  <span>•</span>
                  <span>{(metadata.size / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={reset}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Choose Another Video
            </button>
          </div>

          {/* Interactive Selection Canvas */}
          <WatermarkSelectionCanvas
            videoUrl={videoUrl}
            metadata={metadata}
            selection={selection}
            onSelectionChange={setSelection}
            onClearSelection={clearSelection}
          />

          {/* Method Selector */}
          <div className="p-5 rounded-2xl glass-card border border-slate-200/80 dark:border-slate-800/80">
            <WatermarkMethodSelector
              method={processingMethod}
              onMethodChange={setProcessingMethod}
              blurRadius={blurRadius}
              onBlurRadiusChange={setBlurRadius}
              apiEndpoint={apiEndpoint}
              onApiEndpointChange={setApiEndpoint}
            />
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {!hasValidSelection && (
              <span className="text-xs text-amber-500 dark:text-amber-400 font-medium">
                Please draw a rectangle over the watermark above
              </span>
            )}
            <button
              type="button"
              disabled={!hasValidSelection}
              onClick={startProcessing}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition active:scale-95 ${
                hasValidSelection
                  ? 'bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white shadow-brand-500/25 cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Remove Watermark
            </button>
          </div>
        </div>
      )}

      {/* Stage: PROCESSING */}
      {stage === 'processing' && (
        <WatermarkProcessingView
          progress={progress}
          onCancel={cancelProcessing}
        />
      )}

      {/* Stage: DONE */}
      {stage === 'done' && result && (
        <WatermarkResultViewer
          originalUrl={videoUrl}
          result={result}
          metadata={metadata}
          onReset={reset}
        />
      )}
    </div>
  );
}
