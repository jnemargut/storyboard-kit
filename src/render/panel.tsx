import type { ReactNode } from "react";
import { withCrop } from "../sketch/crop";
import { richLines } from "../sketch/rich";
import type { Board, LayoutOverride, MarkupStroke, Panel, SceneImage, ScenePanel, TimePanel } from "../types";
import { isScene } from "../types";
import { Character } from "./character";
import { DEVICE_DEFS, Device, type Rect } from "./devices";
import { ADV_TITLE, stackOrder, captionBox, heldDeviceOf, layoutPanel, placeBubbles, specialGeometry, toPanel, wrap, textWidth, type AssetResolver, type CharPlaced, type DevPlaced, type PanelLayout } from "./layout";
import { BubbleShape, BubbleText, Callout, CaptionShape, CaptionText, GestureMark } from "./overlays";
import { SceneBack, SceneFront, resolveScene } from "./scenes";
import { ShapeMark, shapeId, shapeTransform } from "./shapes";
import { MarkupStrokes } from "../sketch/shapes";
import { C, FLOOR_Y, FONT, MARKER, PANEL_H, PANEL_W, SKIN, OUTFIT_FILL } from "./tokens";
import type { Pt } from "./rig";

export interface RenderOptions {
  asset: AssetResolver;
  /** Unprocessed images (brand logo). Falls back to `asset`. */
  raw?: AssetResolver;
  /** Images placed in a scene, sketchified in grays. Falls back to `raw`, then `asset`. */
  sketch?: AssetResolver;
  /** Crit markup strokes can be clicked (the play-mode eraser). */
  markupHit?: boolean;
  /** Scene-authoring guides: a 50-unit grid and every mark, labeled (the `scene` preview command). */
  guides?: boolean;
  /** Draw crit markup. Only play mode does; the editor and exports leave it out. */
  showMarkup?: boolean;
  /** Wobble filter on (off while dragging in the editor). */
  wobble?: boolean;
}

const ink = C.ink;
const clip = (pid: string, el: string) => `sb-${pid}-${el.replace(/[^a-z0-9-]/gi, "_")}`;

function CharEl({ c, pid, cam, layout }: { c: CharPlaced; pid: string; cam: { s: number }; layout?: ScenePanel["layout"] }) {
  if (c.ov.hidden) return null;
  const dx = (c.ov.dx ?? 0) / cam.s, dy = (c.ov.dy ?? 0) / cam.s;
  const k = c.s * (c.ov.scale ?? 1);
  const hov = layout?.[`${c.id}.device`] ?? {};
  const hk = cam.s * k;
  const held = c.held && !hov.hidden ? (
    <g data-el={`${c.id}.device`} data-kind="device" data-drop={`char:${c.id}`}
      transform={`translate(${c.held.cx + (hov.dx ?? 0) / hk} ${c.held.cy + (hov.dy ?? 0) / hk}) rotate(${c.held.rot + (hov.rotate ?? 0)}) scale(${c.held.scale * (hov.scale ?? 1)})`}>
      <Device type={c.held.type} href={c.held.href} product={c.held.product} clipId={clip(pid, `${c.id}-held`)} />
    </g>
  ) : undefined;
  return (
    <g data-el={c.id} data-kind="character" transform={`translate(${c.x + dx} ${c.y + dy}) rotate(${c.ov.rotate ?? 0}) scale(${k})`}>
      <Character f={c.fig} cast={c.cast} mood={c.mood} held={held} chair={c.chair} />
    </g>
  );
}

function DevEl({ d, pid, cam }: { d: DevPlaced; pid: string; cam: { s: number } }) {
  if (d.ov.hidden) return null;
  const dx = (d.ov.dx ?? 0) / cam.s, dy = (d.ov.dy ?? 0) / cam.s;
  return (
    <g data-el={d.id} data-kind="device" data-drop={`device:${d.id}`} transform={`translate(${d.x + dx} ${d.y + dy}) rotate(${d.rot + (d.ov.rotate ?? 0)}) scale(${d.s * (d.ov.scale ?? 1)})${d.tilt ? ` skewY(${d.tilt === "left" ? -14 : 14}) scale(0.82 1)` : ""}`}>
      <Device type={d.type} href={d.href} product={d.product} clipId={clip(pid, d.id)} />
    </g>
  );
}

