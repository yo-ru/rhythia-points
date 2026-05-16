"use client";

import { useEffect, useRef, useState } from "react";
import type { SspmNote } from "@/lib/sspm";
import { SpeedIcon } from "@/components/icons/SpeedIcon";
import { HardrockIcon } from "@/components/icons/HardrockIcon";
import { GhostIcon } from "@/components/icons/GhostIcon";

type Props = {
  notes: SspmNote[];
  waypoints: Waypoint[];
  speed: number;
  hardrock: boolean;
  ghost: boolean;
  getTimeMs: () => number;
  getHitsoundVolume: () => number;
};

const GRID_HALF = 1.4;
const NOTE_SPAWN_Z = 16;
const LOOKAHEAD_MS = 750;
const CAM = { x: 0, y: 0, z: -3.8 };
const CAM_Z_DEFAULT = -3.8;
const CAM_Z_SPIN = -5.5;
const FOV_DEG = 42;

const FWD = { x: 0, y: 0, z: 1 };
const RIGHT = { x: 1, y: 0, z: 0 };
const UP = { x: 0, y: 1, z: 0 };

function setCameraLookAt(tx: number, ty: number, tz: number) {
  const dx = tx - CAM.x, dy = ty - CAM.y, dz = tz - CAM.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.001) return;
  FWD.x = dx / len; FWD.y = dy / len; FWD.z = dz / len;
  const rx = FWD.z, ry = 0, rz = -FWD.x;
  const rLen = Math.hypot(rx, ry, rz);
  if (rLen > 0.001) { RIGHT.x = rx / rLen; RIGHT.y = ry / rLen; RIGHT.z = rz / rLen; }
  const ux = FWD.y * RIGHT.z - FWD.z * RIGHT.y;
  const uy = FWD.z * RIGHT.x - FWD.x * RIGHT.z;
  const uz = FWD.x * RIGHT.y - FWD.y * RIGHT.x;
  const uLen = Math.hypot(ux, uy, uz);
  if (uLen > 0.001) { UP.x = ux / uLen; UP.y = uy / uLen; UP.z = uz / uLen; }
}

function resetCamera() {
  CAM.x = 0; CAM.y = 0; CAM.z = CAM_Z_DEFAULT;
  FWD.x = 0; FWD.y = 0; FWD.z = 1;
  RIGHT.x = 1; RIGHT.y = 0; RIGHT.z = 0;
  UP.x = 0; UP.y = 1; UP.z = 0;
}

const NOTE_PALETTE: string[] = [
  "255, 179, 186",
  "255, 223, 186",
  "255, 255, 186",
  "186, 255, 201",
  "186, 225, 255",
  "212, 186, 255",
];
const CURSOR_RGB = "96, 165, 250";
const CURSOR_FILL = "#60a5fa";
const FIELD_STROKE = "rgba(255, 255, 255, 0.55)";
const TRAIL_MS = 260;

function noteToWorld(x: number, y: number) {
  const CELL = (2 * GRID_HALF) / 3;
  return { wx: (x - 1) * CELL, wy: (1 - y) * CELL };
}

function project(wx: number, wy: number, wz: number, w: number, h: number) {
  const dx = wx - CAM.x, dy = wy - CAM.y, dz = wz - CAM.z;
  const right = dx * RIGHT.x + dy * RIGHT.y + dz * RIGHT.z;
  const up    = dx * UP.x    + dy * UP.y    + dz * UP.z;
  const depth = dx * FWD.x   + dy * FWD.y   + dz * FWD.z;
  if (depth < 0.05) return null;
  const focal = 1 / Math.tan((FOV_DEG * Math.PI / 180) / 2);
  const aspect = w / h;
  const ndcX = (right / depth) * focal;
  const ndcY = (up / depth) * focal;
  return { px: ((ndcX / aspect) + 1) * 0.5 * w, py: (1 - ndcY) * 0.5 * h, depth };
}

function lowerBound(notes: SspmNote[], tMs: number) {
  let lo = 0, hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (notes[mid]!.ms < tMs) lo = mid + 1; else hi = mid;
  }
  return lo;
}

