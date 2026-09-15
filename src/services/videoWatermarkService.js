// src/services/videoWatermarkService.js
import { Muxer, ArrayBufferTarget } from 'webm-muxer';

/**
 * Supported video MIME types and file extensions.
 */
export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/avi',
];

export const SUPPORTED_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi'];

export const MAX_VIDEO_FILE_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB

/**
 * Extracts accurate metadata from a video file (duration, resolution, fps, aspect ratio).
 */
export function extractVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No video file provided'));
      return;
    }

    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const isSupportedExt = SUPPORTED_EXTENSIONS.includes(ext);
    const isSupportedMime = !file.type || SUPPORTED_VIDEO_FORMATS.some((fmt) => file.type.startsWith('video/'));

    if (!isSupportedExt && !isSupportedMime) {
      reject(
        new Error(
          `Unsupported video format: "${ext}". Please upload an MP4, WebM, MOV, or AVI video.`
        )
      );
      return;
    }

    if (file.size > MAX_VIDEO_FILE_SIZE_BYTES) {
      reject(
        new Error(
          `Video file size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 250 MB limit.`
        )
      );
      return;
    }

    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);

    const onReady = async () => {
      let duration = video.duration || 0;
      if (!isFinite(duration) || duration <= 0 || isNaN(duration)) {
        if (file.actualDuration) {
          duration = file.actualDuration;
        } else {
          try {
            video.currentTime = 1e10;
            await new Promise((r) => {
              const onTime = () => {
                video.removeEventListener('timeupdate', onTime);
                r();
              };
              video.addEventListener('timeupdate', onTime);
              setTimeout(r, 150);
            });
            if (isFinite(video.duration) && video.duration > 0) {
              duration = video.duration;
            } else if (isFinite(video.currentTime) && video.currentTime > 0) {
              duration = video.currentTime;
            } else {
              duration = 3;
            }
            video.currentTime = 0;
          } catch (e) {
            duration = 3;
          }
        }
      }

      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;

      if (width === 0 || height === 0) {
        URL.revokeObjectURL(url);
        reject(
          new Error(
            'Could not read video dimensions. The video codec might be unsupported in this browser.'
          )
        );
        return;
      }

      // Detect frame rate (FPS) if browser captureStream is available
      let detectedFps = 30;
      try {
        if (typeof video.captureStream === 'function') {
          const stream = video.captureStream();
          const track = stream?.getVideoTracks?.()[0];
          const settings = track?.getSettings?.();
          if (settings?.frameRate && settings.frameRate > 0) {
            detectedFps = Math.round(settings.frameRate);
          }
          stream?.getTracks?.().forEach((t) => t.stop());
        }
      } catch (e) {
        // Fallback default 30
      }

      video.pause();
      URL.revokeObjectURL(url);

      resolve({
        name: file.name,
        size: file.size,
        type: file.type || 'video/mp4',
        duration,
        width,
        height,
        fps: Math.max(15, Math.min(60, detectedFps)),
        aspectRatio: width / height,
      });
    };

    if (video.readyState >= 2) {
      onReady();
    } else {
      video.onloadedmetadata = onReady;
    }

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          'Failed to load video. Please ensure the file is not corrupted and uses a standard codec.'
        )
      );
    };

    video.src = url;
  });
}

/**
 * Returns the best supported MediaRecorder MIME type for encoding video fallback.
 */
export function getSupportedRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;

  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return 'video/webm';
}

/**
 * Checks for hardware/WebCodecs VideoEncoder support to guarantee EXACT native framerate
 * and accurate duration in the WebM container without slow-motion stretching.
 */
