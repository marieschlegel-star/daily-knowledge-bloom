/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  experimental: {
    serverComponentsExternalPackages: ["@notionhq/client"],
  },
};

export default nextConfig;
