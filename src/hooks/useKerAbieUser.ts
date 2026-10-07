import { useKerAbieContext } from '../provider/KerAbieContext';

export function useKerAbieUser() {
  const ctx = useKerAbieContext();
  return {
    currentUser: ctx.currentUser,
    setUser: ctx.setUser,
    clearUser: ctx.clearUser,
    updateAttribute: ctx.updateAttribute,
  };
}