/** A placed picture: center (x, y), fit inside w × h, then the designer's move / scale / rotate. */
function ImageEl({ id, im, ov, opts, wrap }: { id: string; im: SceneImage; ov: LayoutOverride; opts: RenderOptions; wrap?: string }) {
  if (ov.hidden) return null;
  const w = im.w ?? 120, h = im.h ?? 90;
  const cx = (im.x ?? PANEL_W / 2) + (ov.dx ?? 0), cy = (im.y ?? PANEL_H / 2) + (ov.dy ?? 0);
  const src = withCrop(im.src, im.crop);
  const href = im.sketch === false ? (opts.raw ?? opts.asset)(src) : (opts.sketch ?? opts.raw ?? opts.asset)(src);
  const body = (
    <g data-el={id} data-kind="image" transform={`translate(${cx} ${cy}) rotate(${ov.rotate ?? 0}) scale(${ov.scale ?? 1})`}>
      {href
        ? <image href={href} x={-w / 2} y={-h / 2} width={w} height={h} preserveAspectRatio="xMidYMid meet" />
        : <g><rect x={-w / 2} y={-h / 2} width={w} height={h} fill={C.g1} stroke={ink} strokeWidth={1.6} strokeDasharray="5 4" /><text y={4} textAnchor="middle" fontFamily={FONT.hand} fontSize={12} fill={C.g7}>image not found</text></g>}
    </g>
  );
  return wrap ? <g transform={wrap}>{body}</g> : body;
}