const APPROACH_CURVE = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const GHOST_FADE_POWER = 1.3;
const GHOST_FADE_START_FRAC = 18 / 50;
const GHOST_FADE_END_FRAC = 6 / 50;
const HALF_GHOST_FADE_START_FRAC = 6 / 50;
const HALF_GHOST_FADE_END_FRAC = 2 / 50;
const STREAM_GAP_MS = 60;
const ROUNDNESS = 3.5;
const HIT_HALF = 0.57;
const MAX_PERP_DIST = HIT_HALF * 0.5;
const TIME_FRAC_TOL = 0.25;
const SPIN_STRAIGHT_SIN = 0.15;
const TURN_SIN = 0.3;

export type Waypoint = { x: number; y: number; ms: number; endMs: number; hits: number };

const MERGE_HALF = HIT_HALF * 0.85;
const MERGE_DIST_SQ = (2 * MERGE_HALF) * (2 * MERGE_HALF);

export function buildWaypoints(notes: SspmNote[]): Waypoint[] {
  const N = notes.length;
  if (N === 0) return [];

  const merged: Waypoint[] = [];
  for (const n of notes) {
    if (merged.length > 0) {
      const prev = merged[merged.length - 1]!;

      if (Math.abs(n.ms - prev.ms) < 1 && prev.hits === 1) {
        const dx = prev.x - n.x, dy = prev.y - n.y;
        if (dx * dx + dy * dy < MERGE_DIST_SQ) {
          prev.x = (prev.x + n.x) * 0.5;
          prev.y = (prev.y + n.y) * 0.5;
          if (n.ms > prev.endMs) prev.endMs = n.ms;
          prev.hits++;
          continue;
        }
      }

      const dx = n.x - prev.x, dy = n.y - prev.y;
      if (dx * dx + dy * dy < 0.001) {
        if (n.ms > prev.endMs) prev.endMs = n.ms;
        prev.hits++;
        continue;
      }
    }
    merged.push({ x: n.x, y: n.y, ms: n.ms, endMs: n.ms, hits: 1 });
  }
  const M = merged.length;
  if (M < 3) return merged;

  const classify = (list: Waypoint[]) => {
    const len = list.length;
    const sinA = new Float32Array(len);
    const inSpin = new Uint8Array(len);
    if (len < 4) return { sinA, inSpin };

    const runs: Array<[number, number]> = [];
    let runStart = -1;
    let runTurns = 0;
    let runPositive = false;
    let lastTurnJ = -1;

    for (let j = 1; j < len - 1; j++) {
      const ax = list[j]!.x - list[j - 1]!.x;
      const ay = list[j]!.y - list[j - 1]!.y;
      const bx = list[j + 1]!.x - list[j]!.x;
      const by = list[j + 1]!.y - list[j]!.y;
      const la = Math.hypot(ax, ay);
      const lb = Math.hypot(bx, by);
      if (la < 0.01 || lb < 0.01) continue;
      const cross = ax * by - ay * bx;
      const dotP  = ax * bx + ay * by;
      const s = Math.abs(cross) / (la * lb);
      sinA[j] = s;

      if (dotP < 0 && s < SPIN_STRAIGHT_SIN) {
        if (runStart >= 0 && runTurns >= 2 && lastTurnJ >= 0) runs.push([runStart, lastTurnJ + 1]);
        runStart = -1; runTurns = 0; lastTurnJ = -1;
        continue;
      }

      if (s > TURN_SIN) {
        const positive = cross > 0;
        if (runStart < 0) {
          runStart = j - 1;
          runTurns = 1;
          runPositive = positive;
          lastTurnJ = j;
        } else if (positive === runPositive) {
          runTurns++;
          lastTurnJ = j;
        } else {
          if (runTurns >= 2 && lastTurnJ >= 0) runs.push([runStart, lastTurnJ + 1]);
          runStart = j - 1;
          runTurns = 1;
          runPositive = positive;
          lastTurnJ = j;
        }
      }
    }
    if (runStart >= 0 && runTurns >= 2 && lastTurnJ >= 0) runs.push([runStart, lastTurnJ + 1]);
    for (const [start, end] of runs) {
      for (let j = start; j <= end && j < len; j++) inSpin[j] = 1;
    }
    return { sinA, inSpin };
  };

  const dropPass = (list: Waypoint[], pick: (perpDist: number, sin: number, inSpin: boolean) => boolean): Waypoint[] => {
    const len = list.length;
    if (len < 3) return list;
    const { inSpin } = classify(list);
    const prev = new Int32Array(len);
    const nxt  = new Int32Array(len);
    for (let i = 0; i < len; i++) { prev[i] = i - 1; nxt[i] = i + 1; }
    nxt[len - 1] = -1;
    const kept = new Uint8Array(len).fill(1);

    for (let j = len - 2; j >= 1; j--) {
      if (!kept[j]) continue;
      const pi = prev[j]!;
      const ni = nxt[j]!;
      if (pi < 0 || ni < 0) continue;
      const p = list[pi]!, c = list[j]!, q = list[ni]!;
      if (c.hits > 1 && c.endMs - c.ms > STREAM_GAP_MS) continue;

      const ax = c.x - p.x, ay = c.y - p.y;
      const bx = q.x - c.x, by = q.y - c.y;
      const la = Math.hypot(ax, ay);
      const lb = Math.hypot(bx, by);
      if (la < 0.01 || lb < 0.01) continue;
      const sin = Math.abs(ax * by - ay * bx) / (la * lb);

      const dx = q.x - p.x, dy = q.y - p.y;
      const L = Math.hypot(dx, dy);
      if (L < 0.01) continue;
      const cx = c.x - p.x, cy = c.y - p.y;
      const perpDist = Math.abs(cx * dy - cy * dx) / L;
      const proj = (cx * dx + cy * dy) / L;
      if (proj < 0 || proj > L) continue;

      const segTime = q.ms - p.endMs;
      if (segTime < 1) continue;
      const tFrac = (c.ms - p.endMs) / segTime;
      const pFrac = proj / L;
      if (Math.abs(tFrac - pFrac) > TIME_FRAC_TOL) continue;

      if (!pick(perpDist, sin, !!inSpin[j])) continue;
      kept[j] = 0;
      nxt[pi] = ni;
      prev[ni] = pi;
    }
    const out: Waypoint[] = [];
    for (let i = 0; i < len; i++) if (kept[i]) out.push(list[i]!);
    return out;
  };

  return dropPass(merged, (perp, sin, inSpin) =>
    inSpin ? sin < SPIN_STRAIGHT_SIN : perp <= MAX_PERP_DIST
  );
}

