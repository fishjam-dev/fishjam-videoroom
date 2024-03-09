// This is rewritten implementation of https://github.com/ggarber/rtcscore

import { z } from "zod";

export const VideoStatsSchema = z.object({
  bitrate: z.number().default(0),
  roundTripTime: z.number().default(0),
  bufferDelay: z.number().default(0),
  codec: z.string().optional(),
  frameRate: z.number().default(0),
  packetLoss: z.number().optional().default(0)
});

export const AudioStatsSchema = z.object({
  bitrate: z.number().default(0),
  roundTripTime: z.number().default(0),
  bufferDelay: z.number().default(0),
  packetLoss: z.number().optional().default(0)
});

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export type VideoStats = z.infer<typeof VideoStatsSchema>
export type AudioStats = z.infer<typeof AudioStatsSchema>

export type ScoreVideoParams = Omit<VideoStats, "packetLoss"> & {
  expectedWidth: number;
  expectedHeight: number;
  expectedFrameRate: number;
}

export const calculateVideoScore = (
  {
    bitrate,
    roundTripTime,
    bufferDelay,
    codec,
    expectedWidth,
    expectedHeight,
    frameRate,
    expectedFrameRate
  }: ScoreVideoParams) => {
  const pixels = expectedWidth * expectedHeight;
  const codecFactor = codec === "vp9" ? 1.2 : 1.0;
  const delay = bufferDelay + roundTripTime / 2;
  // These parameters are generated with a logaritmic regression
  // on some very limited test data for now
  // They are based on the bits per pixel per frame (bPPPF)
  if (frameRate === 0) return 1;

  const bPPPF = (codecFactor * bitrate) / pixels / frameRate;
  const base = clamp(0.56 * Math.log(bPPPF) + 5.36, 1, 5);
  const MOS =
    base -
    1.9 * Math.log(expectedFrameRate / frameRate) -
    delay * 0.002;
  return clamp(Math.round(MOS * 100) / 100, 1, 5);
};

export type ScoreInputAudio = {
  bufferDelay: number;
  packetLoss: number;
  bitrate: number;
  roundTripTime: number;
  fec: boolean;
  dtx: boolean;
}

export const calculateAudioScore = ({ bitrate, roundTripTime, bufferDelay, fec, dtx, packetLoss }: ScoreInputAudio) => {
  // Audio MOS calculation is based on E-Model algorithm
  // Assume 20 packetization delay
  const delay = 20 + bufferDelay + roundTripTime / 2;
  const pl = packetLoss;
  const R0 = 100;
  // Ignore audio bitrate in dtx mode
  const Ie = dtx
    ? 8
    : bitrate
      ? clamp(55 - 4.6 * Math.log(bitrate), 0, 30)
      : 6;
  const Bpl = fec ? 20 : 10;
  const Ipl = Ie + (100 - Ie) * (pl / (pl + Bpl));

  const Id = delay * 0.03 + (delay > 150 ? 0.1 * delay - 150 : 0);
  const R = clamp(R0 - Ipl - Id, 0, 100);
  const MOS = 1 + 0.035 * R + (R * (R - 60) * (100 - R) * 7) / 1000000;

  return clamp(Math.round(MOS * 100) / 100, 1, 5);
};
