// Turns a photo or scan of a signature / stamp — or one drawn on screen — into
// the PNG printed on documents: the paper becomes see-through (shadows and
// paper grain included) while the ink keeps its colour, the empty margins are
// trimmed, and the result is resized to a crisp, small file.

export const ACCEPT = "image/png,image/jpeg,image/webp";
export const MAX_FILE_MB = 10;
/** Long side of the saved image: ~300 dpi at the size it prints, and a small file. */
export const OUT_SIDE = 640;
/** Long side a photo is processed at. */
const WORK_SIDE = 1400;

export interface Prepared {
  dataUrl: string;
  width: number;
  height: number;
}

/** A chosen image, scaled to the working size. */
export interface Source {
  canvas: HTMLCanvasElement;
  /** It already has a see-through background (a prepared PNG): nothing to clean. */
  transparent: boolean;
}

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};
const ctx2d = (c: HTMLCanvasElement) => c.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const decode = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file couldn't be opened as an image"));
    };
    img.src = url;
  });

/** More than 1% of the pixels see-through → it was prepared already. */
const hasTransparency = (d: Uint8ClampedArray) => {
  let clear = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) clear++;
  return clear > d.length / 4 / 100;
};

export async function loadSource(file: File): Promise<Source> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Choose a PNG, JPG or WEBP image");
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`That image is over ${MAX_FILE_MB} MB — try a smaller photo`);
  const img = await decode(file);
  const k = Math.min(1, WORK_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = makeCanvas(img.naturalWidth * k, img.naturalHeight * k);
  const ctx = ctx2d(canvas);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { canvas, transparent: hasTransparency(ctx.getImageData(0, 0, canvas.width, canvas.height).data) };
}

// ── Paper → transparent ─────────────────────────────────────────────────────

/**
 * The paper's colour around every pixel. The image is cut into cells; a
 * cell's paper colour is the average of its brightest tenth (strokes are thin,
 * so that is paper); cells crowded with ink borrow a brighter neighbour's; the
 * grid is smoothed and read back with bilinear blending. This follows shadows
 * and uneven light in phone photos.
 */
function paperMap(d: Uint8ClampedArray, w: number, h: number) {
  const cell = Math.max(12, Math.round(Math.max(w, h) / 20));
  const gw = Math.ceil(w / cell);
  const gh = Math.ceil(h / cell);
  const rgb = new Float32Array(gw * gh * 3);
  const lum = new Float32Array(gw * gh);
  const hist = new Uint32Array(256);
  const L = (i: number) => (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const x0 = gx * cell;
      const y0 = gy * cell;
      const x1 = Math.min(w, x0 + cell);
      const y1 = Math.min(h, y0 + cell);
      hist.fill(0);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) hist[L((y * w + x) * 4)]++;
      let want = Math.max(1, Math.round(((x1 - x0) * (y1 - y0)) / 10));
      let cut = 255;
      for (; cut > 0; cut--) {
        want -= hist[cut];
        if (want <= 0) break;
      }
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          if (L(i) >= cut) {
            r += d[i];
            g += d[i + 1];
            b += d[i + 2];
            n++;
          }
        }
      }
      const k = gy * gw + gx;
      rgb[k * 3] = r / n;
      rgb[k * 3 + 1] = g / n;
      rgb[k * 3 + 2] = b / n;
      lum[k] = cut;
    }
  }

  // Cells crowded with ink (a solid stamp) take a clearly brighter neighbour's paper.
  for (let pass = 0; pass < 3; pass++) {
    const fromRgb = rgb.slice();
    const fromLum = lum.slice();
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const k = gy * gw + gx;
        let best = k;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = gx + dx;
            const ny = gy + dy;
            if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
            const j = ny * gw + nx;
            if (fromLum[j] > fromLum[best]) best = j;
          }
        }
        if (fromLum[best] - fromLum[k] > 18) {
          lum[k] = fromLum[best];
          rgb[k * 3] = fromRgb[best * 3];
          rgb[k * 3 + 1] = fromRgb[best * 3 + 1];
          rgb[k * 3 + 2] = fromRgb[best * 3 + 2];
        }
      }
    }
  }

  // Smooth across neighbouring cells (3×3 average).
  const soft = new Float32Array(rgb.length);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let n = 0;
      const sum = [0, 0, 0];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const j = (ny * gw + nx) * 3;
          sum[0] += rgb[j];
          sum[1] += rgb[j + 1];
          sum[2] += rgb[j + 2];
          n++;
        }
      }
      const k = (gy * gw + gx) * 3;
      soft[k] = sum[0] / n;
      soft[k + 1] = sum[1] / n;
      soft[k + 2] = sum[2] / n;
    }
  }

  /** Writes the paper colour at (x, y) into out[0..2]. */
  return (x: number, y: number, out: Float32Array) => {
    const fx = Math.min(gw - 1, Math.max(0, (x + 0.5) / cell - 0.5));
    const fy = Math.min(gh - 1, Math.max(0, (y + 0.5) / cell - 0.5));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(gw - 1, x0 + 1);
    const y1 = Math.min(gh - 1, y0 + 1);
    const tx = fx - x0;
    const ty = fy - y0;
    const a = (y0 * gw + x0) * 3;
    const b = (y0 * gw + x1) * 3;
    const c = (y1 * gw + x0) * 3;
    const e = (y1 * gw + x1) * 3;
    for (let ch = 0; ch < 3; ch++) {
      const top = soft[a + ch] + (soft[b + ch] - soft[a + ch]) * tx;
      const bottom = soft[c + ch] + (soft[e + ch] - soft[c + ch]) * tx;
      out[ch] = top + (bottom - top) * ty;
    }
  };
}

