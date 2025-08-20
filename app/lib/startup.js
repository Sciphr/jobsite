// app/lib/startup.js
// NOTE: Cron schedulers have been moved to external system cron + API endpoints
// This file is kept for any future non-cron initialization needs

let isInitialized = false;

export async function initializeApplication() {
  if (isInitialized) {
    console.log('📅 Application already initialized');
    return;
  }

  console.log('🚀 Initializing application services...');

  try {
    // Cron jobs are now handled by external system cron calling /api/cron/scheduler
    // Add any non-cron initialization here if needed in the future
    
    isInitialized = true;
    console.log('✅ Application services initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing application services:', error);
  }
}

// Auto-initialize when this module is imported (for server-side)
// But NOT during build time (when DATABASE_URL contains 'temp')
if (typeof window === 'undefined' && !process.env.DATABASE_URL?.includes('temp')) {
  initializeApplication();
}