// Colour schemes: which colours the hard and easy phases get, and how dark the
// page is. They only change the look. The colours themselves live in globals.css,
// keyed by data-scheme, so a swatch can show a scheme just by wearing its name.

export const SCHEME_IDS = ["midnight", "ember", "forest", "mono"] as const;
export type SchemeId = (typeof SCHEME_IDS)[number];
export const DEFAULT_SCHEME: SchemeId = "midnight";

export const SCHEME_LABELS: Record<SchemeId, string> = {
  midnight: "Midnight",
  ember: "Ember",
  forest: "Forest",
  mono: "Mono",
};

export const STORAGE_KEY = "scheme";

export const isScheme = (value: unknown): value is SchemeId =>
  typeof value === "string" && (SCHEME_IDS as readonly string[]).includes(value);

// Anything unknown means the default, so an old or odd value never breaks the look.
export const parseScheme = (value: unknown): SchemeId => (isScheme(value) ? value : DEFAULT_SCHEME);

// Runs in the page's head before it is painted, so the chosen scheme is there from
// the first frame and the page never flashes the default. Written as a string, so
// it has to stand alone, and it must never throw.
export const SCHEME_BOOT_SCRIPT = `try{var s=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(${JSON.stringify(
  SCHEME_IDS,
)}.indexOf(s)>-1)document.documentElement.dataset.scheme=s}catch(e){}`;
