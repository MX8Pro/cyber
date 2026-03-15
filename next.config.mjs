/** @type {import('next').NextConfig} */
const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean)
  : undefined;

const nextConfig = {
  ...(allowedDevOrigins ? { allowedDevOrigins } : {}),
  images: {
    unoptimized: true
  }
};

export default nextConfig;
