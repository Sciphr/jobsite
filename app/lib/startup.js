// app/lib/startup.js
import { weeklyDigestScheduler } from './weeklyDigestScheduler';

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
    
    isInitialized = true;
    console.log('✅ Application services initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing application services:', error);
  }
}

// Auto-initialize when this module is imported (for server-side)
if (typeof window === 'undefined') {
  initializeApplication();
}