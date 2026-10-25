// Wait briefly for first-visit control, so even the initial image probe is cached.
let ready: Promise<void> | undefined;
export function prepareCoverCache(): Promise<void> {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve();
  return ready ??= new Promise(resolve => {
    const workers = navigator.serviceWorker;
    const finish = () => {
      clearTimeout(timer);
      workers.removeEventListener('controllerchange', controlled);
      resolve();
    };
    const controlled = () => { if (workers.controller) finish(); };
    const timer = setTimeout(finish, 2000);
    workers.addEventListener('controllerchange', controlled);
    const base = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/`;
    void workers.register(`${base}cover-worker.js`, { scope: base, updateViaCache: 'none' })
      .then(controlled).catch(finish);
  });
}
export function forgetCachedCover(url: string) {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.controller?.postMessage({ type: 'cover-failed', url });
  }
}
