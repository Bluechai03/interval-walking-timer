import { describe, expect, it } from "vitest";
import { pickVoice, type VoiceInfo } from "./pick-voice";

const voice = (name: string, lang = "en-US", localService = true): VoiceInfo => ({
  name,
  lang,
  localService,
});

describe("pickVoice", () => {
  it("prefers a premium or enhanced English voice over a standard one", () => {
    const voices = [
      voice("Samantha"),
      voice("Ava (Premium)"),
      voice("Daniel (Enhanced)", "en-GB"),
    ];
    expect(pickVoice(voices)?.name).toBe("Ava (Premium)");
  });

  it("skips novelty voices when nothing better is installed", () => {
    const voices = [voice("Zarvox"), voice("Bubbles"), voice("Samantha")];
    expect(pickVoice(voices)?.name).toBe("Samantha");
  });

  it("returns nothing when there is no English voice, so the default is used", () => {
    expect(pickVoice([voice("Thomas", "fr-FR"), voice("Anna", "de-DE")])).toBeUndefined();
    expect(pickVoice([])).toBeUndefined();
  });
});
