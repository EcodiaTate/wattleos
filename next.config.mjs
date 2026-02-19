/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable image optimization for Supabase Storage and Google avatars
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