/** How much ink below this is paper grain / shadow (cleared); above the second, solid ink. */
const GRAIN = 0.09;
const SOLID = 0.42;

/**
 * Colour-to-alpha against the local paper colour: each pixel's ink amount is
 * how much darker than the paper it is; the ink's own colour is recovered by
 * taking the paper back out, so blue ink stays blue and a red stamp stays red.
 */
function cleanPaper(src: ImageData) {
  const { width: w, height: h, data: d } = src;
  const paper = paperMap(d, w, h);
  const out = new ImageData(w, h);
  const o = out.data;
  const P = new Float32Array(3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      paper(x, y, P);
      const pr = Math.max(P[0], 1);
      const pg = Math.max(P[1], 1);
      const pb = Math.max(P[2], 1);
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const a = Math.max(0, (pr - r) / pr, (pg - g) / pg, (pb - b) / pb);
      const alpha = smoothstep(GRAIN, SOLID, a) * (d[i + 3] / 255);
      if (alpha <= 0) continue;
      o[i] = clamp255(pr - (pr - r) / a);
      o[i + 1] = clamp255(pg - (pg - g) / a);
      o[i + 2] = clamp255(pb - (pb - b) / a);
      o[i + 3] = Math.round(alpha * 255);
    }
  }
  return out;
}

// ── Trim and finish ─────────────────────────────────────────────────────────

type Box = { x: number; y: number; w: number; h: number };

/**
 * The part of the image that holds the ink, from how much ink each row and
 * column has (so a stray speck at the edge doesn't count), with a little room
 * around it. Null when there is no ink at all.
 */
function inkBox(alpha: (i: number) => number, w: number, h: number): Box | null {
  const cols = new Float64Array(w);
  const rows = new Float64Array(h);
  let total = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = alpha(y * w + x);
      if (a < 16) continue;
      cols[x] += a;
      rows[y] += a;
      total += a;
    }
  }
  if (total < 255 * 40) return null;
  const edge = (sums: Float64Array, fromEnd: boolean) => {
    const cut = total * 0.002;
    let acc = 0;
    for (let k = 0; k < sums.length; k++) {
      const idx = fromEnd ? sums.length - 1 - k : k;
      acc += sums[idx];
      if (acc > cut) return idx;
    }
    return fromEnd ? sums.length - 1 : 0;
  };
  let x0 = edge(cols, false);
  let x1 = edge(cols, true);
  let y0 = edge(rows, false);
  let y1 = edge(rows, true);
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04) + 2;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad);
  y1 = Math.min(h - 1, y1 + pad);
  // Never thinner than an eighth of its length (a single stroke would print as a sliver).
  const minSide = Math.round(Math.max(x1 - x0, y1 - y0) / 8);
  const grow = (lo: number, hi: number, max: number) => {
    const need = minSide - (hi - lo + 1);
    if (need <= 0) return [lo, hi];
    const a = Math.max(0, lo - Math.ceil(need / 2));
    return [a, Math.min(max - 1, a + minSide - 1)];
  };
  [x0, x1] = grow(x0, x1, w);
  [y0, y1] = grow(y0, y1, h);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Ink is one colour per stroke: each pixel's colour becomes the average of its
 * neighbours' (weighted by how much ink they hold), so a photo's grain doesn't
 * speckle the ink. Transparency is left as it is.
 */
function evenInk(d: Uint8ClampedArray, w: number, h: number) {
  const src = new Uint8ClampedArray(d);
  const R = 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!src[i + 3]) continue;
      let r = 0;
      let g = 0;
      let b = 0;
      let sum = 0;
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const j = (yy * w + xx) * 4;
          const a = src[j + 3];
          r += src[j] * a;
          g += src[j + 1] * a;
          b += src[j + 2] * a;
          sum += a;
        }
      }
      d[i] = r / sum;
      d[i + 1] = g / sum;
      d[i + 2] = b / sum;
    }
  }
}