function SpecialArt({ L, pid, board, panel }: { L: PanelLayout; pid: string; board: Board; panel: ScenePanel }) {
  const sp = L.special!;
  const g = specialGeometry(sp);
  const ownerId = sp.kind === "ots" ? sp.char.id : sp.device.id;
  const owner = L.chars.find((c) => c.id === ownerId);
  const skin = SKIN[owner?.cast.skin ?? "tone-2"];
  const sleeve = OUTFIT_FILL[owner?.cast.outfit ?? "jacket"] ?? C.g4;
  const devType = sp.kind === "ots" ? sp.device?.type : sp.device.type;
  const href = sp.kind === "ots" ? sp.device?.href : sp.device.href;
  const product = sp.kind === "ots" ? (sp.device?.product ?? true) : sp.device.product;
  const devId = sp.kind === "ots" ? (sp.device?.id ?? sp.char.id) : sp.device.id;
  const devOv = panel.layout?.[`${devId}.screen`] ?? {};
  const dcx = g.dcx + (devOv.dx ?? 0), dcy = g.dcy + (devOv.dy ?? 0), ds = g.ds * (devOv.scale ?? 1);
  const def = devType ? DEVICE_DEFS[devType] : undefined;
  // hands only when someone is actually holding it; a phone on a table is shown on its own
  const handheld = !!owner?.held && !!devType && ["phone", "tablet", "watch"].includes(devType);
  const arm = (from: Pt, to: Pt, w: number) => (
    <g><line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={ink} strokeWidth={w + 4} strokeLinecap="round" /><line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={sleeve} strokeWidth={w} strokeLinecap="round" /></g>
  );
  const hand = (p: Pt, r: number) => <circle cx={p[0]} cy={p[1]} r={r} fill={skin} stroke={ink} strokeWidth={2} />;
  const device = devType && (
    <g data-el={`${devId}.screen`} data-kind="device" data-drop={owner ? `char:${owner.id}` : `device:${devId}`} transform={`translate(${dcx} ${dcy}) rotate(${devOv.rotate ?? (sp.kind === "ots" ? 4 : 0)}) scale(${ds})`}>
      <Device type={devType} href={href} product={product} clipId={clip(pid, `${devId}-big`)} />
    </g>
  );
  const dw = def ? (def.w * ds) / 2 : 0, dh = def ? (def.h * ds) / 2 : 0;
  // a laptop that nobody's holding sits on a desk, rather than floating in the air
  const deskTop = devType === "laptop" ? dcy + 8 * ds : devType === "desktop" ? dcy + 56 * ds : undefined;
  const desk = deskTop !== undefined && (
    <g pointerEvents="none">
      <path d={`M-10 ${deskTop} H${PANEL_W + 10} V${PANEL_H + 10} H-10 Z`} fill={C.g2} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      <path d={`M-10 ${deskTop + 8} H${PANEL_W + 10}`} stroke={C.g5} strokeWidth={1.2} />
    </g>
  );
  if (sp.kind === "ots") {
    const c = sp.char;
    const ov = panel.layout?.[c.id] ?? {};
    const S = g.S * (ov.scale ?? 1);
    const cx = g.charX + (ov.dx ?? 0), cy = g.charY + (ov.dy ?? 0);
    // seen from behind, the near arm reaches forward, away from us: the body hides the upper arm, so only the
    // forearm shows, coming out from the side of the body up to the hand gripping the phone's lower corner
    const j = c.fig.j;
    const nearLeft = j.shL[0] > j.shR[0]; // the shoulder on the phone's side
    const sh = nearLeft ? j.shL : j.shR;
    const shoulder: Pt = [cx + sh[0] * S, cy + sh[1] * S];
    const handP: Pt = [dcx - dw * 0.55, dcy + dh * 0.8];
    const elbow: Pt = [shoulder[0] - 14, shoulder[1] + 62]; // tucked in at the waist, behind the body
    return (
      <g>
        {desk}
        {handheld && <g data-el={c.id} data-kind="character">{arm(elbow, handP, 15)}</g>}
        <g data-el={c.id} data-kind="character" transform={`translate(${cx} ${cy}) scale(${S})`}>
          <Character f={c.fig} cast={c.cast} mood={c.mood} hideArm={handheld ? (nearLeft ? "left" : "right") : undefined} />
        </g>
        {device}
        {handheld && (
          <g data-el={c.id} data-kind="character">
            {/* just the back of the hand on the phone's edge: no fingers, the touch mark shows the tap */}
            <path d={`M${handP[0] - 12} ${handP[1] + 10} Q${handP[0] - 14} ${handP[1] - 8} ${handP[0] - 2} ${handP[1] - 12} Q${handP[0] + 10} ${handP[1] - 12} ${handP[0] + 11} ${handP[1] + 2} Q${handP[0] + 8} ${handP[1] + 14} ${handP[0] - 12} ${handP[1] + 10} Z`} fill={skin} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
          </g>
        )}
      </g>
    );
  }
  if (sp.kind === "screen") {
    const handP: Pt = [dcx + dw - 4, dcy + dh * 0.3];
    return <g>{desk}{handheld && arm([PANEL_W + 20, PANEL_H + 20], [handP[0] + 10, handP[1] + 14], 22)}{device}{handheld && hand(handP, 14)}</g>;
  }
  // pov: two hands
  const lh: Pt = [dcx - dw + 2, dcy + dh * 0.35], rh: Pt = [dcx + dw - 2, dcy + dh * 0.35];
  return (
    <g>
      {desk}
      {handheld && <>{arm([-20, PANEL_H + 20], [lh[0] - 8, lh[1] + 10], 24)}{arm([PANEL_W + 20, PANEL_H + 20], [rh[0] + 8, rh[1] + 10], 24)}</>}
      {device}
      {handheld && <>{hand(lh, 14)}{hand(rh, 14)}</>}
    </g>
  );
}

