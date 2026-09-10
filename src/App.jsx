import React, { useState, useReducer, useEffect, useCallback, lazy, Suspense } from 'react';
import UploadZone from './components/UploadZone.jsx';
import { useBackgroundRemoval } from './hooks/useBackgroundRemoval.js';

const ProcessingView = lazy(() => import('./components/ProcessingView.jsx'));
const BeforeAfterSlider = lazy(() => import('./components/BeforeAfterSlider.jsx'));
const ExportControls = lazy(() => import('./components/ExportControls.jsx'));
const BackgroundSelector = lazy(() => import('./components/BackgroundSelector.jsx'));

const initialAppState = {
  originalFile: null,
  originalUrl: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SELECT_IMAGE':
      if (state.originalUrl) {
        URL.revokeObjectURL(state.originalUrl);
      }
      return {
        originalFile: action.file,
        originalUrl: URL.createObjectURL(action.file),
      };
    case 'RESET':
      if (state.originalUrl) {
        URL.revokeObjectURL(state.originalUrl);
      }
      return initialAppState;
    default:
      return state;
  }
}

export default function App() {
  const [appState, dispatch] = useReducer(appReducer, initialAppState);
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const {
    stage,
    modelProgress,
    inferenceProgress,
    statusMessage,
    error,
    resultUrl,
    resultBlob,
    processImage,
    retry,
    reset: resetRemoval,
  } = useBackgroundRemoval();

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('bgremover-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bgremover-theme', 'light');
    }
  };

  const handleImageSelected = useCallback((file) => {
    dispatch({ type: 'SELECT_IMAGE', file });
    processImage(file);
  }, [processImage]);

  const handleFullReset = useCallback(() => {
    dispatch({ type: 'RESET' });
    resetRemoval();
  }, [resetRemoval]);

  // Background selector state
  const [bgConfig, setBgConfig] = useState({ type: 'transparent' });

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      if (appState.originalUrl) {
        URL.revokeObjectURL(appState.originalUrl);
      }
    };
  }, [appState.originalUrl]);

  const isDone = stage === 'done' && resultUrl;
  const isProcessing = (stage === 'preparing' || stage === 'downloading' || stage === 'processing' || stage === 'error') && appState.originalFile && !isDone;

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="w-full border-b border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md sticky top-0 z-20 bg-white/70 dark:bg-slate-950/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleFullReset}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-violet-600 flex items-center justify-center text-white shadow-glow">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-brand-600 via-brand-500 to-violet-500 bg-clip-text text-transparent">
                NimbusCut
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                100% Client-Side
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {appState.originalFile && (
              <button
                onClick={handleFullReset}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 transition text-slate-600 dark:text-slate-300"
              >
                New Image
              </button>
            )}

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 transition flex items-center justify-center"
            >
              {isDark ? (
                <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        {!appState.originalFile && (
          <div className="space-y-8 animate-fade-in text-center">
            <div className="space-y-3 max-w-2xl mx-auto">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Remove image backgrounds{' '}
                <span className="bg-gradient-to-r from-brand-500 to-violet-500 bg-clip-text text-transparent">
                  instantly & privately
                </span>
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
                Powered by in-browser neural network inference (WASM + WebGPU). No backend server, zero data leakage.
              </p>
            </div>

            <UploadZone onImageSelected={handleImageSelected} />

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-6 text-left">
              <div className="glass-card p-4 rounded-xl space-y-1.5 border border-slate-200/70 dark:border-slate-800/70">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  🔒
                </div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">Zero Server Uploads</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Your photos never touch a cloud server. 100% computed right in your web browser.
                </div>
              </div>

              <div className="glass-card p-4 rounded-xl space-y-1.5 border border-slate-200/70 dark:border-slate-800/70">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">WebGPU & WASM</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  High-speed neural matting utilizing your local GPU or multi-core WASM engine.
                </div>
              </div>

              <div className="glass-card p-4 rounded-xl space-y-1.5 border border-slate-200/70 dark:border-slate-800/70">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold">
                  🎯
                </div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">Flexible Export</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Download at Original resolution, 1080p, 720p, or custom width in PNG, WebP, or JPEG.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <Suspense fallback={null}>
            <ProcessingView
              originalPreviewUrl={appState.originalUrl}
              stage={stage}
              modelProgress={modelProgress}
              inferenceProgress={inferenceProgress}
              statusMessage={statusMessage}
              error={error}
              onRetry={retry}
              onCancel={handleFullReset}
            />
          </Suspense>
        )}

        {/* Results State */}
        {isDone && (
          <Suspense fallback={null}>
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1">
                  <BeforeAfterSlider
                    original={appState.originalUrl}
                    processed={resultUrl}
                    background={bgConfig}
                  />
                </div>
                <div className="w-full md:w-48 lg:w-56">
                  <BackgroundSelector onChange={setBgConfig} />
                </div>
              </div>
              <ExportControls
                originalFile={appState.originalFile}
                processedUrl={resultUrl}
                processedBlob={resultBlob}
                onReset={handleFullReset}
                bgConfig={bgConfig}
              />
            </div>
          </Suspense>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-400 border-t border-slate-200/50 dark:border-slate-800/50">
        <p>
          I built this – 100% client‑side background remover
        </p>
      </footer>
    </div>
  );
}
