export const registerSW = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const { registerSW } = await import('virtual:pwa-register');
      registerSW({
        onOfflineReady() {
          console.log('App ready to work offline');
        },
        immediate: true
      });
    } catch (error) {
      console.warn('PWA registration failed:', error);
    }
  }
}; 