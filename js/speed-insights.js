// Initialize Vercel Speed Insights for vanilla JavaScript
// This script will be loaded as a module to import the Speed Insights package

import { injectSpeedInsights } from '@vercel/speed-insights';

// Initialize Speed Insights with default configuration
// The script will automatically track page performance metrics
injectSpeedInsights({
  // Enable debug mode in development
  debug: true,
  
  // Optional: Add beforeSend hook to filter or modify events
  // beforeSend: (event) => {
  //   // You can modify the event here or return null to prevent sending
  //   return event;
  // },
  
  // Optional: Sample rate (1 = 100% of events, 0.5 = 50% of events)
  // sampleRate: 1,
});

console.log('[Speed Insights] Initialized successfully');
