/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@udyking/db", "@udyking/shared"],
  outputFileTracingRoot: require("path").resolve(process.cwd(), "../.."),
};

export default nextConfig;
