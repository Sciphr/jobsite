import fs from 'fs/promises';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'subscription.json');

// Default config if file doesn't exist
const DEFAULT_CONFIG = {
  tier: 'basic',
  last_updated: new Date().toISOString(),
  updated_by: 'default'
};

let cachedConfig = null;
let lastReadTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Read subscription configuration from file
 */
async function readSubscriptionConfig() {
  const now = Date.now();

  // Return cached config if it's still fresh
  if (cachedConfig && (now - lastReadTime) < CACHE_DURATION) {
    return cachedConfig;
  }

  try {
    const configData = await fs.readFile(CONFIG_PATH, 'utf8');
    const config = JSON.parse(configData);

    // Cache the config
    cachedConfig = config;
    lastReadTime = now;

    return config;
  } catch (error) {
    console.log('Subscription config file not found, using default:', DEFAULT_CONFIG);

    // Create default config file
    try {
      const configDir = path.dirname(CONFIG_PATH);
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    } catch (writeError) {
      console.error('Failed to create default config file:', writeError);
    }

    // Cache the default config
    cachedConfig = DEFAULT_CONFIG;
    lastReadTime = now;

    return DEFAULT_CONFIG;
  }
}

/**
 * Get current subscription tier
 */
export async function getSubscriptionTier() {
  const config = await readSubscriptionConfig();
  return config.tier || 'basic';
}

/**
 * Check if user has enterprise tier
 */
export async function hasEnterpriseTier() {
  const tier = await getSubscriptionTier();
  return tier === 'enterprise';
}

/**
 * Force refresh the config cache (call this after webhook updates)
 */
export function clearConfigCache() {
  cachedConfig = null;
  lastReadTime = 0;
}

/**
 * Get full subscription config
 */
export async function getSubscriptionConfig() {
  return await readSubscriptionConfig();
}