import { useKerAbieContext } from '../provider/KerAbieContext';

export function useKerAbieUser() {
  const ctx = useKerAbieContext();
  return {
    currentUser: ctx.currentUser,
    setUser: ctx.setUser,
    logout: ctx.logout,
    updateAttribute: ctx.updateAttribute,
  };
}
