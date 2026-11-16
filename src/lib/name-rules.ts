export const NAME_LIMITS = { min: 2, max: 16 } as const;

// Collapses runs of spaces and trims, so "  Anna   M " becomes "Anna M".
export const cleanName = (raw: string): string => raw.replace(/\s+/g, " ").trim();

export type NameCheck = { ok: true; name: string } | { ok: false; message: string };

// Rules for display names and, later, guest nicknames.
export const checkName = (raw: string): NameCheck => {
  const name = cleanName(raw);
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    return { ok: false, message: "Try a name with letters, numbers or spaces." };
  }
  if (name.length < NAME_LIMITS.min) {
    return { ok: false, message: `A name needs at least ${NAME_LIMITS.min} characters.` };
  }
  if (name.length > NAME_LIMITS.max) {
    return { ok: false, message: `A name can be up to ${NAME_LIMITS.max} characters.` };
  }
  return { ok: true, name };
};

const ADJECTIVES = ["Brisk", "Swift", "Jolly", "Sunny", "Merry", "Plucky", "Zippy", "Bouncy", "Breezy", "Cheery"];
const ANIMALS = ["Fox", "Heron", "Otter", "Finch", "Badger", "Hare", "Robin", "Lynx", "Panda", "Crane"];

// A friendly starting point such as "Brisk Fox", which the walker can change.
// Always within the name limits.
export const suggestNickname = (random: () => number = Math.random): string => {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
  return `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
};
