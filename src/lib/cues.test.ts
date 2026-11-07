import { afterEach, describe, expect, it, vi } from "vitest";
import { playCue, playHeadsUp, spokenCue } from "./cues";

// Expected wording comes from the "Speak the target heart rate" issue (#9),
// which works out the target for the assumed age.
describe("spokenCue", () => {
  it("says the fast pace and its target heart rate", () => {
    expect(spokenCue("fast")).toBe("Fast. Target heart rate 148.");
  });

  it("says the slow pace and its target heart rate", () => {
    expect(spokenCue("slow")).toBe("Slow. Target heart rate 89.");
  });

  it("leaves the end of the walk unchanged", () => {
    expect(spokenCue("done")).toBe("Walk complete");
  });
});

describe("playCue speech", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("speaks with the most natural English voice the device has", () => {
    const spoken: { text: string; voice: { name: string } | null }[] = [];
    class FakeUtterance {
      voice: { name: string } | null = null;
      constructor(public text: string) {}
    }
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("speechSynthesis", {
      cancel: () => {},
      getVoices: () => [
        { name: "Zarvox", lang: "en-US", localService: true },
        { name: "Ava (Premium)", lang: "en-US", localService: true },
      ],
      speak: (u: FakeUtterance) => spoken.push(u),
    });

    playCue("fast", null);

    expect(spoken).toHaveLength(1);
    expect(spoken[0].text).toBe("Fast. Target heart rate 148.");
    expect(spoken[0].voice?.name).toBe("Ava (Premium)");
  });
});

describe("playCue when muted", () => {
  afterEach(() => vi.unstubAllGlobals());

  const setup = () => {
    const spoken: string[] = [];
    const vibrate = vi.fn();
    const createOscillator = vi.fn();
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
    vi.stubGlobal("speechSynthesis", {
      cancel: () => {},
      getVoices: () => [],
      speak: (u: { text: string }) => spoken.push(u.text),
    });
    vi.stubGlobal("navigator", { vibrate });
    const ctx = { currentTime: 0, resume: vi.fn(), createOscillator, createGain: vi.fn() } as unknown as AudioContext;
    return { spoken, vibrate, createOscillator, ctx };
  };

  it("makes no beep and speaks nothing, but still vibrates", () => {
    const { spoken, vibrate, createOscillator, ctx } = setup();
    playCue("fast", ctx, true);
    expect(createOscillator).not.toHaveBeenCalled();
    expect(spoken).toEqual([]);
    expect(vibrate).toHaveBeenCalledWith(300);
  });

  it("keeps the 10-second heads-up silent too, but still vibrates", () => {
    const { spoken, vibrate } = setup();
    playHeadsUp(true);
    expect(spoken).toEqual([]);
    expect(vibrate).toHaveBeenCalledWith(100);
  });
});
