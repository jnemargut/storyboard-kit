import type { ReactNode } from "react";
import type { Board, Panel, ScenePanel, TimePanel } from "../types";
import { isScene } from "../types";
import { Character } from "./character";
import { DEVICE_DEFS, Device, type Rect } from "./devices";
import { ADV_TITLE, captionBox, heldDeviceOf, layoutPanel, placeBubbles, specialGeometry, toPanel, wrap, textWidth, type AssetResolver, type CharPlaced, type DevPlaced, type PanelLayout } from "./layout";
import { BubbleShape, BubbleText, Callout, CaptionShape, CaptionText, GestureMark } from "./overlays";
import { SceneBack, SceneFront } from "./scenes";
import { C, FONT, PANEL_H, PANEL_W, SKIN, OUTFIT_FILL } from "./tokens";
import type { Pt } from "./rig";

export interface RenderOptions {
  asset: AssetResolver;
  /** Wobble filter on (off while dragging in the editor). */
  wobble?: boolean;
}

const ink = C.ink;
const clip = (pid: string, el: string) => `sb-${pid}-${el.replace(/[^a-z0-9-]/gi, "_")}`;

function CharEl({ c, pid, cam }: { c: CharPlaced; pid: string; cam: { s: number } }) {
  if (c.ov.hidden) return null;
  const dx = (c.ov.dx ?? 0) / cam.s, dy = (c.ov.dy ?? 0) / cam.s;
  const k = c.s * (c.ov.scale ?? 1);
  const held = c.held ? (
    <g transform={`translate(${c.held.cx} ${c.held.cy}) rotate(${c.held.rot}) scale(${c.held.scale})`} data-drop={`char:${c.id}`}>
      <Device type={c.held.type} href={c.held.href} product={c.held.product} clipId={clip(pid, `${c.id}-held`)} />
    </g>
  ) : undefined;
  return (
    <g data-el={c.id} data-kind="character" transform={`translate(${c.x + dx} ${c.y + dy}) rotate(${c.ov.rotate ?? 0}) scale(${k})`}>
      <Character f={c.fig} cast={c.cast} mood={c.mood} held={held} stool={c.stool} />
    </g>
  );
}

function DevEl({ d, pid, cam }: { d: DevPlaced; pid: string; cam: { s: number } }) {
  if (d.ov.hidden) return null;
  const dx = (d.ov.dx ?? 0) / cam.s, dy = (d.ov.dy ?? 0) / cam.s;
  return (
    <g data-el={d.id} data-kind="device" data-drop={`device:${d.id}`} transform={`translate(${d.x + dx} ${d.y + dy}) rotate(${d.rot + (d.ov.rotate ?? 0)}) scale(${d.s * (d.ov.scale ?? 1)})`}>
      <Device type={d.type} href={d.href} product={d.product} clipId={clip(pid, d.id)} />
    </g>
  );
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
  const handheld = devType ? ["phone", "tablet", "watch"].includes(devType) : false;
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
  if (sp.kind === "ots") {
    const c = sp.char;
    const ov = panel.layout?.[c.id] ?? {};
    const S = g.S * (ov.scale ?? 1);
    const cx = g.charX + (ov.dx ?? 0), cy = g.charY + (ov.dy ?? 0);
    const shoulder: Pt = [cx + c.fig.j.shL[0] * S, cy + c.fig.j.shL[1] * S];
    const handP: Pt = [dcx - dw + 8, dcy + dh * 0.35];
    return (
      <g>
        {device}
        <g data-el={c.id} data-kind="character" transform={`translate(${cx} ${cy}) scale(${S})`}>
          <Character f={c.fig} cast={c.cast} mood={c.mood} />
        </g>
        {handheld && <g data-el={c.id} data-kind="character">{arm(shoulder, handP, 13)}{hand(handP, 9)}</g>}
      </g>
    );
  }
  if (sp.kind === "screen") {
    const handP: Pt = [dcx + dw - 4, dcy + dh * 0.3];
    return <g>{handheld && arm([PANEL_W + 20, PANEL_H + 20], [handP[0] + 10, handP[1] + 14], 22)}{device}{handheld && <g>{hand(handP, 14)}<path d={`M${handP[0] - 6} ${handP[1] - 8} q-12 -6 -16 4`} stroke={ink} strokeWidth={2} fill={skin} /></g>}</g>;
  }
  // pov: two hands
  const lh: Pt = [dcx - dw + 2, dcy + dh * 0.35], rh: Pt = [dcx + dw - 2, dcy + dh * 0.35];
  return (
    <g>
      {handheld && <>{arm([-20, PANEL_H + 20], [lh[0] - 8, lh[1] + 10], 24)}{arm([PANEL_W + 20, PANEL_H + 20], [rh[0] + 8, rh[1] + 10], 24)}</>}
      {device}
      {handheld && <>{hand(lh, 14)}{hand(rh, 14)}</>}
    </g>
  );
}

