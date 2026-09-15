// src/watermark/utils/sampleVideoGenerator.js

/**
 * Generates an in-browser sample video with a clearly defined watermark logo/text
 * for testing the Video Watermark Remover without needing external downloads.
 */
export async function createSampleWatermarkedVideo() {
  const width = 640;
  const height = 360;
  const fps = 30;
  const durationSec = 2;
  const totalFrames = fps * durationSec;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recordedChunks = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  const donePromise = new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const file = new File([blob], 'sample_watermark_demo.webm', { type: 'video/webm' });
      file.actualDuration = durationSec;
      resolve(file);
    };
  });

  recorder.start(100);

  // Render animation frames
  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / totalFrames;

    // Background gradient animation
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, `hsl(${t * 360}, 65%, 25%)`);
    grad.addColorStop(1, `hsl(${(t * 360 + 120) % 360}, 60%, 15%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Dynamic moving floating orbs
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const x = width * 0.5 + Math.cos(t * Math.PI * 2 + i) * 160;
      const y = height * 0.5 + Math.sin(t * Math.PI * 2 + i * 1.5) * 80;
      const radGrad = ctx.createRadialGradient(x, y, 10, x, y, 60);
      radGrad.addColorStop(0, `hsla(${(t * 360 + i * 60) % 360}, 80%, 65%, 0.7)`);
      radGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(x, y, 60, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Scene title
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText('NimbusCut Demo Video', width / 2, height / 2);

    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('Select the watermark badge at top-right to remove it', width / 2, height / 2 + 30);

    // ==========================================
    // THE WATERMARK BADGE (Top-Right Corner)
    // ==========================================
    const wmX = width - 180;
    const wmY = 24;
    const wmW = 156;
    const wmH = 44;

    // Watermark background badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(wmX, wmY, wmW, wmH, 6) : ctx.rect(wmX, wmY, wmW, wmH);
    ctx.fill();
    ctx.stroke();

    // Watermark text
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = '#dc2626'; // Bright red
    ctx.textAlign = 'center';
    ctx.fillText('★ WATERMARK ★', wmX + wmW / 2, wmY + 20);

    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('SAMPLE LOGO', wmX + wmW / 2, wmY + 36);

    // Wait for frame interval (30 FPS)
    await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
  }

  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());

  return await donePromise;
}
