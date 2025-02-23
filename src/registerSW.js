export const registerSW = async () => {
  if ('serviceWorker' in navigator) {
    try {
      let deferredPrompt;

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button or banner
        const installBanner = document.createElement('div');
        installBanner.id = 'pwa-install-banner';
        installBanner.style.position = 'fixed';
        installBanner.style.bottom = '0';
        installBanner.style.left = '0';
        installBanner.style.right = '0';
        installBanner.style.padding = '1rem';
        installBanner.style.backgroundColor = '#fff';
        installBanner.style.boxShadow = '0 -2px 10px rgba(0,0,0,0.1)';
        installBanner.style.display = 'flex';
        installBanner.style.justifyContent = 'space-between';
        installBanner.style.alignItems = 'center';
        installBanner.style.zIndex = '9999';

        installBanner.innerHTML = `
          <div style="flex: 1">
            <div style="font-weight: 500">Install ExpenseGo</div>
            <div style="font-size: 0.875rem; color: #666">Add to your home screen for quick access</div>
          </div>
          <div style="display: flex; gap: 0.5rem">
            <button id="pwa-install-btn" style="background: #3B82F6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.25rem; cursor: pointer">Install</button>
            <button id="pwa-close-btn" style="background: none; border: none; padding: 0.5rem; cursor: pointer">✕</button>
          </div>
        `;

        document.body.appendChild(installBanner);

        document.getElementById('pwa-install-btn').addEventListener('click', async () => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
            installBanner.remove();
          }
        });

        document.getElementById('pwa-close-btn').addEventListener('click', () => {
          installBanner.remove();
        });
      });

      // Register service worker
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