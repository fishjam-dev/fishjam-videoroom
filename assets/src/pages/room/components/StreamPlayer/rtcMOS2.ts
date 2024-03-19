// Original implementation: https://github.com/wobbals/opentok-mos-estimator
// I just adjusted the code to our needs.
// This implementation reflects the score for the last second rather than for the entire session.

type VideoParams = {
  width: number,
  height: number,
  bitrate: number,
}

const targetBitrateForPixelCount = function(pixelCount: number) {
  // power function maps resolution to target bitrate, based on rumor config
  // values, with r^2 = 0.98. We're ignoring frame rate, assume 30.
  const y = 2.069924867 * Math.pow(Math.log10(pixelCount), 0.6250223771);
  return Math.pow(10, y);
};

const MIN_VIDEO_BITRATE = 30000;

export const calculateOpenTokVideoScore = ({ width, height, bitrate }: VideoParams) => {
  const targetBitrate = targetBitrateForPixelCount(width * height);

  if (bitrate < MIN_VIDEO_BITRATE) {
    return 0;
  }
  const newBitrate = Math.min(bitrate, targetBitrate);

  return (Math.log(newBitrate / MIN_VIDEO_BITRATE) /
    Math.log(targetBitrate / MIN_VIDEO_BITRATE)) * 4 + 1;
};

type AudioParams = {
  packetLoss: number,
  roundTripTime: number,
}

export const calculateOpenTokAudioScore = ({ packetLoss, roundTripTime }: AudioParams) => {
  const audioScore = function(rtt: number, plr: number) {
    const LOCAL_DELAY = 20; //20 msecs: typical frame duration
    function H(x) {
      return (x < 0 ? 0 : 1);
    }

    const a = 0; // ILBC: a=10
    const b = 19.8;
    const c = 29.7;

    //R = 94.2 − Id − Ie
    const R = function(rtt: number, packetLoss: number) {
      const d = rtt + LOCAL_DELAY;
      const Id = 0.024 * d + 0.11 * (d - 177.3) * H(d - 177.3);

      const P = packetLoss;
      const Ie = a + b * Math.log(1 + c * P);

      const R = 94.2 - Id - Ie;

      return R;
    };

    //For R < 0: MOS = 1
    //For 0 R 100: MOS = 1 + 0.035 R + 7.10E-6 R(R-60)(100-R)
    //For R > 100: MOS = 4.5
    const MOS = function(R) {
      if (R < 0) {
        return 1;
      }
      if (R > 100) {
        return 4.5;
      }
      return 1 + 0.035 * R + 7.10 / 1000000 * R * (R - 60) * (100 - R);
    };

    return MOS(R(rtt, plr));
  };

  return audioScore(roundTripTime, packetLoss);
};
