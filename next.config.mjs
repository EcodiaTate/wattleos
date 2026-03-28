import { withSentryConfig } from "@sentry/nextjs";

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

export default withSentryConfig(nextConfig, {
  // Upload source maps for better stack traces (requires SENTRY_AUTH_TOKEN)
  silent: true,

  // Automatically tree-shake Sentry logger in production
  disableLogger: true,
});
