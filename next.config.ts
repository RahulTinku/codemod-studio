import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Polyfill Node.js built-ins needed by jscodeshift in browser
      config.resolve.alias = {
        ...config.resolve.alias,
        path: "path-browserify",
        assert: "assert",
      };
      // Stub out Node-only modules that jscodeshift's optional paths may import
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        os: false,
        constants: false,
        child_process: false,
        worker_threads: false,
      };
    }
    return config;
  },
};

export default nextConfig;
