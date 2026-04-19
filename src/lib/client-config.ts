// Client-side configuration
// These values are injected at build time from environment variables

export const clientConfig = {
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
} as const;
