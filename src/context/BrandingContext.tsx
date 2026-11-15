import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { applyBrandTheme, BrandTheme, cacheBrandTheme, readCachedBrandTheme } from '../shared/config/brandTheme';
import { canManageBranding, getWorkspaceBranding, WorkspaceBranding } from '../services/firmBrandingService';

interface BrandingContextValue extends WorkspaceBranding {
  loading: boolean;
  canEdit: boolean;
  /** Workspace logo for the active colour mode, falling back to the other variant. Null means "use the CAATH mark". */
  logoUrl: string | null;
  /** Temporarily shows a draft theme across the workspace; pass undefined to return to the saved theme. */
  preview: (theme: BrandTheme | null | undefined) => void;
  refresh: () => Promise<void>;
}

const EMPTY: WorkspaceBranding = { theme: null, logoLightUrl: null, logoDarkUrl: null, schemaReady: true };
const BrandingContext = createContext<BrandingContextValue | null>(null);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const firmId = user?.firmId;
  const [branding, setBranding] = useState<WorkspaceBranding>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<BrandTheme | null | undefined>(undefined);
  const requestRef = useRef(0);
  const loadedFirmRef = useRef<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    const request = ++requestRef.current;
    if (!firmId) {
      loadedFirmRef.current = undefined;
      setBranding(EMPTY);
      // Platform administrators always see the CAATH identity; signed-out visitors keep the device's last workspace theme.
      if (user) { applyBrandTheme(null); cacheBrandTheme(null); }
      return;
    }
    if (loadedFirmRef.current !== firmId) setBranding(EMPTY); // never show another workspace's logo while loading
    loadedFirmRef.current = firmId;
    setLoading(true);
    try {
      const next = await getWorkspaceBranding(firmId);
      if (request !== requestRef.current) return; // a newer workspace was selected meanwhile
      setBranding(next);
      cacheBrandTheme(next.theme);
    } catch {
      // Branding is cosmetic: on failure keep whatever is painted rather than blocking the workspace.
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [firmId, user]);

  useEffect(() => { setDraft(undefined); void refresh(); }, [refresh]);

  const activeTheme = draft !== undefined ? draft : (firmId ? branding.theme : (user ? null : readCachedBrandTheme()));
  useEffect(() => { if (!loading || draft !== undefined) applyBrandTheme(activeTheme); }, [activeTheme, loading, draft]);

  const value = useMemo<BrandingContextValue>(() => {
    const mode = activeTheme?.mode ?? 'dark';
    // "Dark logo" = the variant drawn for dark backgrounds.
    const logoUrl = mode === 'dark' ? branding.logoDarkUrl ?? branding.logoLightUrl : branding.logoLightUrl ?? branding.logoDarkUrl;
    return { ...branding, loading, canEdit: canManageBranding(user), logoUrl, preview: setDraft, refresh };
  }, [activeTheme?.mode, branding, loading, refresh, user]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export const useBranding = (): BrandingContextValue => {
  const context = useContext(BrandingContext);
  if (!context) throw new Error('useBranding must be used within a BrandingProvider');
  return context;
};

/** For components that may render outside the provider (public pages, error screens). */
export const useOptionalBranding = (): BrandingContextValue | null => useContext(BrandingContext);
