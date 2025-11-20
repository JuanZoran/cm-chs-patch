/* eslint-disable prefer-arrow/prefer-arrow-functions */
import { EditorSelection } from "@codemirror/state";
import type { SelectionRange } from "@codemirror/state";
import type { MouseSelectionStyle } from "@codemirror/view";
import { EditorView } from "@codemirror/view";

import type CMChsPatch from "../../chsp-main";
import cm6GetChsSeg from "../get-seg";
export const dblClickPatch = (plugin: CMChsPatch) => {
  const rangeForPos = (
    view: EditorView,
    pos: number,
  ): SelectionRange => {
    const baseRange =
      view.state.wordAt(pos) ?? EditorSelection.range(pos, pos);
    return (
      cm6GetChsSeg(plugin, pos, baseRange, view.state) ?? baseRange
    );
  };
  const dblClickPatch = EditorView.mouseSelectionStyle.of((view, event) => {
    // Only handle double clicks
    if (event.button !== 0 || event.detail !== 2) return null;

    const posAtEvent = (e: MouseEvent): number | null => {
      const pos = view.posAtCoords(
        { x: e.clientX, y: e.clientY },
        false,
      );
      return typeof pos === "number" ? pos : pos?.pos ?? null;
    };

    const startPos = posAtEvent(event);
    if (startPos == null) return null;

    const startRange = rangeForPos(view, startPos);
    let startSel = view.state.selection;
    let lastPos = startPos;
    let lastEvent: MouseEvent | null = event;
    return {
      update(update) {
        if (update.docChanged) {
          lastPos = update.changes.mapPos(lastPos);
          startSel = startSel.map(update.changes);
          lastEvent = null;
        }
      },
      get(event, extend, multiple) {
        let curPos: number | null;
        if (
          lastEvent &&
          event.clientX == lastEvent.clientX &&
          event.clientY == lastEvent.clientY
        ) {
          curPos = lastPos;
        } else {
          curPos = posAtEvent(event);
          if (curPos == null) return startSel;
          lastPos = curPos;
          lastEvent = event;
        }
        const range = rangeForPos(view, curPos);
        if (!extend && startPos !== curPos) {
          const from = Math.min(startRange.from, range.from);
          const to = Math.max(startRange.to, range.to);
          return EditorSelection.create([EditorSelection.range(from, to)]);
        }
        if (extend) {
          return startSel.replaceRange(
            startSel.main.extend(range.from, range.to),
          );
        } else if (multiple) {
          return startSel.addRange(range);
        } else {
          return EditorSelection.create([range]);
        }
      },
    } as MouseSelectionStyle;
  });
  return dblClickPatch;
};
