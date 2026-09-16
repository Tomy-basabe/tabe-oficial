// TABE Service Worker Loader
try {
  importScripts('/custom-sw.js');
} catch (e) {
  console.warn('Could not import /custom-sw.js in sw.js:', e);
}

