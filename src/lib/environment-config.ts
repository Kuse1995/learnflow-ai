/**
 * Environment Configuration for Launch Mode
 * Supports development, staging, and production environments
 */

export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  environment: Environment;
  isProduction: boolean;
  debugLogsEnabled: boolean;
  rateLimitMultiplier: number;
  schemaLocked: boolean;
  hideExperimentalFeatures: boolean;
}

// Rate limit multipliers by environment
export const RATE_LIMIT_MULTIPLIERS: Record<Environment, number> = {
  development: 0.5, // Lower limits for testing
  staging: 1.0,     // Standard limits
  production: 1.5,  // Stricter limits
};

// Feature visibility by environment
export const EXPERIMENTAL_FEATURES = [
  'bulk_generation',
  'advanced_analytics',
  'beta_ai_models',
] as const;

/**
 * Get environment-aware rate limit
 */
export function getAdjustedRateLimit(
  baseLimit: number,
  environment: Environment
): number {
  return Math.floor(baseLimit * RATE_LIMIT_MULTIPLIERS[environment]);
}

/**
 * Check if feature is available in current environment
 */
export function isFeatureAvailableInEnvironment(
  featureKey: string,
  environment: Environment,
  hideExperimental: boolean
): boolean {
  if (!hideExperimental) return true;
  
  const isExperimental = EXPERIMENTAL_FEATURES.includes(
    featureKey as typeof EXPERIMENTAL_FEATURES[number]
  );
  
  return !isExperimental || environment === 'development';
}

/**
 * Production mode console wrapper - suppresses debug logs
 */
export const envLogger = {
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    console.info(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
};
