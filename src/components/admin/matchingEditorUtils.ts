export const MATCHING_MIN = 4;
export const MATCHING_MAX = 8;

export const buildMatchingStem = (left: string[], right: string[]): string => {
  const L = left.map((s) => s.trim()).filter(Boolean);
  const R = right.map((s) => s.trim()).filter(Boolean);
  const leftPart = L.map((t, i) => `(${i + 1}) ${t}`).join("\n");
  const rightPart = R.map((t, i) => `${String.fromCharCode(65 + i)}. ${t}`).join("\n");
  return [leftPart, rightPart].filter(Boolean).join("\n\n");
};

export const parseMatchingContent = (raw: string): { stem: string; left: string[]; right: string[] } => {
  const blocks = raw
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
  if (blocks.length < 2) {
    return { stem: raw.trim(), left: [], right: [] };
  }
  const maybeLeft = blocks[blocks.length - 2].split("\n").map((s) => s.trim()).filter(Boolean);
  const maybeRight = blocks[blocks.length - 1].split("\n").map((s) => s.trim()).filter(Boolean);
  const leftMatched = maybeLeft.every((line) => /^\(\d+\)\s+/.test(line));
  const rightMatched = maybeRight.every((line) => /^[A-Z]\.\s+/.test(line));
  if (!leftMatched || !rightMatched) {
    return { stem: raw.trim(), left: [], right: [] };
  }
  const left = maybeLeft.map((line) => line.replace(/^\(\d+\)\s+/, "").trim());
  const right = maybeRight.map((line) => line.replace(/^[A-Z]\.\s+/, "").trim());
  const stem = blocks.slice(0, -2).join("\n\n").trim();
  return { stem, left, right };
};

export const parsePairRecord = (raw: string): Record<number, string> => {
  const next: Record<number, string> = {};
  raw
    .replace(/\n/g, ";")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((item) => {
      const [left, right] = item.split(":").map((s) => s.trim());
      const ln = Number(left);
      if (Number.isFinite(ln) && right) next[ln] = right.toUpperCase();
    });
  return next;
};

export const recordPairsToString = (rec: Record<number, string>, n: number): string =>
  Array.from({ length: n }, (_, i) => i + 1)
    .filter((k) => rec[k])
    .sort((a, b) => a - b)
    .map((k) => `${k}:${rec[k]}`)
    .join(";");
