// src/components/BackgroundSelector.jsx
import React, { useState, useEffect } from 'react';

const PRESET_COLORS = [
  '#ffffff', '#000000', '#f43f5e', '#3b82f6',
  '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
];

export default function BackgroundSelector({ onChange }) {
  const [mode, setMode] = useState('transparent'); // 'transparent' | 'color'
  const [color, setColor] = useState('#ffffff');

  useEffect(() => {
    if (mode === 'transparent') {
      onChange({ type: 'transparent' });
    } else {
      onChange({ type: 'color', value: color });
    }
  }, [mode, color, onChange]);

  return (
    <div className="w-full glass-card rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Background
      </h2>

      {/* Mode Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('transparent')}
          className={`relative p-3 rounded-xl text-center border transition-all text-xs font-semibold ${
            mode === 'transparent'
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 ring-1 ring-brand-500'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          {/* Checkerboard icon */}
          <div className="mx-auto mb-1.5 w-6 h-6 rounded-md bg-checkerboard border border-slate-300 dark:border-slate-600" />
          None
        </button>

        <button
          type="button"
          onClick={() => setMode('color')}
          className={`relative p-3 rounded-xl text-center border transition-all text-xs font-semibold ${
            mode === 'color'
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 ring-1 ring-brand-500'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          <div
            className="mx-auto mb-1.5 w-6 h-6 rounded-md border border-slate-300 dark:border-slate-600 transition-colors"
            style={{ backgroundColor: color }}
          />
          Color
        </button>
      </div>

      {/* Color options — only visible in color mode */}
      {mode === 'color' && (
        <div className="space-y-3 animate-fade-in">
          {/* Preset swatches */}
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Select color ${c}`}
                className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${
                  color === c
                    ? 'border-brand-500 ring-2 ring-brand-500/30 scale-110'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Custom color picker */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer"
              aria-label="Custom background color"
            />
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase">
              {color}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