function ScenePanelBody({ board, panel, opts }: { board: Board; panel: ScenePanel; opts: RenderOptions }) {
  const pid = panel.id;
  const L = layoutPanel(board, panel, opts.asset);
  const cam = L.camera;
  const wob = opts.wobble === false ? undefined : "url(#sb-wobble)";

  // overlays
  const reserved: Rect[] = [];
  let cap: ReturnType<typeof captionBox> | undefined;
  if (panel.caption) {
    cap = captionBox(panel.caption);
    const ov = panel.layout?.caption ?? {};
    cap = { ...cap, x: cap.x + (ov.dx ?? 0), y: cap.y + (ov.dy ?? 0) };
    reserved.push(cap);
  }
  for (const a of Object.values(L.anchors)) if (a.screen && a.screen.w > 14) reserved.push(a.screen);
  const bubbles = placeBubbles(panel, L.anchors, reserved);
  const taken: Rect[] = [...reserved, ...bubbles];
  const callouts = (panel.callouts ?? []).map((co, i) => {
    const id = co.id ?? `callout-${i}`;
    const size = 11.5;
    const lines = wrap(co.text, size, 120);
    const w = Math.max(...lines.map((l) => textWidth(l, size))) + 12, h = lines.length * size * 1.15 + 9;
    const a = co.target ? L.anchors[co.target] : undefined;
    const to: Pt | undefined = a ? (a.screen ? [a.screen.x + a.screen.w / 2, a.screen.y + a.screen.h / 2] : [a.box.x + a.box.w / 2, a.box.y + 10]) : undefined;
    const cands: Pt[] = [[PANEL_W - w - 8, 8], [PANEL_W - w - 8, PANEL_H - h - 8], [8, PANEL_H - h - 8], [8, 8], [PANEL_W / 2 - w / 2, PANEL_H - h - 8]];
    const fits = (p: Pt) => !taken.some((t) => p[0] < t.x + t.w + 4 && t.x < p[0] + w + 4 && p[1] < t.y + t.h + 4 && t.y < p[1] + h + 4);
    const p = cands.find(fits) ?? cands[0];
    const ov = panel.layout?.[id] ?? {};
    const r = { x: p[0] + (ov.dx ?? 0), y: p[1] + (ov.dy ?? 0), w, h };
    taken.push(r);
    return { id, r, lines, size, to };
  });
  const gestures = (panel.gestures ?? []).map((gs, i) => {
    const id = gs.id ?? `gesture-${i}`;
    const target = gs.on ?? Object.keys(L.anchors).find((k) => L.anchors[k].screen);
    const screen = target ? L.anchors[target]?.screen : undefined;
    const product = target ? L.anchors[target]?.product !== false : true;
    const ov = panel.layout?.[id] ?? {};
    return { id, g: gs, screen, ov, product };
  });

  const byLayer = (behind: boolean) => (
    <>
      {L.devices.filter((d) => d.behind === behind).map((d) => <DevEl key={d.id} d={d} pid={pid} cam={cam} />)}
      {L.chars.filter((c) => c.behind === behind).map((c) => <CharEl key={c.id} c={c} pid={pid} cam={cam} />)}
    </>
  );

  return (
    <>
      <g filter={wob}>
        {L.special ? (
          <>
            <g opacity={0.35} transform={`translate(${cam.tx} ${cam.ty}) scale(${cam.s})`}><SceneBack id={panel.scene} /><SceneFront id={panel.scene} /></g>
            <SpecialArt L={L} pid={pid} board={board} panel={panel} />
          </>
        ) : (
          <g transform={`translate(${cam.tx} ${cam.ty}) scale(${cam.s})`}>
            <SceneBack id={panel.scene} />
            {byLayer(true)}
            <SceneFront id={panel.scene} />
            {byLayer(false)}
          </g>
        )}
        {cap && !(panel.layout?.caption?.hidden) && <g data-el="caption" data-kind="caption"><CaptionShape r={cap} /></g>}
        {bubbles.map((b) => !(panel.layout?.[b.id]?.hidden) && <g key={b.id} data-el={b.id} data-kind="bubble"><BubbleShape b={b} /></g>)}
      </g>
      {gestures.map(({ id, g, screen, ov, product }) => !ov.hidden && screen && (
        <g key={id} data-el={id} data-kind="gesture" transform={`translate(${ov.dx ?? 0} ${ov.dy ?? 0})`}><GestureMark g={g} screen={screen} product={product} /></g>
      ))}
      {cap && !(panel.layout?.caption?.hidden) && <g data-el="caption" data-kind="caption"><CaptionText r={cap} lines={cap.lines} size={cap.size} /></g>}
      {bubbles.map((b) => !(panel.layout?.[b.id]?.hidden) && <g key={b.id} data-el={b.id} data-kind="bubble"><BubbleText b={b} /></g>)}
      {callouts.map((c) => !(panel.layout?.[c.id]?.hidden) && <g key={c.id} data-el={c.id} data-kind="callout"><Callout r={c.r} lines={c.lines} size={c.size} to={c.to} /></g>)}
    </>
  );
}

