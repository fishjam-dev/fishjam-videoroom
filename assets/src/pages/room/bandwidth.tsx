import { BandwidthLimit, SimulcastBandwidthLimit, TrackBandwidthLimit } from "@fishjam-dev/react-client";
import { TrackType } from "../../fishjam.ts";

const NO_LIMIT: BandwidthLimit = 0;
const DEFAULT_LIMIT: BandwidthLimit = 1500;
export const SIMULCAST_BANDWIDTH_LIMITS: SimulcastBandwidthLimit = new Map([
  ["h", 1500],
  ["m", 500],
  ["l", 100],
]);

export const selectBandwidthLimit = (type: TrackType, simulcast: boolean): TrackBandwidthLimit => {
  if (type === "audio") return NO_LIMIT;
  if (simulcast) return SIMULCAST_BANDWIDTH_LIMITS;
  return DEFAULT_LIMIT;
};
