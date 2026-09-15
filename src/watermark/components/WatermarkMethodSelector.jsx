// src/watermark/components/WatermarkMethodSelector.jsx
import React from 'react';

export default function WatermarkMethodSelector({
  method,
  onMethodChange,
  blurRadius,
  onBlurRadiusChange,
  apiEndpoint,
  onApiEndpointChange,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          Processing Method
        </label>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Choose processing engine
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Method 1: Smart Inpaint (Client) */}
        <button
          type="button"
          onClick={() => onMethodChange('client-inpaint')}
          className={`relative p-3 rounded-xl border text-left transition-all ${
            method === 'client-inpaint'
              ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 ring-1 ring-brand-500'
              : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>🎨</span> Smart Inpaint
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase">
              Client-Side
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Interpolates boundary pixels across the watermark to blend into surrounding colors. 100% private.
          </p>
        </button>

        {/* Method 2: Blur & Obscure (Client) */}
        <button
          type="button"
          onClick={() => onMethodChange('client-blur')}
          className={`relative p-3 rounded-xl border text-left transition-all ${
            method === 'client-blur'
              ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 ring-1 ring-brand-500'
              : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>💧</span> Blur Obscure
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase">
              Client-Side
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Applies high-density Gaussian blur over the box to hide the logo or watermark text.
          </p>
        </button>

        {/* Method 3: Cloud AI / Serverless Backend */}
        <button
          type="button"
          onClick={() => onMethodChange('backend-api')}
          className={`relative p-3 rounded-xl border text-left transition-all ${
            method === 'backend-api'
              ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 ring-1 ring-brand-500'
              : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>⚡</span> Backend / AI API
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-violet-500/15 text-violet-600 dark:text-violet-400 uppercase">
              Server
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Connects to your custom backend or serverless AI inpainting endpoint via clean service API.
          </p>
        </button>
      </div>

      {/* Sub-options based on selected method */}
      {method === 'client-blur' && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-4 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Blur Intensity:
          </span>
          <input
            type="range"
            min={6}
            max={36}
            value={blurRadius}
            onChange={(e) => onBlurRadiusChange(parseInt(e.target.value, 10))}
            className="flex-1 accent-brand-500 cursor-pointer"
          />
          <span className="font-mono text-slate-500 dark:text-slate-400 w-10 text-right">
            {blurRadius}px
          </span>
        </div>
      )}

      {method === 'backend-api' && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
          <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Backend Service Endpoint</span>
            <span className="text-[10px] text-slate-400 font-normal">
              POST multipart/form-data
            </span>
          </div>
          <input
            type="url"
            placeholder={import.meta.env.VITE_WATERMARK_API_URL || 'https://api.yourdomain.com/remove-watermark'}
            value={apiEndpoint}
            onChange={(e) => onApiEndpointChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Isolated in <code className="font-mono text-brand-600 dark:text-brand-400">src/services/videoWatermarkService.js</code>. Accepts video file and normalized selection coordinates.
          </p>
        </div>
      )}
    </div>
  );
}
