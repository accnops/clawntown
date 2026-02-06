import { config } from './config.js';
import { Ticker } from './ticker.js';
import { updateCouncilStates } from './council/index.js';
import { checkTimeoutsAndBudgets, maybeStartNextTurn } from './conversation/index.js';
import { councilMembers } from './council/members.js';
import { broadcaster } from './realtime/index.js';

console.log('=================================');
console.log('  CLAWNTOWN ENGINE');
console.log('  Coastal Lobster Town Simulator');
console.log('=================================');

const ticker = new Ticker(config.tickInterval);

// Check council office hours every tick
ticker.register(async (tick) => {
  // Only check office hours every 60 ticks (1 minute)
  if (tick % 60 !== 0) return;

  const { wentOnline, wentOffline } = await updateCouncilStates();

  for (const member of wentOnline) {
    console.log(`[Council] ${member.name} is now online for office hours`);
    await broadcaster.broadcast('conversation', 'member_online', { memberId: member.id });
    // Start first turn if anyone is waiting
    await maybeStartNextTurn(member.id);
  }

  for (const member of wentOffline) {
    console.log(`[Council] ${member.name} has ended office hours`);
    await broadcaster.broadcast('conversation', 'member_offline', { memberId: member.id });
  }
});

// Check conversation timeouts every tick
ticker.register(async () => {
  await checkTimeoutsAndBudgets();
});

// Heartbeat log every minute
ticker.register(async (tick) => {
  if (tick % 60 === 0) {
    console.log(`[Engine] Tick ${tick} - 1 minute elapsed`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Engine] Shutting down...');
  ticker.stop();
  broadcaster.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Engine] Received SIGTERM, shutting down...');
  ticker.stop();
  broadcaster.cleanup();
  process.exit(0);
});

// Start the engine
ticker.start();
console.log('[Engine] Running. Press Ctrl+C to stop.');
console.log(`[Engine] Tick interval: ${config.tickInterval}ms`);
console.log(`[Engine] Council members: ${councilMembers.map(m => m.name).join(', ')}`);
