/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';

export type SoundCategory = 'click' | 'success' | 'notification' | 'warning' | 'error';

interface SoundSettings {
  enabled: boolean;
  volume: number;
  category: SoundCategory;
}

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: false,
  volume: 0.18,
  category: 'click',
};

const STORAGE_KEY = 'caath_sound_settings';

let audioContext: AudioContext | null = null;
let currentSettings: SoundSettings = { ...DEFAULT_SETTINGS };

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
};

const tryResumeAudioContext = async () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  } catch (e) {
    // ignore resume errors (likely due to not being in a user gesture)
  }
};

const createClickSound = (volume: number): void => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);

    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  } catch (e) {
    console.warn('Audio playback failed:', e);
  }
};

const createSuccessSound = (volume: number): void => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.setValueAtTime(900, ctx.currentTime + 0.08);

    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.warn('Audio playback failed:', e);
  }
};

const createNotificationSound = (volume: number): void => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(520, ctx.currentTime);
    oscillator.frequency.setValueAtTime(680, ctx.currentTime + 0.08);
    gainNode.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.16);
  } catch (e) {
    console.warn('Audio playback failed:', e);
  }
};

const createWarningSound = (volume: number): void => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(420, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.14);
    gainNode.gain.setValueAtTime(volume * 0.14, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.14);
  } catch (e) {
    console.warn('Audio playback failed:', e);
  }
};

export const playSound = async (category: SoundCategory = 'click'): Promise<void> => {
  if (!currentSettings.enabled) return;

  // Best-effort resume before attempting playback
  tryResumeAudioContext();

  const volume = currentSettings.volume;
  switch (category) {
    case 'click':
      createClickSound(volume);
      break;
    case 'success':
      createSuccessSound(volume);
      break;
    case 'notification':
      createNotificationSound(volume);
      break;
    case 'warning':
    case 'error':
      createWarningSound(volume);
      break;
    default:
      createClickSound(volume);
  }
};

export const setSoundEnabled = (enabled: boolean): void => {
  currentSettings.enabled = enabled;
  // persist immediately to localStorage for instant UX
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
  } catch {}
  // attempt server persist in background
  void saveSoundSettings();
};

export const setSoundVolume = (volume: number): void => {
  currentSettings.volume = Math.max(0, Math.min(1, volume));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
  } catch {}
  void saveSoundSettings();
};

export const getSoundSettings = (): SoundSettings => {
  return { ...currentSettings };
};

const saveSoundSettings = async () => {
  // Always persist to localStorage as primary fast path
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
  } catch (e) {
    // ignore localStorage errors
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          sound_enabled: currentSettings.enabled,
          sound_volume: currentSettings.volume,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    }
  } catch (e) {
    // ignore remote persist errors
  }
};

export const loadSoundSettings = async (): Promise<SoundSettings> => {
  // Try server-side user preference first if logged in, else fallback to localStorage
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_preferences')
        .select('sound_enabled, sound_volume')
        .eq('user_id', user.id)
        .single();

      if (data) {
        currentSettings = {
          enabled: data.sound_enabled ?? DEFAULT_SETTINGS.enabled,
          volume: data.sound_volume ?? DEFAULT_SETTINGS.volume,
          category: DEFAULT_SETTINGS.category,
        };
        // persist to localStorage for offline/quick load
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
        } catch {}
        return { ...currentSettings };
      }
    }
  } catch (e) {
    // fallthrough to localStorage
  }

  const stored = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  })();

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      currentSettings = { ...DEFAULT_SETTINGS };
    }
  }

  return { ...currentSettings };
};

export const IMPORTANT_ACTIONS = [
  'open',
  'save',
  'approve',
  'launch_portal',
  'create_task',
  'create_invoice',
  'create_client',
  'submit',
  'confirm',
  'delete',
] as const;

export type ImportantAction = typeof IMPORTANT_ACTIONS[number];

export const shouldPlaySound = (action: ImportantAction): boolean => {
  const silentActions: ImportantAction[] = [];
  return currentSettings.enabled && !silentActions.includes(action);
};

export const handleActionWithSound = async (
  action: ImportantAction,
  callback: () => Promise<void> | void
): Promise<void> => {
  if (shouldPlaySound(action)) {
    void playSound(action === 'approve' || action === 'confirm' ? 'success' : 'click');
  }
  await callback();
};

// Init helper: attempt to load settings and register a one-time user gesture to unlock audio
export const initSoundSystem = async (): Promise<SoundSettings> => {
  const settings = await loadSoundSettings();

  const unlock = async () => {
    try {
      await tryResumeAudioContext();
      if (settings.enabled) {
        // small audible confirmation on supported platforms
        try {
          createClickSound(settings.volume);
        } catch {}
      }
    } catch {}
    // cleanup listeners
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
  };

  // Register one-shot event handlers to unlock audio on first interaction
  window.addEventListener('click', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });

  return settings;
};
