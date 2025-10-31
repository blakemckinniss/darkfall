/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Disable optimization in development for faster builds
    // Enable in production for better performance
    unoptimized: process.env.NODE_ENV === "development",
    // Allow fal.ai image domain for optimization in production
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**fal.media",
      },
      {
        protocol: "https",
        hostname: "**fal.ai",
      },
    ],
  },
}

export default nextConfig
