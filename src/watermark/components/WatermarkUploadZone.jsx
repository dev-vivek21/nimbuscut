// src/watermark/components/WatermarkUploadZone.jsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createSampleWatermarkedVideo } from '../utils/sampleVideoGenerator.js';

export default function WatermarkUploadZone({ onVideoSelected, onError }) {
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles, fileRejections) => {
      if (fileRejections && fileRejections.length > 0) {
        const rejection = fileRejections[0];
        const msg =
          rejection.errors[0]?.message ||
          'Invalid file. Please upload an MP4, WebM, MOV, or AVI video up to 250 MB.';
        onError?.(msg);
        return;
      }

      if (acceptedFiles && acceptedFiles.length > 0) {
        onVideoSelected(acceptedFiles[0]);
      }
    },
    [onVideoSelected, onError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
      'video/avi': ['.avi'],
    },
    maxFiles: 1,
    maxSize: 250 * 1024 * 1024,
  });

  const handleTrySample = async (e) => {
    e.stopPropagation();
    setIsGeneratingSample(true);
    try {
      const sampleFile = await createSampleWatermarkedVideo();
      onVideoSelected(sampleFile);
    } catch (err) {
      console.error('Failed to create sample video:', err);
      onError?.('Could not initialize sample video. Please upload a video file directly.');
    } finally {
      setIsGeneratingSample(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer select-none ${
          isDragActive
            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700/80 hover:border-brand-400 dark:hover:border-brand-550 glass-card'
        }`}
      >
        <input {...getInputProps()} aria-label="Upload video file" />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-500/20 to-violet-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-inner">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
              {isDragActive ? 'Drop your video right here' : 'Drag & drop your video here'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              or <span className="text-brand-600 dark:text-brand-400 font-semibold underline underline-offset-2">browse files</span> from your device
            </p>
          </div>

          {/* Formats & Limit */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              MP4
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              WebM
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              MOV
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              AVI
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1">
              (up to 250 MB)
            </span>
          </div>

          {/* One-Click Sample Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTrySample}
              disabled={isGeneratingSample}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {isGeneratingSample ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Preparing demo video...
                </>
              ) : (
                <>
                  <span>🎬</span>
                  <span>Try Sample Video (with Watermark)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
