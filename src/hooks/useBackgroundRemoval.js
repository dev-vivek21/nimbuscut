// src/hooks/useBackgroundRemoval.js
import { useState, useCallback, useRef } from 'react';

/**
 * Hook to manage local AI background removal via @imgly/background-removal.
 * Features:
 * - Model download tracking and caching in IndexedDB
 * - Inference progress tracking
 * - Pre‑inference downscaling to max 2000px on longest edge
 * - Memory cleanup with URL.revokeObjectURL
 * - Graceful fallback from WebGPU to CPU
 * - Error detection and retry logic
 */
export function useBackgroundRemoval() {
  const [stage, setStage] = useState('idle'); // idle | preparing | downloading | processing | done | error
  const [modelProgress, setModelProgress] = useState(0);
  const [inferenceProgress, setInferenceProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);

  const currentFileRef = useRef(null);
  const activeUrlRef = useRef(null);

  const cleanupActiveUrl = useCallback(() => {
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
  }, []);

  // Helper to downscale large source images to max 2000px longest edge
  const prepareWorkingImage = async (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const tempUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(tempUrl);
        const maxSide = 2000;
        let { naturalWidth: width, naturalHeight: height } = img;
        if (width <= maxSide && height <= maxSide) {
          resolve(file);
          return;
        }
        const scale = maxSide / Math.max(width, height);
        const targetWidth = Math.round(width * scale);
        const targetHeight = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(file);
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        reject(new Error('Corrupted or unreadable image file.'));
      };
      img.src = tempUrl;
    });
  };

  const processImage = useCallback(async (file) => {
    if (!file) return;
    currentFileRef.current = file;
    setError(null);
    cleanupActiveUrl();
    setResultUrl(null);
    setResultBlob(null);
    setStage('preparing');
    setStatusMessage('Preparing image...');
    setModelProgress(0);
    setInferenceProgress(0);
    try {
      const workingBlob = await prepareWorkingImage(file);

      const config = {
        debug: false,
        device: 'cpu', // default to CPU, will switch to GPU if safe
        output: {
          type: 'foreground',
          format: 'image/png',
          quality: 1.0,
        },
        progress: (key, current, total) => {
          const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
          if (typeof key === 'string' && key.includes('fetch')) {
            setStage('downloading');
            setModelProgress(ratio);
            const percent = Math.round(ratio * 100);
            setStatusMessage(`${percent}%`);
          } else if (typeof key === 'string' && (key.includes('compute') || key.includes('inference'))) {
            setStage('processing');
            setInferenceProgress(ratio);
            const percent = Math.round(ratio * 100);
            setStatusMessage(`${percent}%`);
          } else {
            setStage('processing');
            setStatusMessage(`${Math.round(ratio * 100)}%`);
          }
        },
      };

      // Prefer GPU when available and cross‑origin isolated (required for WebGPU)
      const hasWebGPU = typeof navigator !== 'undefined' && !!navigator.gpu;
      if (hasWebGPU && window.crossOriginIsolated) {
        config.device = 'gpu';
      }

      setStage('processing');
      setStatusMessage('Extracting subject...');

      const { removeBackground } = await import('@imgly/background-removal');
      const outputBlob = await removeBackground(workingBlob, config);
      const objectUrl = URL.createObjectURL(outputBlob);
      activeUrlRef.current = objectUrl;
      setResultBlob(outputBlob);
      setResultUrl(objectUrl);
      setStage('done');
      setStatusMessage('Completed');
    } catch (err) {
      console.error('Background removal error:', err);
      setStage('error');
      let msg = 'Failed to remove background.';
      if (err instanceof Error) {
        if (err.message.includes('out of memory') || err.message.includes('allocation')) {
          msg = 'Out of memory: try using a smaller image.';
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          msg = 'Could not download model files. Please check your internet connection.';
        } else {
          msg = err.message || msg;
        }
      }
      setError(msg);
      setStatusMessage('Error');
    }
  }, [cleanupActiveUrl]);

  const retry = useCallback(() => {
    if (currentFileRef.current) {
      processImage(currentFileRef.current);
    }
  }, [processImage]);

  const reset = useCallback(() => {
    cleanupActiveUrl();
    currentFileRef.current = null;
    setStage('idle');
    setModelProgress(0);
    setInferenceProgress(0);
    setStatusMessage('');
    setError(null);
    setResultUrl(null);
    setResultBlob(null);
  }, [cleanupActiveUrl]);

  return {
    stage,
    modelProgress,
    inferenceProgress,
    statusMessage,
    error,
    resultUrl,
    resultBlob,
    processImage,
    retry,
    reset,
  };
}