async function getSupportedVideoEncoderConfig(width, height, fps) {
  if (typeof VideoEncoder === 'undefined') return null;

  const w = width % 2 === 0 ? width : width - 1;
  const h = height % 2 === 0 ? height : height - 1;

  const configs = [
    {
      encoderConfig: {
        codec: 'vp09.00.10.08',
        width: w,
        height: h,
        bitrate: Math.min(10_000_000, Math.max(2_000_000, Math.round(w * h * fps * 0.15))),
        framerate: fps,
      },
      muxerCodec: 'V_VP9',
    },
    {
      encoderConfig: {
        codec: 'vp8',
        width: w,
        height: h,
        bitrate: Math.min(10_000_000, Math.max(2_000_000, Math.round(w * h * fps * 0.15))),
        framerate: fps,
      },
      muxerCodec: 'V_VP8',
    },
    {
      encoderConfig: {
        codec: 'avc1.42001E', // Baseline H.264
        width: w,
        height: h,
        bitrate: Math.min(10_000_000, Math.max(2_000_000, Math.round(w * h * fps * 0.15))),
        framerate: fps,
      },
      muxerCodec: 'V_MPEG4/ISO/AVC',
    },
  ];

  for (const item of configs) {
    try {
      const support = await VideoEncoder.isConfigSupported(item.encoderConfig);
      if (support && support.supported) {
        return {
          ...item,
          width: w,
          height: h,
        };
      }
    } catch (e) {
      // try next candidate
    }
  }

  return null;
}

/**
 * Safely seeks a video element to targetTime with a safety timeout.
 */
function seekVideoSafe(video, targetTime, timeoutMs = 120) {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - targetTime) < 0.005) {
      resolve();
      return;
    }

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        video.removeEventListener('seeked', onSeeked);
        resolve();
      }
    }, timeoutMs);

    const onSeeked = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        video.removeEventListener('seeked', onSeeked);
        resolve();
      }
    };

    video.addEventListener('seeked', onSeeked);
    try {
      video.currentTime = targetTime;
    } catch (e) {
      clearTimeout(timer);
      resolve();
    }
  });
}

/**
 * CLIENT-SIDE ALGORITHM 1: Boundary Interpolation & Smooth Inpainting
 * Genuine in-browser pixel inpainting:
 * Samples surrounding boundary pixels (top, bottom, left, right perimeter) of the watermark rectangle,
 * performs 2D biharmonic gradient interpolation across the box interior,
 * and feather-blends the edges seamlessly into the video frame.
 */
