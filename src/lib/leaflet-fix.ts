/**
 * Fixes Leaflet icon paths for Next.js
 * This must be imported before any Leaflet components are used
 */

// Fix for Leaflet default icon URLs in Next.js
export function fixLeafletIcons() {
  if (typeof window === 'undefined') return; // Only run on client

  // Use dynamic import to avoid SSR issues
  import('leaflet').then((L) => {
    try {
      // Delete the default _getIconUrl method that causes issues
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      
      // Set icon paths to use CDN with proper protocol
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    } catch (error) {
      console.warn('Failed to fix Leaflet icons:', error);
    }
  }).catch((error) => {
    console.warn('Failed to import Leaflet for icon fix:', error);
  });
}

// Also fix icons when Leaflet is already loaded
export function fixLeafletIconsSync(L: any) {
  if (!L || !L.Icon) return;
  
  try {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  } catch (error) {
    console.warn('Failed to fix Leaflet icons synchronously:', error);
  }
}

