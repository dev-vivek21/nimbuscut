import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

export default function UploadZone({ onImageSelected }) {
  const [errorMessage, setErrorMessage] = useState(null);

  const onDrop = useCallback(
    (acceptedFiles, fileRejections) => {
      setErrorMessage(null);

      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        const error = rejection.errors[0];

        if (error.code === 'file-too-large') {
          setErrorMessage('File size exceeds the 25MB limit. Please choose a smaller image.');
        } else if (error.code === 'file-invalid-type') {
          setErrorMessage('Unsupported format. Please upload a PNG, JPEG, or WebP image.');
        } else {
          setErrorMessage(error.message || 'Invalid file uploaded.');
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        onImageSelected(acceptedFiles[0]);
      }
    },
    [onImageSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    maxSize: MAX_SIZE_BYTES,
    multiple: false,
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-8 sm:p-12 text-center glass-card ${
          isDragActive
            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 scale-[1.01] shadow-glow'
            : isDragReject
            ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
            : 'border-slate-300 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-lg'
        }`}
      >
        <input {...getInputProps()} aria-label="Upload image" />

        {/* Upload Icon with glow effect */}
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-brand-500 to-violet-500 flex items-center justify-center text-white shadow-glow mb-6 group-hover:scale-110 transition-transform duration-300">
          <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Dynamic Titles for Desktop vs Mobile */}
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <span className="hidden sm:inline">Drag & drop your image here, or </span>
            <span className="sm:hidden">Tap to </span>
            <span className="text-brand-500 dark:text-brand-400 underline decoration-brand-500/30 decoration-2 underline-offset-4">
              browse files
            </span>
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Supports PNG, JPEG, WebP • Max 25MB
          </p>
        </div>

        {/* Privacy Pill badge */}
        <div className="mt-8 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          100% Private — Processed on-device, never leaves your computer
        </div>
      </div>

      {/* Inline Error Display */}
      {errorMessage && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-center gap-3 animate-fade-in text-sm font-medium">
          <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