function sampleCurve(curve: number[], t: number) {
  if (t <= 0) return curve[0]!;
  if (t >= 1) return curve[curve.length - 1]!;
  const idx = t * (curve.length - 1);
  const lo = Math.floor(idx);
  const frac = idx - lo;
  return curve[lo]! + (curve[lo + 1]! - curve[lo]!) * frac;
}

function CR(p0: number, p1: number, p2: number, p3: number, t: number, s: number) {
  const m1 = s * (p2 - p0);
  const m2 = s * (p3 - p1);
  const t2 = t * t, t3 = t2 * t;
  const h00 =  2 * t3 - 3 * t2 + 1;
  const h10 =      t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 =      t3 -     t2;
  return h00 * p1 + h10 * m1 + h01 * p2 + h11 * m2;
}

function sinAt(wps: Waypoint[], k: number): number {
  const n = wps.length;
  if (k < 1 || k + 1 >= n) return 0;
  const a = wps[k - 1]!, b = wps[k]!, c = wps[k + 1]!;
  const ax = b.x - a.x, ay = b.y - a.y;
  const bx = c.x - b.x, by = c.y - b.y;
  const la = Math.hypot(ax, ay);
  const lb = Math.hypot(bx, by);
  if (la * lb < 0.0001) return 0;
  return Math.abs(ax * by - ay * bx) / (la * lb);
}

