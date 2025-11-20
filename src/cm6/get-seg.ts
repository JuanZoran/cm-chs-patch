import type { EditorState, SelectionRange } from "@codemirror/state";
import { EditorSelection } from "@codemirror/state";

import type { Segmentation } from "../segmentation";

const cm6GetChsSeg = (
  segmentation: Segmentation,
  pos: number,
  srcRange: { from: number; to: number } | null,
  state: EditorState,
): SelectionRange | null => {
  if (!srcRange) return null;
  const { from, to } = srcRange,
    text = state.doc.sliceString(from, to);

  const chsSegResult = segmentation.getSegRangeFromCursor(pos, {
    from,
    to,
    text,
  });
  if (chsSegResult) {
    return EditorSelection.range(chsSegResult.from, chsSegResult.to);
  } else {
    return null;
  }
};

export default cm6GetChsSeg;
