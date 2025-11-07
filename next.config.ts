import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  /* config options here */
  serverExternalPackages: [
    'handlebars',
    'dotprompt',
    '@genkit-ai/core',
    'genkit',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Optimize bundle splitting
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'recharts',
      'date-fns',
    ],
  },
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimize client-side bundle
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for large libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Separate chunk for recharts (large library)
            recharts: {
              name: 'recharts',
              test: /[\\/]node_modules[\\/]recharts[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            // Separate chunk for leaflet (large library)
            leaflet: {
              name: 'leaflet',
              test: /[\\/]node_modules[\\/](leaflet|react-leaflet)[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Fix for Leaflet CSS URL rewriting issue
    // Find and modify the CSS rule to exclude Leaflet CSS from URL processing
    const rules = config.module.rules;
    const cssRule = rules.find((rule: any) => {
      return rule.test && rule.test.toString().includes('css');
    });

    if (cssRule && cssRule.oneOf) {
      cssRule.oneOf.forEach((rule: any) => {
        if (rule.test && rule.test.toString().includes('css')) {
          // For Leaflet CSS, don't process URLs
          const originalUse = rule.use;
          if (Array.isArray(originalUse)) {
            rule.use = originalUse.map((loader: any) => {
              if (typeof loader === 'object' && loader.loader && loader.loader.includes('css-loader')) {
                return {
                  ...loader,
                  options: {
                    ...loader.options,
                    url: (url: string) => {
                      // Don't process absolute URLs (like https://unpkg.com)
                      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
                        return false;
                      }
                      // Process relative URLs normally
                      return true;
                    },
                  },
                };
              }
              return loader;
            });
          }
        }
      });
    }

    return config;
  },
};

export default nextConfig;
