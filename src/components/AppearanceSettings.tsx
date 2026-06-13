import React, { useState, useEffect } from 'react';
import { Palette, Monitor, Circle, Volume2, VolumeX } from 'lucide-react';
import { useUI, UIStyle } from '../context/UIContext';
import { cn } from '../lib/utils';
import { setSoundEnabled, setSoundVolume, initSoundSystem } from '../services/soundService';

export const AppearanceSettings: React.FC = () => {
  const { uiStyle, setUIStyle } = useUI();
  const [soundEnabled, setSoundEnabledLocal] = useState(false);
  const [soundVolume, setSoundVolumeLocal] = useState(0.18);
  const [loadingSound, setLoadingSound] = useState(true);

  useEffect(() => {
    // Initialize sound system (loads settings, sets up audio unlock handlers)
    initSoundSystem().then(settings => {
      setSoundEnabledLocal(settings.enabled);
      setSoundVolumeLocal(settings.volume);
      setLoadingSound(false);
    }).catch(() => setLoadingSound(false));
  }, []);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabledLocal(enabled);
    setSoundEnabled(enabled);
  };

  const handleVolumeChange = (volume: number) => {
    setSoundVolumeLocal(volume);
    setSoundVolume(volume);
  };

  const options: { value: UIStyle; label: string; description: string; preview: string }[] = [
    {
      value: 'sharp',
      label: 'Sharp Enterprise',
      description: 'Minimal corners, thin borders, Bloomberg/Linear inspired',
      preview: '┌──────────┐\n│  Sharp   │\n└──────────┘',
    },
    {
      value: 'rounded',
      label: 'Rounded Modern',
      description: 'Soft corners, modern feel, friendly aesthetic',
      preview: '┌──────────┐\n│ Rounded  │\n└──────────┘',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gold/10 flex items-center justify-center">
          <Palette className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Appearance</h2>
          <p className="text-sm text-slate-500">Customize the CAATH OS visual style</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setUIStyle(option.value)}
            className={cn(
              "relative p-4 text-left transition-all border-2",
              uiStyle === option.value
                ? "border-gold bg-gold/5"
                : "border-slate-800 bg-matte-black-light hover:border-slate-700"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              {uiStyle === option.value && (
                <div className="w-2 h-2 bg-gold rounded-full" />
              )}
              <span className={cn(
                "font-bold",
                uiStyle === option.value ? "text-gold" : "text-white"
              )}>
                {option.label}
              </span>
            </div>
            <p className="text-xs text-slate-500">{option.description}</p>
          </button>
        ))}
      </div>

      <div className="p-4 bg-matte-black border border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-400">Preview</span>
        </div>
        <div className={cn(
          "bg-matte-black-light p-4 border-2 transition-all",
          uiStyle === 'sharp' ? "rounded-none border-slate-600" : "rounded-2xl border-slate-600"
        )}>
          <div className="flex items-center gap-2">
            <Circle className={cn(
              "w-3 h-3",
              uiStyle === 'sharp' ? "rounded-none" : "rounded-full"
            )} />
            <span className="text-sm text-white">Sample Card</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-600">
        Your preference is saved automatically and applies across all modules.
      </p>

      {/* Sound Settings */}
      <div className="pt-6 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-800 flex items-center justify-center">
            {soundEnabled ? <Volume2 className="w-5 h-5 text-gold" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Sound Feedback</h2>
            <p className="text-sm text-slate-500">Interactive audio cues for important actions</p>
          </div>
        </div>

        {loadingSound ? (
          <div className="text-sm text-slate-500">Loading sound settings...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-matte-black border border-slate-800 rounded-xl">
              <div>
                <p className="text-sm font-bold text-white">Enable Sound Effects</p>
                <p className="text-xs text-slate-500 mt-1">Play subtle clicks on important actions</p>
              </div>
              <button
                onClick={() => handleSoundToggle(!soundEnabled)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  soundEnabled ? "bg-gold" : "bg-slate-700"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                  soundEnabled ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            {soundEnabled && (
              <div className="p-4 bg-matte-black border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-white">Volume</p>
                  <p className="text-sm text-slate-400">{Math.round(soundVolume * 100)}%</p>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={soundVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Premium cues for clicks, success, notifications, approvals, and warnings.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
