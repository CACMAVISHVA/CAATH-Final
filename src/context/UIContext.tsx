import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type UIStyle = 'sharp' | 'rounded';

interface UIContextType {
  uiStyle: UIStyle;
  setUIStyle: (style: UIStyle) => void;
  isSharp: boolean;
  // Core radius classes
  card: string;
  button: string;
  input: string;
  panel: string;
  navItem: string;
  // Additional radius classes
  badge: string;
  avatar: string;
  spinner: string;
  toggle: string;
  tableCell: string;
  modal: string;
  dropdown: string;
  tag: string;
  chip: string;
  // Spacing variants
  section: string;
  cardPadding: string;
  buttonPadding: string;
  inputPadding: string;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

const STORAGE_KEY = 'caath_ui_style';

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [uiStyle, setUIStyleState] = useState<UIStyle>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'sharp' || stored === 'rounded') return stored;
    }
    return 'sharp';
  });

  const setUIStyle = (style: UIStyle) => {
    setUIStyleState(style);
    try { localStorage.setItem(STORAGE_KEY, style); } catch {}

    // Best-effort persist to user profile in background
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_preferences')
            .upsert({ user_id: user.id, ui_style: style, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        }
      } catch (e) {
        // ignore remote persist failures
      }
    })();
  };

  const value: UIContextType = {
    uiStyle,
    setUIStyle,
    isSharp: uiStyle === 'sharp',
    // Core radius
    card: uiStyle === 'sharp' ? 'rounded-none' : 'rounded-2xl',
    button: uiStyle === 'sharp' ? 'rounded-none' : 'rounded-xl',
    input: uiStyle === 'sharp' ? 'rounded-none' : 'rounded-xl',
    panel: uiStyle === 'sharp' ? 'rounded-none' : 'rounded-2xl',
    navItem: uiStyle === 'sharp' ? 'rounded-none' : 'rounded-xl',
    // Additional radius
    badge: uiStyle === 'sharp' ? 'rounded-none' : 'rounded-full',
    avatar: uiStyle === 'sharp' ? 'rounded-none' : 'rounded-full',
    spinner: uiStyle === 'sharp' ? 'rounded-none' : 'rounded-full',
    toggle: uiStyle === 'sharp' ? 'rounded-none' : 'rounded-full',
    tableCell: uiStyle === 'sharp' ? '' : '',
    modal: uiStyle === 'sharp' ? 'rounded-none' : 'rounded-2xl',
    dropdown: uiStyle === 'sharp' ? 'rounded-none' : 'rounded-lg',
    tag: uiStyle === 'sharp' ? 'rounded-none' : 'rounded-full',
    chip: uiStyle === 'sharp' ? 'rounded-none' : 'rounded-full',
    // Spacing variants
    section: uiStyle === 'sharp' ? 'p-4' : 'p-6',
    cardPadding: uiStyle === 'sharp' ? 'p-3' : 'p-4',
    buttonPadding: uiStyle === 'sharp' ? 'px-3 py-1.5' : 'px-4 py-2',
    inputPadding: uiStyle === 'sharp' ? 'px-3 py-1.5' : 'px-4 py-2',
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

// Convenience hook to get radius class for any element
export const useRadius = () => {
  const { isSharp } = useUI();
  return {
    card: isSharp ? 'rounded-none' : 'rounded-2xl',
    button: isSharp ? 'rounded-none' : 'rounded-xl',
    input: isSharp ? 'rounded-none' : 'rounded-xl',
    panel: isSharp ? 'rounded-none' : 'rounded-2xl',
    nav: isSharp ? 'rounded-none' : 'rounded-xl',
    avatar: isSharp ? 'rounded-none' : 'rounded-full',
    badge: isSharp ? 'rounded-none' : 'rounded-full',
    tag: isSharp ? 'rounded-none' : 'rounded-full',
    chip: isSharp ? 'rounded-none' : 'rounded-full',
    modal: isSharp ? 'rounded-none' : 'rounded-2xl',
    dropdown: isSharp ? 'rounded-none' : 'rounded-lg',
    spinner: isSharp ? 'rounded-none' : 'rounded-full',
    section: isSharp ? 'p-4' : 'p-6',
  };
};