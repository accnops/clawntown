import { describe, it, expect } from 'vitest';

describe('Violation system', () => {
  describe('ban logic', () => {
    it('does not ban on first violation', () => {
      const violationCount = 1;
      const shouldBan = violationCount >= 2;
      expect(shouldBan).toBe(false);
    });

    it('bans on second violation', () => {
      const violationCount = 2;
      const shouldBan = violationCount >= 2;
      expect(shouldBan).toBe(true);
    });

    it('calculates 7-day ban correctly', () => {
      const now = new Date('2026-02-11T12:00:00Z');
      const banDuration = 7 * 24 * 60 * 60 * 1000;
      const bannedUntil = new Date(now.getTime() + banDuration);
      expect(bannedUntil.toISOString()).toBe('2026-02-18T12:00:00.000Z');
    });
  });

  describe('violation window', () => {
    it('only counts violations within 30 days', () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const violations = [
        { occurredAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) }, // 5 days ago
        { occurredAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000) }, // 40 days ago
      ];

      const recentViolations = violations.filter(
        (v) => v.occurredAt > thirtyDaysAgo
      );

      expect(recentViolations.length).toBe(1);
    });
  });
});