function cursorAt(wps: Waypoint[], tMs: number): { x: number; y: number } | null {
  const n = wps.length;
  if (n === 0) return null;
  if (n === 1) return { x: wps[0]!.x, y: wps[0]!.y };
  if (tMs <= wps[0]!.ms) return { x: wps[0]!.x, y: wps[0]!.y };
  const last = wps[n - 1]!;
  if (tMs >= last.endMs) return { x: last.x, y: last.y };

  const i = Math.max(0, lowerBound(wps, tMs) - 1);
  const p1 = wps[i]!;
  if (tMs <= p1.endMs) return { x: p1.x, y: p1.y };
  if (i + 1 >= n) return { x: p1.x, y: p1.y };
  const p2 = wps[i + 1]!;
  let p0x: number, p0y: number;
  if (i > 0) { p0x = wps[i - 1]!.x; p0y = wps[i - 1]!.y; }
  else { p0x = p1.x - (p2.x - p1.x); p0y = p1.y - (p2.y - p1.y); }
  let p3x: number, p3y: number;
  if (i + 2 < n) {
    const npp = wps[i + 2]!;
    const d = Math.hypot(npp.x - p2.x, npp.y - p2.y);
    if (d > 0.01) { p3x = npp.x; p3y = npp.y; }
    else { p3x = p2.x + (p2.x - p1.x); p3y = p2.y + (p2.y - p1.y); }
  } else {
    p3x = p2.x + (p2.x - p1.x);
    p3y = p2.y + (p2.y - p1.y);
  }

  const v1x = p1.x - p0x, v1y = p1.y - p0y;
  const v2x = p2.x - p1.x, v2y = p2.y - p1.y;
  const v3x = p3x - p2.x, v3y = p3y - p2.y;
  const len1 = Math.hypot(v1x, v1y);
  const len2 = Math.hypot(v2x, v2y);
  const len3 = Math.hypot(v3x, v3y);
  let sinIn = 0, sinOut = 0;
  if (len1 * len2 > 0.0001) sinIn  = Math.abs(v1x * v2y - v1y * v2x) / (len1 * len2);
  if (len2 * len3 > 0.0001) sinOut = Math.abs(v2x * v3y - v2y * v3x) / (len2 * len3);

  const p0IsCorner = i >= 2          && sinAt(wps, i - 1) > TURN_SIN;
  const p3IsCorner = i + 2 < n       && sinAt(wps, i + 2) > TURN_SIN;
  if (sinIn  > TURN_SIN && sinOut < SPIN_STRAIGHT_SIN && !p0IsCorner) {
    p0x = p1.x - v2x;
    p0y = p1.y - v2y;
  }
  if (sinOut > TURN_SIN && sinIn  < SPIN_STRAIGHT_SIN && !p3IsCorner) {
    p3x = p2.x + v2x;
    p3y = p2.y + v2y;
  }
  const segDur = p2.ms - p1.endMs;
  if (segDur < 1) return { x: p1.x, y: p1.y };

  const gapPP1 = i > 0           ? p1.ms - wps[i - 1]!.endMs : Infinity;
  const gapP2N = i + 2 < n       ? wps[i + 2]!.ms - p2.endMs : Infinity;
  const isStream = gapPP1 < STREAM_GAP_MS && segDur < STREAM_GAP_MS && gapP2N < STREAM_GAP_MS;

  const noteDist = Math.hypot(v2x, v2y);
  const distScale = Math.max(0.2, Math.min(1, noteDist / 2));
  let streamScale: number;
  if (isStream) {
    streamScale = 0.8;
  } else {
    const sd = Math.max(0, Math.min(1, (segDur - 50) / 100));
    streamScale = 0.4 + 0.6 * sd;
  }
  const sinAngle = Math.max(sinIn, sinOut);
  streamScale += (1 - streamScale) * sinAngle;

  const bend = sinIn > 0.5 || sinOut > 0.5;
  let tension = bend
    ? ROUNDNESS * 0.5 * streamScale
    : ROUNDNESS * 0.5 * distScale * streamScale;
  if (bend && tension > 0.9) tension = 0.9;

  if (noteDist > 0.01) {
    const dx02 = p2.x - p0x, dy02 = p2.y - p0y;
    const dx13 = p3x - p1.x, dy13 = p3y - p1.y;
    const m1Len = 0.5 * tension * Math.hypot(dx02, dy02);
    const m2Len = 0.5 * tension * Math.hypot(dx13, dy13);
    const maxM = Math.max(m1Len, m2Len);
    if (maxM > noteDist) tension *= noteDist / maxM;
  }

  const tRaw = Math.max(0, Math.min(1, (tMs - p1.endMs) / segDur));
  const easeBlend = Math.min(1, segDur / 80);
  const t = easeBlend > 0.1
    ? tRaw * (1 - easeBlend) + sampleCurve(APPROACH_CURVE, tRaw) * easeBlend
    : tRaw;

  return {
    x: CR(p0x, p1.x, p2.x, p3x, t, tension),
    y: CR(p0y, p1.y, p2.y, p3y, t, tension),
  };
}

