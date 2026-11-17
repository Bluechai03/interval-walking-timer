// Phones disagree about the time, so a room walk counts towards a moment on the
// server's clock. To do that, each phone works out how far its own clock is
// from the server's.

export type ClockSample = {
  // Local time just before asking, and just after the answer arrived.
  sentAt: number;
  receivedAt: number;
  // What the server said the time was.
  server: number;
};

// The server's time minus ours, from the sample with the shortest round trip:
// the quickest answer is the one least blurred by the network.
export const offsetFromSamples = (samples: ClockSample[]): number | null => {
  if (samples.length === 0) return null;
  const best = samples.reduce((a, b) => (b.receivedAt - b.sentAt < a.receivedAt - a.sentAt ? b : a));
  return best.server - (best.sentAt + best.receivedAt) / 2;
};

// Asks for the server's time a few times and returns the offset, or null if no
// answer came back.
export const measureOffset = async (
  readServerTime: () => Promise<number | null>,
  tries = 4,
  now: () => number = Date.now,
): Promise<number | null> => {
  const samples: ClockSample[] = [];
  for (let i = 0; i < tries; i++) {
    const sentAt = now();
    const server = await readServerTime();
    const receivedAt = now();
    if (server !== null) samples.push({ sentAt, receivedAt, server });
  }
  return offsetFromSamples(samples);
};
