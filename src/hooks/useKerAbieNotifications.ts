import { useKerAbieContext } from '../provider/KerAbieContext';

export function useKerAbieNotifications() {
  const ctx = useKerAbieContext();
  return {
    hasPermission: ctx.hasNotificationPermission,
    requestPermission: ctx.requestNotificationPermission,
    registerToken: ctx.registerNotificationToken,
  };
}