/**
 * Crops to `box`, resizes, and saves as PNG. "photo": ink cleaned from a photo
 * (grain evened out); "ink": already clean ink on transparent; "opaque": the
 * paper was kept, so it is saved as it is.
 */
function finish(src: HTMLCanvasElement, box: Box, kind: "photo" | "ink" | "opaque"): Prepared {
  const k = Math.min(1, OUT_SIDE / Math.max(box.w, box.h));
  const out = makeCanvas(Math.max(8, box.w * k), Math.max(8, box.h * k));
  const ctx = ctx2d(out);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, box.x, box.y, box.w, box.h, 0, 0, out.width, out.height);
  if (kind === "opaque") return { dataUrl: out.toDataURL("image/png"), width: out.width, height: out.height };
  // Fewer colour and see-through steps: invisible in ink on paper, but a photo's
  // grain no longer bloats the file (and every PDF it is printed on).
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  if (kind === "photo") evenInk(d, out.width, out.height);
  for (let i = 0; i < d.length; i += 4) {
    const a = Math.round(d[i + 3] / 17) * 17;
    d[i + 3] = a;
    if (!a) {
      d[i] = d[i + 1] = d[i + 2] = 0;
      continue;
    }
    d[i] = Math.min(255, Math.round(d[i] / 12) * 12);
    d[i + 1] = Math.min(255, Math.round(d[i + 1] / 12) * 12);
    d[i + 2] = Math.min(255, Math.round(d[i + 2] / 12) * 12);
  }
  ctx.putImageData(img, 0, 0);
  return { dataUrl: out.toDataURL("image/png"), width: out.width, height: out.height };
}

const NO_INK = "We couldn't find a signature in this image. Try a clearer photo on plain paper.";

/**
 * The PNG to save from a chosen image. `clean` makes the paper see-through
 * (ignored for an image that is see-through already).
 */
export function prepareUpload(src: Source, clean: boolean): Prepared {
  const { canvas } = src;
  const w = canvas.width;
  const h = canvas.height;
  const pixels = ctx2d(canvas).getImageData(0, 0, w, h);
  if (src.transparent) {
    const d = pixels.data;
    const box = inkBox((i) => d[i * 4 + 3], w, h);
    if (!box) throw new Error(NO_INK);
    return finish(canvas, box, "ink");
  }
  const cleaned = cleanPaper(pixels);
  const box = inkBox((i) => cleaned.data[i * 4 + 3], w, h);
  if (!box) throw new Error(NO_INK);
  if (!clean) return finish(canvas, box, "opaque");
  const tmp = makeCanvas(w, h);
  ctx2d(tmp).putImageData(cleaned, 0, 0);
  return finish(tmp, box, "photo");
}

// ── Drawn on screen ─────────────────────────────────────────────────────────

export type Point = { x: number; y: number; t: number };
export type Stroke = { color: string; width: number; points: Point[] };

const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Draws pen strokes (in pad pixels) at `scale`: smooth curves through the
 * points, a little thicker where the pen moved slowly — like real ink.
 */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], scale: number) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  strokes.forEach((s) => {
    const p = s.points;
    if (!p.length) return;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    if (p.length === 1) {
      ctx.beginPath();
      ctx.arc(p[0].x * scale, p[0].y * scale, s.width * 0.6 * scale, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    let width = s.width;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1];
      const b = p[i];
      const speed = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.t - a.t);
      const target = s.width * Math.min(1.25, Math.max(0.45, 1.25 - 0.35 * Math.min(speed, 2.5)));
      width += (target - width) * 0.35;
      const from = i === 1 ? a : mid(p[i - 2], a);
      const to = mid(a, b);
      ctx.lineWidth = width * scale;
      ctx.beginPath();
      ctx.moveTo(from.x * scale, from.y * scale);
      ctx.quadraticCurveTo(a.x * scale, a.y * scale, to.x * scale, to.y * scale);
      ctx.stroke();
    }
    const last = p[p.length - 1];
    const before = mid(p[p.length - 2], last);
    ctx.beginPath();
    ctx.moveTo(before.x * scale, before.y * scale);
    ctx.lineTo(last.x * scale, last.y * scale);
    ctx.stroke();
  });
}

/** The PNG to save from strokes drawn on a pad of padW × padH pixels. */
export function prepareDrawing(strokes: Stroke[], padW: number, padH: number): Prepared {
  const SCALE = 3;
  const canvas = makeCanvas(padW * SCALE, padH * SCALE);
  const ctx = ctx2d(canvas);
  drawStrokes(ctx, strokes, SCALE);
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const box = inkBox((i) => d[i * 4 + 3], canvas.width, canvas.height);
  if (!box) throw new Error("Sign in the box first");
  return finish(canvas, box, "ink");
}
