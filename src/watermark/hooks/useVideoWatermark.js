// src/watermark/hooks/useVideoWatermark.js
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  extractVideoMetadata,
  processVideoWatermark,
} from '../../services/videoWatermarkService.js';

export function useVideoWatermark() {
  const [stage, setStage] = useState('idle'); // 'idle' | 'selected' | 'processing' | 'done' | 'error'
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [selection, setSelection] = useState(null); // { x, y, width, height } normalized 0 to 1
  const [processingMethod, setProcessingMethod] = useState('client-inpaint'); // 'client-inpaint' | 'client-blur' | 'backend-api'
  const [blurRadius, setBlurRadius] = useState(16);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [error, setError] = useState(null);

  const [progress, setProgress] = useState({
    phase: 'Idle',
    percent: 0,
    frame: 0,
    totalFrames: 0,
    fps: 0,
    timeRemaining: null,
    statusMessage: '',
    previewCanvas: null,
  });

  const [result, setResult] = useState(null); // { blob, url, mimeType, width, height, duration }

  const abortControllerRef = useRef(null);

  // Clean up object URLs
  const cleanupUrls = useCallback(() => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    if (result?.url) {
      URL.revokeObjectURL(result.url);
    }
  }, [videoUrl, result]);

  useEffect(() => {
    return () => {
      cleanupUrls();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [cleanupUrls]);

  const selectVideo = useCallback(async (file) => {
    if (!file) return;

    setError(null);
    setStage('idle');
    setSelection(null);
    setResult(null);

    try {
      const meta = await extractVideoMetadata(file);
      const url = URL.createObjectURL(file);

      setVideoFile(file);
      setVideoUrl(url);
      setMetadata(meta);
      setStage('selected');
    } catch (err) {
      setError(err.message || 'Failed to inspect video file');
      setStage('error');
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStage('selected');
    setProgress((prev) => ({
      ...prev,
      phase: 'Cancelled',
      statusMessage: 'Watermark removal cancelled by user.',
    }));
  }, []);

  const startProcessing = useCallback(async () => {
    if (!videoFile || !metadata) {
      setError('No video selected.');
      return;
    }

    if (!selection || selection.width <= 0 || selection.height <= 0) {
      setError('Please select the area containing the watermark before starting.');
      return;
    }

    setError(null);
    setStage('processing');
    const dur = (isFinite(metadata.duration) && metadata.duration > 0) ? metadata.duration : 2;
    setProgress({
      phase: 'Starting',
      percent: 0,
      frame: 0,
      totalFrames: Math.max(1, Math.floor(dur * (metadata.fps || 30))),
      fps: 0,
      timeRemaining: null,
      statusMessage: 'Removing watermark...',
      previewCanvas: null,
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await processVideoWatermark({
        videoFile,
        metadata,
        selection,
        options: {
          method: processingMethod,
          blurRadius,
          apiEndpoint: apiEndpoint.trim() || undefined,
        },
        signal: abortController.signal,
        onProgress: (prog) => {
          setProgress((prev) => ({
            ...prev,
            ...prog,
          }));
        },
      });

      setResult(res);
      setStage('done');
    } catch (err) {
      if (err.name === 'AbortError') {
        setStage('selected');
      } else {
        console.error('Video watermark processing error:', err);
        setError(err.message || 'Failed to remove watermark from video.');
        setStage('error');
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [videoFile, metadata, selection, processingMethod, blurRadius, apiEndpoint]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    cleanupUrls();
    setStage('idle');
    setVideoFile(null);
    setVideoUrl(null);
    setMetadata(null);
    setSelection(null);
    setResult(null);
    setError(null);
    setProgress({
      phase: 'Idle',
      percent: 0,
      frame: 0,
      totalFrames: 0,
      fps: 0,
      timeRemaining: null,
      statusMessage: '',
      previewCanvas: null,
    });
  }, [cleanupUrls]);

  return {
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
  };
}
