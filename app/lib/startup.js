// app/lib/startup.js
import { weeklyDigestScheduler } from './weeklyDigestScheduler';
import { autoArchiveScheduler } from './autoArchiveScheduler';
import { autoProgressScheduler } from './autoProgressScheduler';
import { autoRejectScheduler } from './autoRejectScheduler';
import { staleApplicationScheduler } from './staleApplicationScheduler';
import { dataRetentionScheduler } from './dataRetentionScheduler';

let isInitialized = false;

export async function initializeApplication() {
  if (isInitialized) {
    console.log('📅 Application already initialized');
    return;
  }

  console.log('🚀 Initializing application services...');

  try {
    // Start the weekly digest scheduler
    await weeklyDigestScheduler.start();
    
    // Start the auto-archive scheduler
    await autoArchiveScheduler.start();
    
    // Start the auto-progress scheduler
    await autoProgressScheduler.start();
    
    // Start the auto-reject scheduler
    await autoRejectScheduler.start();
    
    // Start the stale application scheduler
    await staleApplicationScheduler.start();
    
    // Start the data retention scheduler
    await dataRetentionScheduler.start();
    
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