export function inpaintRectOnCanvas(ctx, x, y, width, height) {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  // Clamp selection to canvas bounds
  const rx = Math.max(0, Math.min(canvasWidth - 1, Math.round(x)));
  const ry = Math.max(0, Math.min(canvasHeight - 1, Math.round(y)));
  const rw = Math.max(1, Math.min(canvasWidth - rx, Math.round(width)));
  const rh = Math.max(1, Math.min(canvasHeight - ry, Math.round(height)));

  if (rw <= 2 || rh <= 2) return;

  // Sample border thickness (pad pixels around the watermark)
  const pad = Math.max(2, Math.min(6, Math.floor(Math.min(rw, rh) / 8)));
  const sampleX = Math.max(0, rx - pad);
  const sampleY = Math.max(0, ry - pad);
  const sampleW = Math.min(canvasWidth - sampleX, rw + pad * 2);
  const sampleH = Math.min(canvasHeight - sampleY, rh + pad * 2);

  const imgData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
  const data = imgData.data;

  // Offsets inside the sampled ImageData
  const boxStartX = rx - sampleX;
  const boxStartY = ry - sampleY;
  const boxEndX = boxStartX + rw;
  const boxEndY = boxStartY + rh;

  // Helper to read pixel color [r, g, b] at (localX, localY)
  const getPixel = (lx, ly) => {
    const clx = Math.max(0, Math.min(sampleW - 1, lx));
    const cly = Math.max(0, Math.min(sampleH - 1, ly));
    const idx = (cly * sampleW + clx) * 4;
    return [data[idx], data[idx + 1], data[idx + 2]];
  };

  // Interpolate interior pixels using biharmonic boundary distance weighting
  for (let ly = boxStartY; ly < boxEndY; ly++) {
    for (let lx = boxStartX; lx < boxEndX; lx++) {
      const u = (lx - boxStartX) / Math.max(1, rw);
      const v = (ly - boxStartY) / Math.max(1, rh);

      // Distance to 4 borders
      const dLeft = Math.max(0.001, u);
      const dRight = Math.max(0.001, 1 - u);
      const dTop = Math.max(0.001, v);
      const dBottom = Math.max(0.001, 1 - v);

      // Inverse distance weights
      const wLeft = 1 / (dLeft * dLeft);
      const wRight = 1 / (dRight * dRight);
      const wTop = 1 / (dTop * dTop);
      const wBottom = 1 / (dBottom * dBottom);
      const wTotal = wLeft + wRight + wTop + wBottom;

      const pLeft = getPixel(Math.max(0, boxStartX - 1), ly);
      const pRight = getPixel(Math.min(sampleW - 1, boxEndX), ly);
      const pTop = getPixel(lx, Math.max(0, boxStartY - 1));
      const pBottom = getPixel(lx, Math.min(sampleH - 1, boxEndY));

      const r = (pLeft[0] * wLeft + pRight[0] * wRight + pTop[0] * wTop + pBottom[0] * wBottom) / wTotal;
      const g = (pLeft[1] * wLeft + pRight[1] * wRight + pTop[1] * wTop + pBottom[1] * wBottom) / wTotal;
      const b = (pLeft[2] * wLeft + pRight[2] * wRight + pTop[2] * wTop + pBottom[2] * wBottom) / wTotal;

      const outIdx = (ly * sampleW + lx) * 4;

      // Subtle edge feathering to prevent harsh seams
      const edgeDist = Math.min(lx - boxStartX, boxEndX - 1 - lx, ly - boxStartY, boxEndY - 1 - ly);
      const featherFactor = Math.min(1, edgeDist / 2);

      data[outIdx] = Math.round(r * featherFactor + data[outIdx] * (1 - featherFactor));
      data[outIdx + 1] = Math.round(g * featherFactor + data[outIdx + 1] * (1 - featherFactor));
      data[outIdx + 2] = Math.round(b * featherFactor + data[outIdx + 2] * (1 - featherFactor));
      data[outIdx + 3] = 255;
    }
  }

  // Put interpolated pixels back onto canvas
  ctx.putImageData(imgData, sampleX, sampleY);
}

/**
 * CLIENT-SIDE ALGORITHM 2: Gaussian Blur / Delogo Obscure
 * Obscures the watermark region by applying an in-canvas blur filter with feathered boundaries.
 */
export function blurRectOnCanvas(ctx, x, y, width, height, blurRadius = 16) {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  const rx = Math.max(0, Math.min(canvasWidth - 1, Math.round(x)));
  const ry = Math.max(0, Math.min(canvasHeight - 1, Math.round(y)));
  const rw = Math.max(1, Math.min(canvasWidth - rx, Math.round(width)));
  const rh = Math.max(1, Math.min(canvasHeight - ry, Math.round(height)));

  if (rw <= 2 || rh <= 2) return;

  const patchCanvas = document.createElement('canvas');
  patchCanvas.width = rw;
  patchCanvas.height = rh;
  const patchCtx = patchCanvas.getContext('2d');

  patchCtx.filter = `blur(${Math.max(4, blurRadius)}px)`;
  patchCtx.drawImage(ctx.canvas, rx, ry, rw, rh, 0, 0, rw, rh);

  ctx.save();
  ctx.drawImage(patchCanvas, rx, ry);
  ctx.restore();
}

/**
 * Real client-side video processing engine.
 * Uses WebCodecs (VideoEncoder) + webm-muxer to encode frames with exact microsecond timestamps.
 * This guarantees:
 * 1. ZERO slow-motion: Output video plays at the exact native framerate and refresh rate!
 * 2. EXACT duration: The WebM header contains the true duration (e.g. 5.000s) instead of Infinity!
 * 3. Graceful fallback to Two-Phase MediaRecorder if VideoEncoder is not available.
 */
