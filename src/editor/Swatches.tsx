import { MARKER_COLORS, ids, type MarkerColor } from "../vocab";
import { MARKER } from "../render/tokens";

/** A row of marker-colour swatches. */
export function Swatches({ value, onChange, label = "Colour" }: { value: MarkerColor; onChange: (c: MarkerColor) => void; label?: string }) {
  return (
    <span className="swatches" role="radiogroup" aria-label={label}>
      {(ids(MARKER_COLORS) as MarkerColor[]).map((c) => (
        <button key={c} role="radio" aria-checked={value === c} aria-label={c} title={c} className={`swatch${value === c ? " on" : ""}`}
          style={{ background: MARKER[c] }} onClick={() => onChange(c)} />
      ))}
    </span>
  );
}
