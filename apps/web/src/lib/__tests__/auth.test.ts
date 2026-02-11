import { describe, it, expect } from 'vitest';

describe('Auth utilities', () => {
  describe('needsCaptcha', () => {
    it('returns true when no previous captcha', () => {
      const lastCaptchaAt = null;
      const result = checkNeedsCaptcha(lastCaptchaAt);
      expect(result).toBe(true);
    });

    it('returns true when captcha older than 1 hour', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = checkNeedsCaptcha(twoHoursAgo);
      expect(result).toBe(true);
    });

    it('returns false when captcha within 1 hour', () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const result = checkNeedsCaptcha(thirtyMinutesAgo);
      expect(result).toBe(false);
    });
  });
});

function checkNeedsCaptcha(lastCaptchaAt: Date | null): boolean {
  if (!lastCaptchaAt) return true;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return lastCaptchaAt < oneHourAgo;
}
