'use client';

import { createContext, useContext } from 'react';
import { setRemoteSyncEnabled } from '@/stores/sync/supabase-sync';

export interface Features {
  /** Accounts, cloud sync, payments and server-side code execution. See src/lib/features.ts. */
  accounts: boolean;
}

const FeaturesContext = createContext<Features>({ accounts: false });

/**
 * Hands the server's feature switches to client components. The server is the
 * enforcement point (routes 404/redirect when a feature is off); this only
 * keeps the UI from offering what the server won't do.
 */
export function FeaturesProvider({ features, children }: { features: Features; children: React.ReactNode }) {
  // Plain module flag so non-React code (the zustand stores) can check it too.
  setRemoteSyncEnabled(features.accounts);
  return <FeaturesContext.Provider value={features}>{children}</FeaturesContext.Provider>;
}

export function useFeatures(): Features {
  return useContext(FeaturesContext);
}
