// src/components/ProcessingView.jsx
import React from 'react';

export default function ProcessingView({
  originalPreviewUrl,
  stage,
  modelProgress,
  inferenceProgress,
  statusMessage,
  error,
  onRetry,
  onCancel,
}) {
  const getProgressBar = (percentage) => (
    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 mt-1">
      <div
        className="bg-brand-500 h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );

  const renderContent = () => {
    switch (stage) {
      case 'preparing':
        return (
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Loading model… {modelProgress}%
            </p>
            {getProgressBar(modelProgress)}
          </div>
        );
      case 'processing':
        return (
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Removing background… {inferenceProgress}%
            </p>
            {getProgressBar(inferenceProgress)}
          </div>
        );
      case 'error':
        return (
          <div className="text-center text-red-600 dark:text-red-400 space-y-3">
            <p>{error?.message || 'An error occurred.'}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={onRetry}
                className="px-3 py-1 bg-brand-500 text-white rounded hover:bg-brand-600 transition"
              >
                Retry
              </button>
              <button
                onClick={onCancel}
                className="px-3 py-1 bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded hover:bg-slate-400 dark:hover:bg-slate-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <img src={originalPreviewUrl} alt="Original" className="max-w-xs rounded shadow-lg" />
      {renderContent()}
      {statusMessage && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{statusMessage}</p>
      )}
    </div>
  );
}
