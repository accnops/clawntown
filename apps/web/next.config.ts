import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@clawntown/shared'],
  // Use separate build directory for validation builds (doesn't interfere with dev server)
  distDir: process.env.BUILD_DIR || '.next',
};

export default nextConfig;
