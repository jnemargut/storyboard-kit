import { MARKER_COLORS, ids, type MarkerColor } from "../vocab";
import { MARKER } from "../render/tokens";
import { AnyColor } from "../sketch/color";

/** A row of marker-color swatches, then any color (a hex). */
export function Swatches({ value, onChange, label = "Color" }: { value: MarkerColor | string; onChange: (c: MarkerColor | string) => void; label?: string }) {
  return (
    <span className="swatches" role="radiogroup" aria-label={label}>
      {(ids(MARKER_COLORS) as MarkerColor[]).map((c) => (
        <button key={c} role="radio" aria-checked={value === c} aria-label={c} title={c} className={`swatch${value === c ? " on" : ""}`}
          style={{ background: MARKER[c] }} onClick={() => onChange(c)} />
      ))}
      <AnyColor value={value} onPick={onChange} />
    </span>
  );
}
