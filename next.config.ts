import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  compiler: {
    // Enable the new JSX transform
    jsx: 'react-jsx',
  },
};

export default nextConfig;