function TimeIcon({ icon, x, y }: { icon: TimePanel["icon"]; x: number; y: number }) {
  const s = { stroke: ink, strokeWidth: 2.6, fill: "none", strokeLinecap: "round" as const };
  switch (icon) {
    case "calendar":
      return <g><rect x={x - 28} y={y - 26} width={56} height={54} rx={4} fill={C.paper} stroke={ink} strokeWidth={2.6} /><path d={`M${x - 28} ${y - 10} h56 M${x - 14} ${y - 32} v12 M${x + 14} ${y - 32} v12`} {...s} /><text x={x} y={y + 20} textAnchor="middle" fontFamily={FONT.title} fontSize={20} fill={ink}>+1</text></g>;
    case "sun":
      return <g><circle cx={x} cy={y} r={16} fill={C.g2} stroke={ink} strokeWidth={2.6} />{Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return <path key={i} d={`M${x + Math.cos(a) * 22} ${y + Math.sin(a) * 22} L${x + Math.cos(a) * 30} ${y + Math.sin(a) * 30}`} {...s} />; })}</g>;
    case "moon":
      return <path d={`M${x + 6} ${y - 26} a26 26 0 1 0 18 42 a20 20 0 1 1 -18 -42 z`} fill={C.g4} stroke={ink} strokeWidth={2.6} />;
    default:
      return <g><circle cx={x} cy={y} r={28} fill={C.paper} stroke={ink} strokeWidth={2.8} /><path d={`M${x} ${y} V${y - 19} M${x} ${y} L${x + 13} ${y + 7}`} {...s} /><path d={`M${x} ${y - 28} v4 M${x + 28} ${y} h-4 M${x} ${y + 28} v-4 M${x - 28} ${y} h4`} {...s} strokeWidth={2} /><path d={`M${x + 32} ${y - 26} q8 -6 14 2 M${x + 36} ${y - 34} q10 -4 16 6`} {...s} strokeWidth={2} /></g>;
  }
}