/** Grid and marks over a scene, so whoever drew it can check where things landed. */
function Guides({ board, scene }: { board: Board; scene: string }) {
  const def = resolveScene(board, scene);
  const blue = MARKER.blue;
  return (
    <g data-guides pointerEvents="none">
      {Array.from({ length: 7 }, (_, k) => (k + 1) * 50).map((x) => <g key={`x${x}`}><path d={`M${x} 0 V${PANEL_H}`} stroke={blue} strokeOpacity={0.25} strokeWidth={0.8} /><text x={x + 2} y={9} fontSize={8} fill={blue}>{x}</text></g>)}
      {[50, 100, 150, 200].map((y) => <g key={`y${y}`}><path d={`M0 ${y} H${PANEL_W}`} stroke={blue} strokeOpacity={0.25} strokeWidth={0.8} /><text x={2} y={y - 2} fontSize={8} fill={blue}>{y}</text></g>)}
      <path d={`M0 ${FLOOR_Y} H${PANEL_W}`} stroke={blue} strokeOpacity={0.6} strokeDasharray="4 3" /><text x={2} y={FLOOR_Y - 3} fontSize={8} fill={blue}>floor {FLOOR_Y}</text>
      {Object.entries(def.marks).map(([name, m]) => (
        <g key={name}>
          <circle cx={m.x} cy={m.y} r={4} fill={blue} />
          <text x={m.x} y={Math.min(PANEL_H - 4, m.y + 16)} textAnchor="middle" fontSize={10} fontWeight="bold" fill={blue} stroke={C.paper} strokeWidth={3} paintOrder="stroke">{name}{m.facing ? ` (faces ${m.facing})` : ""}{m.seated ? " (sits)" : ""}</text>
        </g>
      ))}
    </g>
  );
}

