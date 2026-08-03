import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@udyking/db", "@udyking/shared"],
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
};

export default nextConfig;
