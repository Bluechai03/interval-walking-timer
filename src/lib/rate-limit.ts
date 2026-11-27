// Lets each key through `max` times in any window of `windowMs`. It lives in the memory
// of one server instance, so it slows down someone calling in a loop and does not
// strictly stop them: another instance has its own count.
export const createRateLimit = ({ max, windowMs }: { max: number; windowMs: number }) => {
  const seen = new Map<string, number[]>();
  return {
    allow(key: string, now: number = Date.now()): boolean {
      const recent = (seen.get(key) ?? []).filter((at) => now - at < windowMs);
      if (recent.length >= max) {
        seen.set(key, recent);
        return false;
      }
      seen.set(key, [...recent, now]);
      // Keys are phones' push addresses, so forget the quiet ones instead of growing forever.
      if (seen.size > 1000) {
        for (const [other, times] of seen) if (times.every((at) => now - at >= windowMs)) seen.delete(other);
      }
      return true;
    },
  };
};
