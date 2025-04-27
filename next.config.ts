import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  compiler: {
    // Use the React 19 JSX transform
    jsx: 'react-jsx',
  },
};

export default nextConfig;
