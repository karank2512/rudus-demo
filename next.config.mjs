/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  webpack: (config) => {
    // The engine is authored with NodeNext-style ".js" import specifiers so it
    // compiles to plain ESM for node --test; teach webpack to resolve them to
    // the TypeScript sources.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