function ScenePanelBody({ board, panel, opts }: { board: Board; panel: ScenePanel; opts: RenderOptions }) {
  const pid = panel.id;
  const ts = board.page?.textScale ?? 1;
  const b = board.page?.brand;
  // a panel can name its own store (or blank the sign) instead of the board-wide brand
  const brand = panel.sign === false ? undefined
    : typeof panel.sign === "string" && panel.sign ? { name: panel.sign }
    : b && (b.name || b.logo) ? { name: b.name, logoHref: b.logo ? (opts.raw ?? opts.asset)(b.logo) : undefined } : undefined;
  const L = layoutPanel(board, panel, opts.asset);
  const cam = L.camera;
  const wob = opts.wobble === false ? undefined : "url(#sb-wobble)";

  // overlays
  const reserved: Rect[] = [];
  let cap: ReturnType<typeof captionBox> | undefined;
  if (panel.caption) {
    const ov = panel.layout?.caption ?? {};
    cap = captionBox(panel.caption, ts * (ov.scale ?? 1));
    // don't cover the shop's sign: if the brand is showing where the caption would go, drop to the bottom corner
    const sign = brand ? resolveScene(board, panel.scene).sign : undefined;
    if (sign && ov.dx === undefined && ov.dy === undefined) {
      const sr = { x: sign.x * cam.s + cam.tx, y: sign.y * cam.s + cam.ty, w: sign.w * cam.s, h: sign.h * cam.s };
      if (cap.x < sr.x + sr.w && sr.x < cap.x + cap.w && cap.y < sr.y + sr.h && sr.y < cap.y + cap.h) cap = { ...cap, y: PANEL_H - cap.h - 7 };
    }
    cap = { ...cap, x: cap.x + (ov.dx ?? 0), y: cap.y + (ov.dy ?? 0) };
    reserved.push(cap);
  }
  for (const a of Object.values(L.anchors)) if (a.screen && a.screen.w > 14) reserved.push(a.screen);
  const bubbles = placeBubbles(panel, L.anchors, reserved, ts);
  const taken: Rect[] = [...reserved, ...bubbles];
  const callouts = (panel.callouts ?? []).map((co, i) => {
    const id = co.id ?? `callout-${i}`;
    const size = 12.5 * ts * (panel.layout?.[id]?.scale ?? 1);
    const lines = wrap(co.text, size, 120 * Math.max(1, size / 14));
    const w = Math.max(...lines.map((l) => textWidth(l, size))) + 12, h = lines.length * size * 1.15 + 9;
    const a = co.target ? L.anchors[co.target] : undefined;
    const pov = panel.layout?.[`${id}.point`];
    let to: Pt | undefined = a ? (a.screen ? [a.screen.x + a.screen.w / 2, a.screen.y + a.screen.h / 2] : [a.box.x + a.box.w / 2, a.box.y + 10]) : undefined;
    const cands: Pt[] = [[PANEL_W - w - 8, 8], [PANEL_W - w - 8, PANEL_H - h - 8], [8, PANEL_H - h - 8], [8, 8], [PANEL_W / 2 - w / 2, PANEL_H - h - 8]];
    const fits = (p: Pt) => !taken.some((t) => p[0] < t.x + t.w + 4 && t.x < p[0] + w + 4 && p[1] < t.y + t.h + 4 && t.y < p[1] + h + 4);
    const p = cands.find(fits) ?? cands[0];
    const ov = panel.layout?.[id] ?? {};
    const r = { x: p[0] + (ov.dx ?? 0), y: p[1] + (ov.dy ?? 0), w, h };
    // a pointer with no target starts just below the box; the designer's drag offset moves it anywhere
    if (!to && pov) to = [r.x + r.w / 2, r.y + r.h + 36];
    if (to && pov) to = [to[0] + (pov.dx ?? 0), to[1] + (pov.dy ?? 0)];
    taken.push(r);
    return { id, r, lines, size, to, src: co.text };
  });
  const gestures = (panel.gestures ?? []).map((gs, i) => {
    const id = gs.id ?? `gesture-${i}`;
    const target = gs.on ?? Object.keys(L.anchors).find((k) => L.anchors[k].screen);
    const screen = target ? L.anchors[target]?.screen : undefined;
    const product = target ? L.anchors[target]?.product !== false : true;
    const ov = panel.layout?.[id] ?? {};
    return { id, g: gs, screen, ov, product };
  });

  // shapes live in panel units; inside the camera group they undo its transform so layers can interleave
  const unCam = `scale(${1 / cam.s}) translate(${-cam.tx} ${-cam.ty})`;
  const byLayer = (behind: boolean) => stackOrder(L, panel).filter((it) => it.behind === behind).map((it) => {
    if (it.kind === "device") { const d = L.devices.find((x) => x.id === it.id)!; return <DevEl key={d.id} d={d} pid={pid} cam={cam} />; }
    if (it.kind === "character") { const c = L.chars.find((x) => x.id === it.id)!; return <CharEl key={c.id} c={c} pid={pid} cam={cam} layout={panel.layout} />; }
    if (it.kind === "image") return <ImageEl key={it.id} id={it.id} im={panel.images![it.index!]} ov={panel.layout?.[it.id] ?? {}} opts={opts} wrap={unCam} />;
    const sh = panel.shapes![it.index!], ov = panel.layout?.[it.id] ?? {};
    return !ov.hidden && sh.points?.length >= 1 && <g key={it.id} transform={unCam}><g data-el={it.id} data-kind="shape" transform={shapeTransform(sh, ov)}><ShapeMark s={sh} /></g></g>;
  });

  return (
    <>
      <g filter={wob}>
        {L.special ? (
          <>
            <g opacity={0.35} transform={`translate(${cam.tx} ${cam.ty}) scale(${cam.s})`}><SceneBack id={panel.scene} brand={brand} board={board} /><SceneFront id={panel.scene} board={board} /></g>
            <SpecialArt L={L} pid={pid} board={board} panel={panel} />
          </>
        ) : (
          <g transform={`translate(${cam.tx} ${cam.ty}) scale(${cam.s})`}>
            <SceneBack id={panel.scene} brand={brand} board={board} />
            {byLayer(true)}
            <SceneFront id={panel.scene} board={board} />
            {byLayer(false)}
          </g>
        )}
        {opts.guides && (panel.shot ?? "wide") === "wide" && !panel.layout?.__camera && <Guides board={board} scene={panel.scene} />}
        {L.special && (panel.images ?? []).map((im, i) => { const id = im.id ?? `image-${i}`; return <ImageEl key={id} id={id} im={im} ov={panel.layout?.[id] ?? {}} opts={opts} />; })}
        {L.special && (panel.shapes ?? []).map((sh, i) => {
          const id = shapeId(sh, i), ov = panel.layout?.[id] ?? {};
          return !ov.hidden && sh.points?.length >= 1 && <g key={id} data-el={id} data-kind="shape" transform={shapeTransform(sh, ov)}><ShapeMark s={sh} /></g>;
        })}
        {cap && !(panel.layout?.caption?.hidden) && <g data-el="caption" data-kind="caption"><CaptionShape r={cap} /></g>}
        {bubbles.map((b) => !(panel.layout?.[b.id]?.hidden) && <g key={b.id} data-el={b.id} data-kind="bubble"><BubbleShape b={b} /></g>)}
      </g>
      {gestures.map(({ id, g, screen, ov, product }) => !ov.hidden && screen && (
        <g key={id} data-el={id} data-kind="gesture" transform={`translate(${ov.dx ?? 0} ${ov.dy ?? 0})`}><GestureMark g={g} screen={screen} product={product} /></g>
      ))}
      {cap && !(panel.layout?.caption?.hidden) && <g data-el="caption" data-kind="caption"><CaptionText r={cap} lines={cap.lines} size={cap.size} src={panel.caption} /></g>}
      {bubbles.map((b) => !(panel.layout?.[b.id]?.hidden) && <g key={b.id} data-el={b.id} data-kind="bubble"><BubbleText b={b} /></g>)}
      {callouts.map((c) => !(panel.layout?.[c.id]?.hidden) && <g key={c.id} data-el={c.id} data-kind="callout"><Callout r={c.r} lines={c.lines} size={c.size} to={c.to} pointId={`${c.id}.point`} src={c.src} /></g>)}
    </>
  );
}

