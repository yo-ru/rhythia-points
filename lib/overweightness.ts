export function magnitudeByIndex(index: number): number {
  return Math.pow(0.92, index);
}

export type OverweightnessInputs = {
  x: number;
  adj: number;
  h: number;
};

export function overweightness({ x, adj, h }: OverweightnessInputs): number {
  const safeAdj = Math.max(1, adj);
  const safeH = Math.max(1, h);
  return x / Math.pow(safeAdj, 0.65) / Math.log1p(safeH);
}