function edgeFade(z: number, near: number, far: number, edge: number) {
  const fNear = Math.min(1, Math.max(0, (z - near) / edge));
  const fFar  = Math.min(1, Math.max(0, (far - z) / edge));
  return Math.min(fNear, fFar);
}

function drawTunnelLines(ctx: CanvasRenderingContext2D, w: number, h: number, tSec: number) {
  const SPACING = 4;
  const SPEED = 3;
  const SEG_LEN = 1.8;
  const Z_NEAR = 0.5;
  const Z_FAR = 32;
  const FADE_EDGE = 5;
  const rails = [
    { x: -2.6, y: -2.0 },
    { x:  2.6, y: -2.0 },
    { x: -2.6, y:  2.0 },
    { x:  2.6, y:  2.0 },
    { x:  0,   y: -2.4 },
    { x:  0,   y:  2.4 },
  ];
  const offset = (tSec * SPEED) % SPACING;
  ctx.lineWidth = 1.5;
  for (const r of rails) {
    for (let i = 0; i < 10; i++) {
      const z = i * SPACING - offset;
      if (z < Z_NEAR || z > Z_FAR) continue;
      const a = project(r.x, r.y, z, w, h);
      const b = project(r.x, r.y, z + SEG_LEN, w, h);
      if (!a || !b) continue;
      const fade = edgeFade(z, Z_NEAR, Z_FAR, FADE_EDGE);
      if (fade <= 0) continue;
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.22 * fade).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    }
  }
}