function TimeIcon({ icon, x, y }: { icon: TimePanel["icon"]; x: number; y: number }) {
  const s = { stroke: ink, strokeWidth: 2.6, fill: "none", strokeLinecap: "round" as const };
  switch (icon) {
    case "calendar":
      return <g><rect x={x - 28} y={y - 26} width={56} height={54} rx={4} fill={C.paper} stroke={ink} strokeWidth={2.6} /><path d={`M${x - 28} ${y - 10} h56 M${x - 14} ${y - 32} v12 M${x + 14} ${y - 32} v12`} {...s} />{[0, 1, 2].map((c) => [0, 1].map((rr) => <rect key={`${c}${rr}`} x={x - 20 + c * 14} y={y - 4 + rr * 13} width={8} height={8} rx={1} fill={c === 2 && rr === 1 ? ink : "none"} stroke={ink} strokeWidth={1.6} />))}</g>;
    case "sun":
      return <g><circle cx={x} cy={y} r={16} fill={C.g2} stroke={ink} strokeWidth={2.6} />{Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return <path key={i} d={`M${x + Math.cos(a) * 22} ${y + Math.sin(a) * 22} L${x + Math.cos(a) * 30} ${y + Math.sin(a) * 30}`} {...s} />; })}</g>;
    case "moon":
      return <path d={`M${x + 6} ${y - 26} a26 26 0 1 0 18 42 a20 20 0 1 1 -18 -42 z`} fill={C.g4} stroke={ink} strokeWidth={2.6} />;
    default:
      return <g><circle cx={x} cy={y} r={28} fill={C.paper} stroke={ink} strokeWidth={2.8} /><path d={`M${x} ${y} V${y - 19} M${x} ${y} L${x + 13} ${y + 7}`} {...s} /><path d={`M${x} ${y - 28} v4 M${x + 28} ${y} h-4 M${x} ${y + 28} v-4 M${x - 28} ${y} h4`} {...s} strokeWidth={2} /><path d={`M${x + 32} ${y - 26} q8 -6 14 2 M${x + 36} ${y - 34} q10 -4 16 6`} {...s} strokeWidth={2} /></g>;
  }
}

