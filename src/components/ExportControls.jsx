import React, { useState, useEffect } from 'react';
// Using native anchor download for better Chrome compatibility
import { resizeImage } from '../utils/resizeImage.js';

export default function ExportControls({
  originalFile,
  processedUrl,
  processedBlob,
  onReset,
  bgConfig,
}) {
  const [resolutionPreset, setResolutionPreset] = useState('original'); // 'original' | '1080p' | '720p' | 'custom'
  const [customWidth, setCustomWidth] = useState('');
  const [format, setFormat] = useState('png'); // 'png' | 'jpeg' | 'webp'
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isExporting, setIsExporting] = useState(false);

  // Extract dimensions from source image
  useEffect(() => {
    if (!originalFile) return;
    const url = URL.createObjectURL(originalFile);
    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setCustomWidth(img.naturalWidth.toString());
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [originalFile]);

  // Compute calculated width and height based on choice
  const aspectRatio = dimensions.width > 0 ? dimensions.height / dimensions.width : 1;

  const getComputedDimensions = () => {
    if (dimensions.width === 0) return { width: 0, height: 0 };

    if (resolutionPreset === 'original') {
      return dimensions;
    }
    if (resolutionPreset === '1080p') {
      const w = 1920;
      return { width: w, height: Math.round(w * aspectRatio) };
    }
    if (resolutionPreset === '720p') {
      const w = 1280;
      return { width: w, height: Math.round(w * aspectRatio) };
    }
    if (resolutionPreset === 'custom') {
      const parsed = parseInt(customWidth, 10);
      const validWidth = !isNaN(parsed) && parsed > 0 ? parsed : dimensions.width;
      return { width: validWidth, height: Math.round(validWidth * aspectRatio) };
    }
    return dimensions;
  };

  const currentExportSize = getComputedDimensions();

  const handleDownload = async () => {
    if (!processedUrl && !processedBlob) return;
    setIsExporting(true);
    try {
      const targetWidth = currentExportSize.width;
      const targetBlob = processedBlob || (await fetch(processedUrl).then(r => r.blob()));
      // Resize if needed
      const resizedBlob =
        resolutionPreset === 'original' && format === 'png'
          ? targetBlob
          : await resizeImage(processedUrl || targetBlob, targetWidth, format);
      // Composite with background if selected
      let finalBlob = resizedBlob;
      if (bgConfig && bgConfig.type) {
        const canvas = document.createElement('canvas');
        canvas.width = currentExportSize.width;
        canvas.height = currentExportSize.height;
        const ctx = canvas.getContext('2d');
        if (bgConfig.type === 'color') {
          ctx.fillStyle = bgConfig.value;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (bgConfig.type === 'image') {
          const bgImg = await new Promise((res, rej) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = bgConfig.value;
          });
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        }
        const procImg = await new Promise((res, rej) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = URL.createObjectURL(resizedBlob);
        });
        ctx.drawImage(procImg, 0, 0, canvas.width, canvas.height);
        const mime = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
        finalBlob = await new Promise(r => canvas.toBlob(r, mime));
      }
      const baseName = originalFile ? originalFile.name.replace(/\.[^/.]+$/, '') : 'nimbuscut';
      const fileName = `${baseName}-final.${format}`;
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to export image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto glass-card rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resolution Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Resolution
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'original', label: 'Original', desc: `${dimensions.width} × ${dimensions.height}` },
              { id: '1080p', label: 'Full HD', desc: '1080p (1920w)' },
              { id: '720p', label: 'HD', desc: '720p (1280w)' },
              { id: 'custom', label: 'Custom', desc: 'Set width' },
            ].map((res) => (
              <button
                key={res.id}
                type="button"
                onClick={() => setResolutionPreset(res.id)}
                className={`p-3 rounded-xl text-left border transition-all ${
                  resolutionPreset === res.id
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 ring-1 ring-brand-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-sm font-semibold">{res.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{res.desc}</div>
              </button>
            ))}
          </div>

          {/* Custom Width input */}
          {resolutionPreset === 'custom' && (
            <div className="pt-2 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="50"
                  max="10000"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  placeholder="Width (px)"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">px</span>
              </div>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                × {currentExportSize.height} px (auto)
              </span>
            </div>
          )}
        </div>

        {/* Format Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Export Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'png', label: 'PNG', badge: 'Transparent' },
              { id: 'webp', label: 'WebP', badge: 'Small size' },
              { id: 'jpeg', label: 'JPEG', badge: 'White BG' },
            ].map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setFormat(fmt.id)}
                className={`p-3 rounded-xl text-center border transition-all ${
                  format === fmt.id
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 ring-1 ring-brand-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-sm font-bold uppercase">{fmt.label}</div>
                <div className="text-[10px] opacity-75 mt-0.5">{fmt.badge}</div>
              </button>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 mt-3 flex items-center justify-between">
            <span>Estimated export size:</span>
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
              {currentExportSize.width} × {currentExportSize.height} px
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={handleDownload}
          disabled={isExporting}
          className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold text-sm shadow-glow flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Preparing image...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download {format.toUpperCase()}
            </>
          )}
        </button>

        <button
          onClick={onReset}
          className="py-3.5 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm transition flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Remove another image
        </button>
      </div>
    </div>
  );
}
