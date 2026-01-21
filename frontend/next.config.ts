import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.output.webassemblyModuleFilename = './../static/wasm/[modulehash].wasm';
    } else {
      config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm';
    }
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
    return config;
  },
  serverExternalPackages: ['@aztec/bb.js', '@noir-lang/backend_barretenberg'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/@aztec/bb.js/**/*.wasm'], 
    '/**/*': ['./node_modules/@aztec/bb.js/**/*.wasm'],     
  },
};

export default nextConfig;