function CardBody({ panel, ts }: { panel: Panel; ts: number }) {
  const ov = (id: string) => panel.layout?.[id] ?? {};
  const k = (id: string) => ts * (ov(id).scale ?? 1);
  const shift = (id: string) => `translate(${ov(id).dx ?? 0} ${ov(id).dy ?? 0})`;
  if (panel.type === "title") {
    const tsz = 30 * k("title");
    const lines = wrap(panel.title.toUpperCase(), tsz, 350, ADV_TITLE);
    const lh = tsz * 1.13;
    const ssz = 16 * k("subtitle");
    const top = 118 - ((lines.length - 1) * lh) / 2;
    return (
      <>
        <g data-el="title" data-kind="text" transform={shift("title")}>
          <text textAnchor="middle" fontFamily={FONT.title} fontSize={tsz} fill={ink}>{richLines(panel.title.toUpperCase(), lines, ink, tsz).map((l, i) => <tspan key={i} x={200} y={top + i * lh}>{l}</tspan>)}</text>
        </g>
        {panel.subtitle && (
          <g data-el="subtitle" data-kind="text" transform={shift("subtitle")}>
            <text textAnchor="middle" fontFamily={FONT.hand} fontSize={ssz} fill={C.g8}>{richLines(panel.subtitle, wrap(panel.subtitle, ssz, 340), C.g8, ssz).map((l, i) => <tspan key={i} x={200} y={top + lines.length * lh + ssz * 0.4 + i * ssz * 1.2}>{l}</tspan>)}</text>
          </g>
        )}
      </>
    );
  }
  if (panel.type === "time") {
    const tsz = 24 * k("text");
    const lines = wrap(panel.text.toUpperCase(), tsz, 350, ADV_TITLE);
    return (
      <>
        <g data-el="icon" data-kind="text" transform={`${shift("icon")} translate(200 96) scale(${ov("icon").scale ?? 1}) translate(-200 -96)`}><TimeIcon icon={panel.icon} x={200} y={96} /></g>
        <g data-el="text" data-kind="text" transform={shift("text")}>
          <text textAnchor="middle" fontFamily={FONT.title} fontSize={tsz} fill={ink}>{richLines(panel.text.toUpperCase(), lines, ink, tsz).map((l, i) => <tspan key={i} x={200} y={150 + tsz * 0.85 + i * tsz * 1.15}>{l}</tspan>)}</text>
        </g>
      </>
    );
  }
  if (panel.type === "text") {
    const tsz = 19 * k("text");
    const lines = wrap(panel.text, tsz, 340);
    const top = 136 - ((lines.length - 1) * tsz * 1.2) / 2;
    return (
      <g data-el="text" data-kind="text" transform={shift("text")}>
        <text textAnchor="middle" fontFamily={FONT.hand} fontSize={tsz} fill={ink}>{richLines(panel.text, lines, ink, tsz).map((l, i) => <tspan key={i} x={200} y={top + i * tsz * 1.2}>{l}</tspan>)}</text>
      </g>
    );
  }
  return null;
}

/** Crit markup from play mode: thick sharpie strokes over everything, clipped to the panel. */
function Markup({ strokes, pid, hit }: { strokes: MarkupStroke[]; pid: string; hit?: boolean }) {
  return (
    <g data-markup={pid} clipPath={`url(#sb-clip-${pid})`} pointerEvents={hit ? "stroke" : "none"}>
      <MarkupStrokes strokes={strokes} hit={hit} />
    </g>
  );
}

export function PanelArt({ board, panel, opts }: { board: Board; panel: Panel; opts: RenderOptions }): ReactNode {
  const pid = panel.id;
  const wob = opts.wobble === false ? undefined : "url(#sb-wobble)";
  return (
    <g data-panel={pid}>
      <clipPath id={`sb-clip-${pid}`}><rect x={0} y={0} width={PANEL_W} height={PANEL_H} /></clipPath>
      <rect x={0} y={0} width={PANEL_W} height={PANEL_H} fill={C.paper} data-el="__panel" />
      <g clipPath={`url(#sb-clip-${pid})`}>
        {isScene(panel) ? <ScenePanelBody board={board} panel={panel} opts={opts} /> : <CardBody panel={panel} ts={board.page?.textScale ?? 1} />}
      </g>
      <rect x={1.3} y={1.3} width={PANEL_W - 2.6} height={PANEL_H - 2.6} fill="none" stroke={ink} strokeWidth={2.6} filter={wob} pointerEvents="none" />
      {opts.showMarkup && (panel.markup?.length ?? 0) > 0 && <Markup strokes={panel.markup!} pid={pid} hit={opts.markupHit} />}
    </g>
  );
}

export const panelHasProduct = (p: Panel) =>
  isScene(p) && ((p.devices ?? []).some((d) => d.product !== false) || (p.characters ?? []).some((c) => { const d = heldDeviceOf(c); return !!d && d.product !== false; }));

export { toPanel };
