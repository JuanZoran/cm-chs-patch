import { chsPatternGlobal, isChs } from "./utils.js";

export const CHS_RANGE_LIMIT = 10;

type CutFn = (text: string, opts?: { search?: boolean }) => string[];

type SegCache = Map<string, string[]>;

// Simple bounded cache to avoid repeated segmentation on identical snippets
const getSegments = (cache: SegCache, cut: CutFn, text: string) => {
  const cached = cache.get(text);
  if (cached) return cached;
  const segs = cut(text);
  cache.set(text, segs);
  if (cache.size > 50) {
    const first = cache.keys().next().value;
    cache.delete(first);
  }
  return segs;
};

export type Segmentation = ReturnType<typeof createSegmentation>;

export const createSegmentation = (deps: { cut: CutFn }) => {
  const cache: SegCache = new Map();

  const getSegRangeFromCursor = (
    cursor: number,
    { from, to, text }: { from: number; to: number; text: string },
  ) => {
    if (!isChs(text)) {
      return null;
    }
    if (cursor - from > CHS_RANGE_LIMIT) {
      const newFrom = cursor - CHS_RANGE_LIMIT;
      if (isChs(text.slice(newFrom, cursor))) {
        text = text.slice(newFrom - from);
        from = newFrom;
      }
    }
    if (to - cursor > CHS_RANGE_LIMIT) {
      const newTo = cursor + CHS_RANGE_LIMIT;
      if (isChs(text.slice(cursor, newTo))) {
        text = text.slice(0, newTo - to);
        to = newTo;
      }
    }
    const segResult = getSegments(cache, deps.cut, text);

    if (cursor === to) {
      const lastSeg = segResult[segResult.length - 1];
      if (!lastSeg) return null;
      return { from: to - lastSeg.length, to };
    }

    let chunkStart = 0;
    let chunkEnd = 0;
    const relativePos = cursor - from;

    for (const seg of segResult) {
      chunkEnd = chunkStart + seg.length;
      if (relativePos >= chunkStart && relativePos < chunkEnd) {
        break;
      }
      chunkStart += seg.length;
    }
    to = chunkEnd + from;
    from += chunkStart;
    return { from, to };
  };

  const getSegDestFromGroup = (
    startPos: number,
    nextPos: number,
    sliceDoc: (from: number, to: number) => string,
  ): number | null => {
    const forward = startPos < nextPos;
    const text = limitChsChars(
      forward ? sliceDoc(startPos, nextPos) : sliceDoc(nextPos, startPos),
      forward,
    );
    const segResult = [...getSegments(cache, deps.cut, text)];
    if (segResult.length === 0) return null;

    let length = 0;
    let seg: string;
    do {
      seg = forward ? segResult.shift()! : segResult.pop()!;
      length += seg.length;
    } while (/\s+/.test(seg));

    return forward ? startPos + length : startPos - length;
  };

  return {
    getSegRangeFromCursor,
    getSegDestFromGroup,
  };
};

function limitChsChars(input: string, forward: boolean) {
  if (!forward) {
    input = [...input].reverse().join("");
  }
  let endingIndex = input.length - 1;
  let chsCount = 0;
  for (const { index } of input.matchAll(chsPatternGlobal)) {
    chsCount++;
    endingIndex = index;
    if (chsCount > CHS_RANGE_LIMIT) break;
  }
  const output = input.slice(0, endingIndex + 1);
  if (!forward) {
    return [...output].reverse().join("");
  }
  return output;
}
