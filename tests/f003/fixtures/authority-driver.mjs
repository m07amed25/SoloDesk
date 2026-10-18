import { MapAdapter } from "../doubles/map-adapter.mjs";
export const recordSynthetic = (request, context, adapter = new MapAdapter()) =>
  adapter.apply(request, context);
