import type { Segmentation } from "../segmentation";
import { dblClickPatch } from "./dbl-click";
import { patchKeymap } from "./patch-keymap";

export const getChsPatchExtension = (segmentation: Segmentation) => [
  dblClickPatch(segmentation),
  patchKeymap(segmentation),
];
