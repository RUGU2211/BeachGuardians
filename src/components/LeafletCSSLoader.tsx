'use client';

import { useEffect } from 'react';

/**
 * Component to load Leaflet CSS from CDN
 * This bypasses Next.js CSS processing to avoid URL rewriting issues
 */
export function LeafletCSSLoader() {
  useEffect(() => {
    // Check if Leaflet CSS is already loaded
    const existingLink = document.querySelector('link[href*="leaflet"]');
    if (existingLink) {
      return; // Already loaded
    }

    // Create and append link tag for Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
    link.integrity = 'sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A==';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Cleanup function (though we typically don't remove it)
    return () => {
      // Optional: remove on unmount if needed
      // existingLink?.remove();
    };
  }, []);

  return null; // This component doesn't render anything
}

