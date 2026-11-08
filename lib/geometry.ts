import type { PDFPage } from "@cantoo/pdf-lib";

/**
 * Describes a page as the reader sees it (after /Rotate is applied), with y measured from the bottom.
 * `toPage` converts a visual point into the page's own coordinate space, and `rotation` is the angle
 * (counter-clockwise, degrees) that content must be drawn at so it appears upright.
 */
export function visualFrame(page: PDFPage) {
  const r = (((page.getRotation().angle % 360) + 360) % 360) as 0 | 90 | 180 | 270;
  const box = page.getCropBox();
  const W = box.width;
  const H = box.height;
  const width = r % 180 ? H : W;
  const height = r % 180 ? W : H;
  const toPage = (vx: number, vy: number) => {
    let x: number;
    let y: number;
    switch (r) {
      case 90:
        x = W - vy;
        y = vx;
        break;
      case 180:
        x = W - vx;
        y = H - vy;
        break;
      case 270:
        x = vy;
        y = H - vx;
        break;
      default:
        x = vx;
        y = vy;
    }
    return { x: x + box.x, y: y + box.y };
  };
  return { width, height, rotation: r, toPage };
}

/** Rotate a vector by `deg` degrees counter-clockwise. */
export function rotateVec(x: number, y: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
}