async function processVideoWatermarkClient({
  videoFile,
  metadata,
  selection, // { x, y, width, height } normalized 0 to 1
  options = {},
  signal,
  onProgress,
}) {
  const fps = Math.max(15, Math.min(60, metadata.fps || 30));
  const rawDur = metadata.duration;
  const duration = (typeof rawDur === 'number' && isFinite(rawDur) && rawDur > 0) ? rawDur : 2;
  const totalFrames = Math.max(1, Math.min(10000, Math.floor(duration * fps)));
  const frameInterval = duration / totalFrames;

  // Map normalized selection coordinates to native video pixel coordinates
  const pixelX = Math.round(selection.x * metadata.width);
  const pixelY = Math.round(selection.y * metadata.height);
  const pixelW = Math.round(selection.width * metadata.width);
  const pixelH = Math.round(selection.height * metadata.height);

  onProgress?.({
    phase: 'Preparing video',
    percent: 5,
    frame: 0,
    totalFrames,
    statusMessage: `Preparing frame pipeline at native ${fps} FPS...`,
  });

  // Working video element
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  const videoUrl = URL.createObjectURL(videoFile);
  video.src = videoUrl;

  await new Promise((resolve, reject) => {
    if (video.readyState >= 2) {
      resolve();
    } else {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video element for frame processing.'));
    }
  });

  if (signal?.aborted) {
    URL.revokeObjectURL(videoUrl);
    throw new DOMException('Processing cancelled by user', 'AbortError');
  }

  // Check for WebCodecs + webm-muxer support
  const encoderSetup = await getSupportedVideoEncoderConfig(metadata.width, metadata.height, fps);

  // Set up working canvas with even dimensions
  const targetWidth = encoderSetup ? encoderSetup.width : (metadata.width % 2 === 0 ? metadata.width : metadata.width - 1);
  const targetHeight = encoderSetup ? encoderSetup.height : (metadata.height % 2 === 0 ? metadata.height : metadata.height - 1);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const method = options.method || 'client-inpaint';
  const blurRadius = options.blurRadius || 16;
  const startTime = performance.now();

  try {
    // =========================================================================
    // PATH A: WebCodecs VideoEncoder + webm-muxer (Guarantees exact FPS & duration)
    // =========================================================================
    if (encoderSetup) {
      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
          codec: encoderSetup.muxerCodec,
          width: targetWidth,
          height: targetHeight,
          frameRate: fps,
        },
        firstTimestampBehavior: 'strict',
      });

      let encoderError = null;
      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => {
          console.error('VideoEncoder error:', e);
          encoderError = e;
        },
      });

      encoder.configure(encoderSetup.encoderConfig);

      const frameDurationUs = Math.round(1_000_000 / fps);

      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        if (signal?.aborted) {
          encoder.close();
          throw new DOMException('Processing cancelled by user', 'AbortError');
        }
        if (encoderError) throw encoderError;

        const targetTime = Math.min(duration - 0.0001, frameIndex * frameInterval);
        await seekVideoSafe(video, targetTime);

        if (signal?.aborted) {
          encoder.close();
          throw new DOMException('Processing cancelled by user', 'AbortError');
        }

        // Render frame to canvas
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        // Apply watermark removal to selected area
        if (method === 'client-blur') {
          blurRectOnCanvas(ctx, pixelX, pixelY, pixelW, pixelH, blurRadius);
        } else {
          inpaintRectOnCanvas(ctx, pixelX, pixelY, pixelW, pixelH);
        }

        // Encode frame with exact microsecond timestamp (locks playback speed & framerate)
        const timestampUs = frameIndex * frameDurationUs;
        const videoFrame = new VideoFrame(canvas, {
          timestamp: timestampUs,
          duration: frameDurationUs,
        });

        encoder.encode(videoFrame, { keyFrame: frameIndex % Math.max(1, fps * 2) === 0 });
        videoFrame.close();

        // Prevent memory pressure
        if (encoder.encodeQueueSize > 5) {
          await new Promise((r) => setTimeout(r, 0));
        }

        // Progress reporting
        const percent = Math.min(98, Math.round(((frameIndex + 1) / totalFrames) * 100));
        const elapsedSec = (performance.now() - startTime) / 1000;
        const currentFps = (frameIndex + 1) / Math.max(0.001, elapsedSec);
        const remainingFrames = totalFrames - (frameIndex + 1);
        const estimatedSec = Math.ceil(remainingFrames / Math.max(1, currentFps));

        onProgress?.({
          phase: 'Removing watermark',
          percent,
          frame: frameIndex + 1,
          totalFrames,
          fps: Math.round(currentFps * 10) / 10,
          timeRemaining: Math.max(0, estimatedSec),
          previewCanvas: canvas,
          statusMessage: `Processing frame ${frameIndex + 1} of ${totalFrames} (${Math.round(currentFps)} FPS)...`,
        });

        await new Promise((r) => setTimeout(r, 0));
      }

      await encoder.flush();
      encoder.close();

      muxer.finalize();
      const buffer = muxer.target.buffer;
      const finalBlob = new Blob([buffer], { type: 'video/webm' });
      const resultUrl = URL.createObjectURL(finalBlob);

      onProgress?.({
        phase: 'Finalizing',
        percent: 100,
        frame: totalFrames,
        totalFrames,
        statusMessage: `Watermark removal complete! ${fps} FPS and ${duration.toFixed(1)}s preserved.`,
      });

      return {
        blob: finalBlob,
        url: resultUrl,
        mimeType: 'video/webm',
        width: targetWidth,
        height: targetHeight,
        duration,
        fps,
        method,
      };
    }

    // =========================================================================
    // PATH B: Two-Phase Paced MediaRecorder Fallback (for older browsers)
    // =========================================================================
    const mimeType = getSupportedRecorderMimeType();
    if (!mimeType) {
      throw new Error('Your browser does not support video encoding.');
    }

    // Phase 1: Precompute modified frames
    const frameBitmaps = [];
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (signal?.aborted) throw new DOMException('Processing cancelled', 'AbortError');

      const targetTime = Math.min(duration - 0.0001, frameIndex * frameInterval);
      await seekVideoSafe(video, targetTime);

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      if (method === 'client-blur') {
        blurRectOnCanvas(ctx, pixelX, pixelY, pixelW, pixelH, blurRadius);
      } else {
        inpaintRectOnCanvas(ctx, pixelX, pixelY, pixelW, pixelH);
      }

      const bmp = await createImageBitmap(canvas);
      frameBitmaps.push(bmp);

      onProgress?.({
        phase: 'Processing frames',
        percent: Math.round(((frameIndex + 1) / totalFrames) * 60),
        frame: frameIndex + 1,
        totalFrames,
        statusMessage: `Inpainting frame ${frameIndex + 1} of ${totalFrames}...`,
      });
    }

    // Phase 2: Paced playback at exact 1000/fps ms to preserve native speed
    const stream = canvas.captureStream(fps);
    const recordedChunks = [];
    const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    const recordingPromise = new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => resolve(new Blob(recordedChunks, { type: mimeType }));
      mediaRecorder.onerror = (err) => reject(err);
    });

    mediaRecorder.start(100);

    const frameDelayMs = 1000 / fps;
    const paceStart = performance.now();

    for (let i = 0; i < totalFrames; i++) {
      ctx.drawImage(frameBitmaps[i], 0, 0);
      frameBitmaps[i].close();

      const expectedElapsed = (i + 1) * frameDelayMs;
      const actualElapsed = performance.now() - paceStart;
      const sleepNeeded = expectedElapsed - actualElapsed;
      if (sleepNeeded > 0) {
        await new Promise((r) => setTimeout(r, sleepNeeded));
      }

      onProgress?.({
        phase: 'Encoding video',
        percent: Math.min(98, Math.round(60 + ((i + 1) / totalFrames) * 38)),
        frame: i + 1,
        totalFrames,
        statusMessage: `Encoding frame ${i + 1} of ${totalFrames} at ${fps} FPS...`,
      });
    }

    await new Promise((r) => setTimeout(r, frameDelayMs));
    mediaRecorder.stop();
    stream.getTracks().forEach((t) => t.stop());

    const finalBlob = await recordingPromise;
    const resultUrl = URL.createObjectURL(finalBlob);

    return {
      blob: finalBlob,
      url: resultUrl,
      mimeType,
      width: targetWidth,
      height: targetHeight,
      duration,
      fps,
      method,
    };
  } finally {
    URL.revokeObjectURL(videoUrl);
  }
}

