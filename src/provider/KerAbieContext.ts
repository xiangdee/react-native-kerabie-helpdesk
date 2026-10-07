import { createContext, useContext } from 'react';
import { KerAbieContextValue } from '../types';

export const KerAbieContext = createContext<KerAbieContextValue | null>(null);

export function useKerAbieContext(): KerAbieContextValue {
  const ctx = useContext(KerAbieContext);
  if (!ctx) throw new Error('useKerAbieContext must be used inside <KerAbieProvider>');
  return ctx;
}
