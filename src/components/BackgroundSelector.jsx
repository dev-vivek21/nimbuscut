// src/components/BackgroundSelector.jsx
import React, { useState, useEffect } from 'react';

export default function BackgroundSelector({ onChange }) {
  const [color, setColor] = useState('#ffffff');

  // Notify parent when color changes
  useEffect(() => {
    onChange({ type: 'color', value: color });
  }, [color, onChange]);

  return (
    <div className="w-full max-w-3xl mx-auto glass-card rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Choose a Background</h2>
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="w-12 h-12 border rounded"
        aria-label="Select background color"
      />
    </div>
  );
}