function drawSpinningSquares(ctx: CanvasRenderingContext2D, w: number, h: number, tSec: number) {
  const SPEED = 2.5;
  const SPAWN_Z = 32;
  const DIE_Z = 1;
  const SPAN = SPAWN_Z - DIE_Z;
  const FADE_EDGE = 6;
  const phases = [0, SPAN / 2];
  const configs = [
    { rotRate: 0.5,  size: 2.2, baseAlpha: 0.55 },
    { rotRate: -0.4, size: 1.7, baseAlpha: 0.40 },
  ];
  for (let i = 0; i < phases.length; i++) {
    const cfg = configs[i]!;
    const phase = (tSec * SPEED + phases[i]!) % SPAN;
    const z = SPAWN_Z - phase;
    const fade = edgeFade(z, DIE_Z, SPAWN_Z, FADE_EDGE);
    if (fade <= 0) continue;
    const rot = tSec * cfg.rotRate;
    const c = Math.cos(rot), si = Math.sin(rot);
    const local = [
      { x: -cfg.size, y: -cfg.size },
      { x:  cfg.size, y: -cfg.size },
      { x:  cfg.size, y:  cfg.size },
      { x: -cfg.size, y:  cfg.size },
    ];
    const projPts: { px: number; py: number }[] = [];
    for (const p of local) {
      const rx = p.x * c - p.y * si;
      const ry = p.x * si + p.y * c;
      const proj = project(rx, ry, z, w, h);
      if (!proj) { projPts.length = 0; break; }
      projPts.push(proj);
    }
    if (projPts.length !== 4) continue;
    ctx.beginPath();
    for (let j = 0; j < 4; j++) {
      const p = projPts[j]!;
      if (j === 0) ctx.moveTo(p.px, p.py);
      else ctx.lineTo(p.px, p.py);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(255, 255, 255, ${(cfg.baseAlpha * fade).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawField(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const G = GRID_HALF;
  const tl = project(-G,  G, 0, w, h);
  const tr = project( G,  G, 0, w, h);
  const br = project( G, -G, 0, w, h);
  const bl = project(-G, -G, 0, w, h);
  if (!tl || !tr || !br || !bl) return;

  ctx.strokeStyle = FIELD_STROKE;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  const armX = Math.max(14, (tr.px - tl.px) * 0.05);
  const armY = Math.max(14, (bl.py - tl.py) * 0.05);
  const r = 10;

  ctx.beginPath();
  ctx.moveTo(tl.px, tl.py + armY);
  ctx.lineTo(tl.px, tl.py + r);
  ctx.quadraticCurveTo(tl.px, tl.py, tl.px + r, tl.py);
  ctx.lineTo(tl.px + armX, tl.py);

  ctx.moveTo(tr.px - armX, tr.py);
  ctx.lineTo(tr.px - r, tr.py);
  ctx.quadraticCurveTo(tr.px, tr.py, tr.px, tr.py + r);
  ctx.lineTo(tr.px, tr.py + armY);

  ctx.moveTo(br.px, br.py - armY);
  ctx.lineTo(br.px, br.py - r);
  ctx.quadraticCurveTo(br.px, br.py, br.px - r, br.py);
  ctx.lineTo(br.px - armX, br.py);

  ctx.moveTo(bl.px + armX, bl.py);
  ctx.lineTo(bl.px + r, bl.py);
  ctx.quadraticCurveTo(bl.px, bl.py, bl.px, bl.py - r);
  ctx.lineTo(bl.px, bl.py - armY);
  ctx.stroke();
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

function drawNotes(ctx: CanvasRenderingContext2D, notes: SspmNote[], tMs: number, w: number, h: number, ghost: boolean, halfGhost: boolean) {
  const CELL = (2 * GRID_HALF) / 3;
  const NOTE_HALF = CELL * 0.42;
  const refProj = project(0, 0, 0, w, h);
  const refSize = project(NOTE_HALF, 0, 0, w, h);
  if (!refProj || !refSize) return;
  const refPixelHalf = Math.abs(refSize.px - refProj.px);

  const start = lowerBound(notes, tMs);
  type V = { n: SspmNote; dt: number; idx: number };
  const visible: V[] = [];
  for (let i = start; i < notes.length; i++) {
    const dt = notes[i]!.ms - tMs;
    if (dt > LOOKAHEAD_MS) break;
    visible.push({ n: notes[i]!, dt, idx: i });
  }
  visible.sort((a, b) => b.dt - a.dt);

  for (const v of visible) {
    const z = (v.dt / LOOKAHEAD_MS) * NOTE_SPAWN_Z;
    const world = noteToWorld(v.n.x, v.n.y);
    const center = project(world.wx, world.wy, z, w, h);
    if (!center) continue;
    const depthScale = Math.max(0.06, refProj.depth / Math.max(1e-6, center.depth));
    const halfPx = Math.max(3, refPixelHalf * depthScale);
    const closeness = 1 - v.dt / LOOKAHEAD_MS;
    let alpha = Math.max(0, Math.min(1, 0.45 + closeness * 0.55));
    if (ghost || halfGhost) {
      const distFrac = 1 - closeness;
      const startFrac = ghost ? GHOST_FADE_START_FRAC : HALF_GHOST_FADE_START_FRAC;
      const endFrac   = ghost ? GHOST_FADE_END_FRAC   : HALF_GHOST_FADE_END_FRAC;
      const t = Math.max(0, Math.min(1, (distFrac - endFrac) / (startFrac - endFrac)));
      alpha *= Math.pow(t, GHOST_FADE_POWER);
    }
    if (alpha <= 0.001) continue;
    const colorRgb = NOTE_PALETTE[v.idx % NOTE_PALETTE.length]!;
    ctx.lineWidth = Math.max(1.8, halfPx * 0.18);
    ctx.strokeStyle = `rgba(${colorRgb}, ${alpha.toFixed(3)})`;
    drawRoundRect(ctx, center.px - halfPx, center.py - halfPx, halfPx * 2, halfPx * 2, halfPx * 0.32);
    ctx.stroke();
  }
}

type TrailPoint = { x: number; y: number; t: number };

function drawTrail(ctx: CanvasRenderingContext2D, trail: TrailPoint[], tMs: number, w: number, h: number) {
  if (trail.length < 2) return;
  type V = { x: number; y: number; alpha: number; hw: number };
  const pts: V[] = [];
  for (const tp of trail) {
    const age = tMs - tp.t;
    if (age >= TRAIL_MS) continue;
    const wp = noteToWorld(tp.x, tp.y);
    const p = project(wp.wx, wp.wy, 0, w, h);
    if (!p) continue;
    const k = 1 - age / TRAIL_MS;
    pts.push({ x: p.px, y: p.py, alpha: k * 0.55, hw: 2 + k * 3 });
  }
  if (pts.length < 2) return;

  const normals: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < pts.length; i++) {
    let nx = 0, ny = 0;
    if (i > 0) {
      const dx = pts[i]!.x - pts[i - 1]!.x;
      const dy = pts[i]!.y - pts[i - 1]!.y;
      const len = Math.hypot(dx, dy) || 1;
      nx += -dy / len;
      ny +=  dx / len;
    }
    if (i < pts.length - 1) {
      const dx = pts[i + 1]!.x - pts[i]!.x;
      const dy = pts[i + 1]!.y - pts[i]!.y;
      const len = Math.hypot(dx, dy) || 1;
      nx += -dy / len;
      ny +=  dx / len;
    }
    const nlen = Math.hypot(nx, ny) || 1;
    normals.push({ x: nx / nlen, y: ny / nlen });
  }

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!, b = pts[i + 1]!;
    const na = normals[i]!, nb = normals[i + 1]!;
    const alpha = (a.alpha + b.alpha) * 0.5;
    if (alpha <= 0) continue;
    ctx.fillStyle = `rgba(${CURSOR_RGB}, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(a.x + na.x * a.hw, a.y + na.y * a.hw);
    ctx.lineTo(b.x + nb.x * b.hw, b.y + nb.y * b.hw);
    ctx.lineTo(b.x - nb.x * b.hw, b.y - nb.y * b.hw);
    ctx.lineTo(a.x - na.x * a.hw, a.y - na.y * a.hw);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCursor(ctx: CanvasRenderingContext2D, pos: { x: number; y: number } | null, w: number, h: number) {
  if (!pos) return;
  const world = noteToWorld(pos.x, pos.y);
  const p = project(world.wx, world.wy, 0, w, h);
  if (!p) return;
  const r = 13;
  const glow = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, r * 2.4);
  glow.addColorStop(0,    `rgba(${CURSOR_RGB}, 0.55)`);
  glow.addColorStop(0.45, `rgba(${CURSOR_RGB}, 0.25)`);
  glow.addColorStop(1,    `rgba(${CURSOR_RGB}, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.px, p.py, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CURSOR_FILL;
  ctx.beginPath();
  ctx.arc(p.px, p.py, r, 0, Math.PI * 2);
  ctx.fill();
}

function playHitsound(ac: AudioContext, volume: number) {
  if (volume <= 0) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.025);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.0015);
  gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.045);
  osc.start(now);
  osc.stop(now + 0.05);
}

export function MapPreviewCanvas({ notes, waypoints, speed, hardrock, ghost, getTimeMs, getHitsoundVolume }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const notesRef = useRef(notes);
  const waypointsRef = useRef<Waypoint[]>(waypoints);
  const timeRef = useRef(getTimeMs);
  const hsVolRef = useRef(getHitsoundVolume);
  const [spinMode, setSpinMode] = useState(false);
  const [halfGhostMode, setHalfGhostMode] = useState(false);
  const spinModeRef = useRef(false);
  const ghostRef = useRef(ghost);
  const halfGhostRef = useRef(false);
  useEffect(() => { spinModeRef.current = spinMode; }, [spinMode]);
  useEffect(() => { ghostRef.current = ghost; }, [ghost]);
  useEffect(() => { halfGhostRef.current = halfGhostMode; }, [halfGhostMode]);
  const prevTimeRef = useRef<number | null>(null);
  const acRef = useRef<AudioContext | null>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { waypointsRef.current = waypoints; }, [waypoints]);
  useEffect(() => { timeRef.current = getTimeMs; }, [getTimeMs]);
  useEffect(() => { hsVolRef.current = getHitsoundVolume; }, [getHitsoundVolume]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      sizeRef.current = { w, h };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const ensureAudioCtx = () => {
      if (acRef.current) return acRef.current;
      try {
        type Win = Window & { webkitAudioContext?: typeof AudioContext };
        const W = window as Win;
        const Ctor = window.AudioContext ?? W.webkitAudioContext;
        if (!Ctor) return null;
        acRef.current = new Ctor();
        return acRef.current;
      } catch { return null; }
    };

    const loop = () => {
      const { w, h } = sizeRef.current;
      if (w > 0 && h > 0) {
        ctx.clearRect(0, 0, w, h);
        const tMs = timeRef.current();
        const tSec = performance.now() * 0.001;

        const prev = prevTimeRef.current;
        if (prev != null && tMs < prev - 50) trailRef.current.length = 0;
        const cursorPos = cursorAt(waypointsRef.current, tMs);
        resetCamera();
        if (spinModeRef.current && cursorPos) {
          CAM.z = CAM_Z_SPIN;
          const wp = noteToWorld(cursorPos.x, cursorPos.y);
          setCameraLookAt(wp.wx, wp.wy, 0);
        }
        if (cursorPos) {
          const SUBSAMPLES = 12;
          if (prev != null && tMs > prev && tMs - prev < 60) {
            const step = (tMs - prev) / SUBSAMPLES;
            for (let k = 1; k <= SUBSAMPLES; k++) {
              const tSub = prev + step * k;
              const sub = k === SUBSAMPLES ? cursorPos : cursorAt(waypointsRef.current, tSub);
              if (sub) trailRef.current.push({ x: sub.x, y: sub.y, t: tSub });
            }
          } else {
            trailRef.current.push({ x: cursorPos.x, y: cursorPos.y, t: tMs });
          }
          while (trailRef.current.length > 0 && tMs - trailRef.current[0]!.t > TRAIL_MS) {
            trailRef.current.shift();
          }
        }

        drawTunnelLines(ctx, w, h, tSec);
        drawSpinningSquares(ctx, w, h, tSec);
        drawField(ctx, w, h);
        drawNotes(ctx, notesRef.current, tMs, w, h, ghostRef.current, halfGhostRef.current);
        if (!spinModeRef.current) drawTrail(ctx, trailRef.current, tMs, w, h);
        drawCursor(ctx, cursorPos, w, h);

        const ns = notesRef.current;
        if (prev != null && tMs > prev && tMs - prev < 500 && ns.length > 0) {
          const lo = lowerBound(ns, prev);
          const hi = lowerBound(ns, tMs);
          if (hi > lo) {
            const vol = hsVolRef.current();
            const ac = ensureAudioCtx();
            if (ac && vol > 0) {
              for (let i = lo; i < hi; i++) playHitsound(ac, vol);
            }
          }
        }
        prevTimeRef.current = tMs;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      if (acRef.current) { acRef.current.close().catch(() => {}); acRef.current = null; }
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full aspect-video relative bg-black rounded-lg overflow-hidden">
      <canvas ref={canvasRef} className="block" />
      <button
        type="button"
        onClick={() => setHalfGhostMode((s) => !s)}
        title={halfGhostMode ? "Disable half-ghost" : "Enable half-ghost"}
        disabled={ghost}
        className={`absolute bottom-11 left-2 w-8 h-8 inline-flex items-center justify-center rounded border bg-bg-elev/80 backdrop-blur-sm transition-colors ${ghost ? "opacity-40 cursor-not-allowed text-text-dim border-line" : halfGhostMode ? "text-accent border-accent" : "text-text-dim border-line hover:text-text hover:border-line"}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3a7 7 0 0 0-7 7v9l3-2 2 2 2-2 2 2 2-2 3 2v-9a7 7 0 0 0-7-7Z" />
          <path d="M12 3v18" strokeDasharray="2 2" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setSpinMode((s) => !s)}
        title={spinMode ? "Disable spin lock" : "Enable spin lock"}
        className={`absolute bottom-2 left-2 w-8 h-8 inline-flex items-center justify-center rounded border bg-bg-elev/80 backdrop-blur-sm transition-colors ${spinMode ? "text-accent border-accent" : "text-text-dim border-line hover:text-text hover:border-line"}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
          <line x1="12" y1="3" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="21" />
          <line x1="3" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="21" y2="12" />
        </svg>
      </button>
      <div className="absolute bottom-2 right-2 flex flex-col items-center gap-1">
        <SpeedIcon speed={speed} size={32} />
        <span className={hardrock ? "" : "opacity-25"}>
          <HardrockIcon size={32} />
        </span>
        <span className={ghost ? "" : "opacity-25"}>
          <GhostIcon size={32} />
        </span>
      </div>
    </div>
  );
}
