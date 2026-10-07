import { useKerAbieContext } from '../provider/KerAbieContext';

export function useKerAbieApp() {
  const ctx = useKerAbieContext();
  return {
    appName: ctx.appName,
    appVersion: ctx.appVersion,
    appBuild: ctx.appBuild,
    setAppVersion: ctx.setAppVersion,
  };
}
