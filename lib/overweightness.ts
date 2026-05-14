// Math translated from grumd/osu-pps update-scripts/fetch-*.js.

export function magnitudeByIndex(index: number): number {
  return Math.pow(Math.pow(index - 100, 2) / 10000, 20);
}

export type OverweightnessInputs = {
  x: number;
  adj: number;
  h: number;
};

export function overweightness({ x, adj, h }: OverweightnessInputs): number {
  const safeAdj = Math.max(1, adj);
  const safeH = Math.max(1, h);
  return x / Math.pow(safeAdj, 0.65) / Math.pow(safeH, 0.35);
}