function CardBody({ panel }: { panel: Panel }) {
  const ov = (id: string) => panel.layout?.[id] ?? {};
  const shift = (id: string) => `translate(${ov(id).dx ?? 0} ${ov(id).dy ?? 0})`;
  if (panel.type === "title") {
    const lines = wrap(panel.title.toUpperCase(), 30, 340, ADV_TITLE);
    const lh = 34;
    const top = 118 - ((lines.length - 1) * lh) / 2;
    return (
      <>
        <g data-el="title" data-kind="text" transform={shift("title")}>
          <text textAnchor="middle" fontFamily={FONT.title} fontSize={30} fill={ink}>{lines.map((l, i) => <tspan key={i} x={200} y={top + i * lh}>{l}</tspan>)}</text>
        </g>
        {panel.subtitle && (
          <g data-el="subtitle" data-kind="text" transform={shift("subtitle")}>
            <text textAnchor="middle" fontFamily={FONT.hand} fontSize={16} fill={C.g8}>{wrap(panel.subtitle, 16, 330).map((l, i) => <tspan key={i} x={200} y={top + lines.length * lh + 6 + i * 19}>{l}</tspan>)}</text>
          </g>
        )}
      </>
    );
  }
  if (panel.type === "time") {
    const lines = wrap(panel.text.toUpperCase(), 24, 350, ADV_TITLE);
    return (
      <>
        <g data-el="icon" data-kind="text" transform={shift("icon")}><TimeIcon icon={panel.icon} x={200} y={96} /></g>
        <g data-el="text" data-kind="text" transform={shift("text")}>
          <text textAnchor="middle" fontFamily={FONT.title} fontSize={24} fill={ink}>{lines.map((l, i) => <tspan key={i} x={200} y={170 + i * 28}>{l}</tspan>)}</text>
        </g>
      </>
    );
  }
  if (panel.type === "text") {
    const lines = wrap(panel.text, 19, 330);
    const top = 136 - ((lines.length - 1) * 23) / 2;
    return (
      <g data-el="text" data-kind="text" transform={shift("text")}>
        <text textAnchor="middle" fontFamily={FONT.hand} fontSize={19} fill={ink}>{lines.map((l, i) => <tspan key={i} x={200} y={top + i * 23}>{l}</tspan>)}</text>
      </g>
    );
  }
  return null;
}

export function PanelArt({ board, panel, opts }: { board: Board; panel: Panel; opts: RenderOptions }): ReactNode {
  const pid = panel.id;
  const wob = opts.wobble === false ? undefined : "url(#sb-wobble)";
  return (
    <g data-panel={pid}>
      <clipPath id={`sb-clip-${pid}`}><rect x={0} y={0} width={PANEL_W} height={PANEL_H} /></clipPath>
      <rect x={0} y={0} width={PANEL_W} height={PANEL_H} fill={C.paper} data-el="__panel" />
      <g clipPath={`url(#sb-clip-${pid})`}>
        {isScene(panel) ? <ScenePanelBody board={board} panel={panel} opts={opts} /> : <CardBody panel={panel} />}
      </g>
      <rect x={1.3} y={1.3} width={PANEL_W - 2.6} height={PANEL_H - 2.6} fill="none" stroke={ink} strokeWidth={2.6} filter={wob} pointerEvents="none" />
    </g>
  );
}

export const panelHasProduct = (p: Panel) =>
  isScene(p) && ((p.devices ?? []).some((d) => d.product !== false) || (p.characters ?? []).some((c) => { const d = heldDeviceOf(c); return !!d && d.product !== false; }));

export { toPanel };