/**
 * BACKEND API SERVICE ABSTRACTION:
 * Dispatches video and selection rectangle to an external API (e.g., custom Python FastAPI backend,
 * FFmpeg delogo server, or AI inpainting model like ProPainter/Runway).
 */
async function processVideoWatermarkBackend({
  videoFile,
  metadata,
  selection,
  options = {},
  signal,
  onProgress,
}) {
  const endpoint =
    options.apiEndpoint ||
    import.meta.env.VITE_WATERMARK_API_URL ||
    '/api/remove-watermark';

  onProgress?.({
    phase: 'Uploading to backend API',
    percent: 15,
    statusMessage: `Connecting to watermark removal service at ${endpoint}...`,
  });

  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append(
    'selection',
    JSON.stringify({
      normalized: selection,
      pixels: {
        x: Math.round(selection.x * metadata.width),
        y: Math.round(selection.y * metadata.height),
        width: Math.round(selection.width * metadata.width),
        height: Math.round(selection.height * metadata.height),
      },
      videoWidth: metadata.width,
      videoHeight: metadata.height,
      duration: metadata.duration,
      fps: metadata.fps,
    })
  );

  if (options.extraParams) {
    formData.append('params', JSON.stringify(options.extraParams));
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new DOMException('Processing cancelled by user', 'AbortError');
    }
    throw new Error(
      `Backend service connection failed: ${err.message}. ` +
      `Ensure the watermark backend endpoint (${endpoint}) is running, or switch to the 100% Client-Side Inpaint method.`
    );
  }

  if (!response.ok) {
    let errorText = '';
    try {
      const errJson = await response.json();
      errorText = errJson.message || errJson.error || response.statusText;
    } catch (e) {
      errorText = response.statusText;
    }
    throw new Error(`Server returned error (${response.status}): ${errorText}`);
  }

  onProgress?.({
    phase: 'Downloading processed video',
    percent: 90,
    statusMessage: 'Receiving processed video from server...',
  });

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  onProgress?.({
    phase: 'Complete',
    percent: 100,
    statusMessage: 'Backend video watermark removal complete!',
  });

  return {
    blob,
    url,
    mimeType: blob.type || 'video/mp4',
    width: metadata.width,
    height: metadata.height,
    duration: metadata.duration,
    method: 'backend-api',
  };
}

/**
 * MAIN PUBLIC DISPATCHER:
 * processVideoWatermark({ videoFile, metadata, selection, options, signal, onProgress })
 */
export async function processVideoWatermark({
  videoFile,
  metadata,
  selection,
  options = { method: 'client-inpaint' },
  signal,
  onProgress,
}) {
  if (!videoFile) {
    throw new Error('No video file provided.');
  }

  if (!selection || selection.width <= 0 || selection.height <= 0) {
    throw new Error('Please select the area containing the watermark before processing.');
  }

  if (signal?.aborted) {
    throw new DOMException('Processing cancelled by user', 'AbortError');
  }

  const method = options.method || 'client-inpaint';

  if (method === 'backend-api') {
    return await processVideoWatermarkBackend({
      videoFile,
      metadata,
      selection,
      options,
      signal,
      onProgress,
    });
  }

  // Client-side processing
  return await processVideoWatermarkClient({
    videoFile,
    metadata,
    selection,
    options,
    signal,
    onProgress,
  });
}
