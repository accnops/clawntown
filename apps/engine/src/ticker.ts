export type TickHandler = (tick: number) => Promise<void>;

export class Ticker {
  private interval: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private handlers: TickHandler[] = [];

  constructor(private intervalMs: number) {}

  register(handler: TickHandler): void {
    this.handlers.push(handler);
  }

  start(): void {
    if (this.interval) return;

    console.log(`[Ticker] Starting with ${this.intervalMs}ms interval`);

    this.interval = setInterval(async () => {
      this.tick++;
      const startTime = Date.now();

      await Promise.all(
        this.handlers.map(handler =>
          handler(this.tick).catch(err =>
            console.error(`[Ticker] Handler error:`, err)
          )
        )
      );

      const elapsed = Date.now() - startTime;
      if (elapsed > this.intervalMs * 0.8) {
        console.warn(`[Ticker] Tick ${this.tick} took ${elapsed}ms (> 80% of interval)`);
      }
    }, this.intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log(`[Ticker] Stopped at tick ${this.tick}`);
    }
  }

  getCurrentTick(): number {
    return this.tick;
  }
}
