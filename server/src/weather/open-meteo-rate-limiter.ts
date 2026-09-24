import { openMeteoMinuteBudget, openMeteoWindowMs } from './open-meteo-cost.js';

export interface OpenMeteoRateLimiterOptions {
  budget?: number;
  windowMs?: number;
  now?: () => number;
  wait?: (milliseconds: number) => Promise<void>;
}

export class OpenMeteoRateLimiter {
  private readonly budget: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly wait: (milliseconds: number) => Promise<void>;

  private windowStartedAt: number;
  private usedCost = 0;
  private reservationQueue: Promise<void> = Promise.resolve();

  constructor(options: OpenMeteoRateLimiterOptions = {}) {
    this.budget = options.budget ?? openMeteoMinuteBudget;
    this.windowMs = options.windowMs ?? openMeteoWindowMs;
    this.now = options.now ?? Date.now;
    this.wait =
      options.wait ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.windowStartedAt = this.now();
  }

  reserve(callCost: number): Promise<void> {
    const reservation = this.reservationQueue.then(() =>
      this.reserveInCurrentWindow(callCost),
    );

    // A failed reservation must not permanently block later requests.
    this.reservationQueue = reservation.catch(() => undefined);

    return reservation;
  }

  private async reserveInCurrentWindow(callCost: number): Promise<void> {
    this.resetExpiredWindow();

    if (this.usedCost > 0 && this.usedCost + callCost > this.budget) {
      const remainingWindowTime = Math.max(
        0,
        this.windowMs - (this.now() - this.windowStartedAt),
      );

      await this.wait(remainingWindowTime);
      this.windowStartedAt = this.now();
      this.usedCost = 0;
    }

    this.usedCost += callCost;
  }

  private resetExpiredWindow(): void {
    if (this.now() - this.windowStartedAt >= this.windowMs) {
      this.windowStartedAt = this.now();
      this.usedCost = 0;
    }
  }
}
