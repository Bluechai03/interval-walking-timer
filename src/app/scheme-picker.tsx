"use client";

import { SCHEME_IDS, SCHEME_LABELS } from "@/lib/scheme";
import { useScheme } from "@/lib/use-scheme";

// Four colour schemes, each shown as its hard and easy colours side by side. A
// swatch shows its scheme by wearing its data-scheme, so the colours are only
// written once, in globals.css.
export function SchemePicker() {
  const { scheme, setScheme } = useScheme();

  return (
    <fieldset className="flex flex-col gap-4 px-4 sm:px-0">
      <legend className="w-full border-b-2 border-page-ink pb-2 text-xl font-semibold">Colour scheme</legend>
      <div className="grid grid-cols-4 gap-3 pt-1">
        {SCHEME_IDS.map((id) => (
          <label key={id} className="flex cursor-pointer flex-col items-center gap-2">
            <input
              type="radio"
              name="colour-scheme"
              value={id}
              checked={scheme === id}
              onChange={() => setScheme(id)}
              className="peer sr-only"
            />
            <span
              data-scheme={id}
              aria-hidden="true"
              className="flex h-14 w-full overflow-hidden rounded-lg border-2 border-page-line outline-offset-2 peer-checked:border-page-ink peer-focus-visible:outline-3 peer-focus-visible:outline-page-ink"
            >
              <span className="w-1/2 bg-field-hard" />
              <span className="w-1/2 bg-field-easy" />
            </span>
            <span className="text-sm text-page-quiet peer-checked:font-semibold peer-checked:text-page-ink">
              {SCHEME_LABELS[id]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
