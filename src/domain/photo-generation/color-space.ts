export interface LabColor { l: number; a: number; b: number }

export function rgbToLab(red: number, green: number, blue: number): LabColor {
  const linear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const r = linear(red), g = linear(green), b = linear(blue);
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const f = (value: number) => value > 216 / 24389 ? Math.cbrt(value) : (24389 / 27 * value + 16) / 116;
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) };
}

const radians = (degrees: number) => degrees * Math.PI / 180;
const degrees = (radiansValue: number) => radiansValue * 180 / Math.PI;
const hue = (b: number, a: number) => {
  const value = degrees(Math.atan2(b, a));
  return value >= 0 ? value : value + 360;
};

export function ciede2000(first: LabColor, second: LabColor): number {
  const c1 = Math.hypot(first.a, first.b), c2 = Math.hypot(second.a, second.b);
  const meanC = (c1 + c2) / 2;
  const g = 0.5 * (1 - Math.sqrt(meanC ** 7 / (meanC ** 7 + 25 ** 7)));
  const a1 = (1 + g) * first.a, a2 = (1 + g) * second.a;
  const cp1 = Math.hypot(a1, first.b), cp2 = Math.hypot(a2, second.b);
  const h1 = hue(first.b, a1), h2 = hue(second.b, a2);
  const deltaL = second.l - first.l, deltaC = cp2 - cp1;
  let deltaHAngle = h2 - h1;
  if (cp1 * cp2 === 0) deltaHAngle = 0;
  else if (deltaHAngle > 180) deltaHAngle -= 360;
  else if (deltaHAngle < -180) deltaHAngle += 360;
  const deltaH = 2 * Math.sqrt(cp1 * cp2) * Math.sin(radians(deltaHAngle / 2));
  const meanL = (first.l + second.l) / 2, meanCp = (cp1 + cp2) / 2;
  let meanH = h1 + h2;
  if (cp1 * cp2 === 0) meanH = h1 + h2;
  else if (Math.abs(h1 - h2) <= 180) meanH /= 2;
  else meanH = (meanH + (meanH < 360 ? 360 : -360)) / 2;
  const t = 1 - 0.17 * Math.cos(radians(meanH - 30)) + 0.24 * Math.cos(radians(2 * meanH))
    + 0.32 * Math.cos(radians(3 * meanH + 6)) - 0.2 * Math.cos(radians(4 * meanH - 63));
  const sl = 1 + 0.015 * (meanL - 50) ** 2 / Math.sqrt(20 + (meanL - 50) ** 2);
  const sc = 1 + 0.045 * meanCp, sh = 1 + 0.015 * meanCp * t;
  const rotation = 30 * Math.exp(-Math.pow((meanH - 275) / 25, 2));
  const rc = 2 * Math.sqrt(meanCp ** 7 / (meanCp ** 7 + 25 ** 7));
  const rt = -Math.sin(radians(2 * rotation)) * rc;
  const l = deltaL / sl, c = deltaC / sc, h = deltaH / sh;
  return Math.sqrt(l * l + c * c + h * h + rt * c * h);
}
