import { config } from './config.js';
import { Ticker } from './ticker.js';

console.log('=================================');
console.log('  CLAWNTAWN ENGINE');
console.log('  Coastal Lobster Town Simulator');
console.log('=================================');

const ticker = new Ticker(config.tickInterval);

// Placeholder handlers - will be replaced with real systems
ticker.register(async (tick) => {
  if (tick % 60 === 0) {
    console.log(`[Engine] Tick ${tick} - 1 minute elapsed`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Engine] Shutting down...');
  ticker.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Engine] Received SIGTERM, shutting down...');
  ticker.stop();
  process.exit(0);
});

// Start the engine
ticker.start();
console.log('[Engine] Running. Press Ctrl+C to stop.');
