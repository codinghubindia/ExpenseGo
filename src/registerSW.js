export const registerSW = () => {
  if ('serviceWorker' in navigator) {
    // Let Vite PWA handle the registration
    window.addEventListener('load', () => {
      // Add offline/online handlers
      window.addEventListener('online', () => {
        console.log('Application is online');
        document.dispatchEvent(new CustomEvent('app-online'));
      });

      window.addEventListener('offline', () => {
        console.log('Application is offline');
        document.dispatchEvent(new CustomEvent('app-offline'));
      });
    });
  }
}; 