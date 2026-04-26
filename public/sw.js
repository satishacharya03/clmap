self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // A minimal fetch handler is required by some browsers (like Chrome) 
  // to pass the PWA install criteria and trigger beforeinstallprompt.
});
