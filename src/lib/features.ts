/**
 * Feature flags for the application
 */

export const features = {
  attom: {
    enabled: process.env.FEATURE_ATTOM_ENABLED === 'true',
  },
} as const;

export function isFeatureEnabled(feature: keyof typeof features): boolean {
  return features[feature].enabled;
}

export function requireFeature(feature: keyof typeof features): void {
  if (!isFeatureEnabled(feature)) {
    throw new Error(`Feature "${feature}" is not enabled`);
  }
}
