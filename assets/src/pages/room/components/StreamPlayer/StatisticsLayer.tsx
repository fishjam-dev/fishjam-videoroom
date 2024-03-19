import { AudioStatistics, useDeveloperInfo, VideoStatistics } from "../../../../contexts/DeveloperInfoContext.tsx";
import { calculateAudioScore, calculateVideoScore } from "./rtcMOS1.ts";
import { SIMULCAST_BANDWIDTH_LIMITS } from "../../bandwidth.tsx";
import { calculateOpenTokAudioScore, calculateOpenTokVideoScore } from "./rtcMOS2.ts";


const maxScore1HighLayer = calculateVideoScore({
  codec: "",
  bitrate: SIMULCAST_BANDWIDTH_LIMITS.get("h")! * 1024,
  bufferDelay: 0,
  roundTripTime: 0,
  frameRate: 30,
  expectedFrameRate: 30,
  expectedWidth: 1280,
  expectedHeight: 720
});

const maxScore1MediumLayer = calculateVideoScore({
  codec: "",
  bitrate: SIMULCAST_BANDWIDTH_LIMITS.get("m")! * 1024,
  bufferDelay: 0,
  roundTripTime: 0,
  frameRate: 30,
  expectedFrameRate: 30,
  expectedWidth: 1280,
  expectedHeight: 720
});

const maxScore1LowLayer = calculateVideoScore({
  codec: "",
  bitrate: SIMULCAST_BANDWIDTH_LIMITS.get("l")! * 1024,
  bufferDelay: 0,
  roundTripTime: 0,
  frameRate: 30,
  expectedFrameRate: 30,
  expectedWidth: 1280,
  expectedHeight: 720
});

const maxScore2HighLayer = calculateOpenTokVideoScore({
  width: 1280,
  height: 720,
  bitrate: SIMULCAST_BANDWIDTH_LIMITS.get("h")! * 1024
});

const maxScore2MediumLayer = calculateOpenTokVideoScore({
  width: 1280,
  height: 720,
  bitrate: SIMULCAST_BANDWIDTH_LIMITS.get("m")! * 1024
});

const maxScore2LowLayer = calculateOpenTokVideoScore({
  width: 1280,
  height: 720,
  bitrate: SIMULCAST_BANDWIDTH_LIMITS.get("l")! * 1024
});

const maxAudioScore1 = calculateAudioScore(
  {
    bitrate: 30_000,
    bufferDelay: 0,
    roundTripTime: 0,
    packetLoss: 0,
    fec: true,
    dtx: false
  });

const maxAudioScore2 = calculateOpenTokAudioScore(
  {
    roundTripTime: 0,
    packetLoss: 0
  });


export type Props = { videoTrackId: string | null, audioTrackId: string | null }

const decimal3FractionFormatter = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3
});
const decimal2FractionFormatter = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const integerFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

export const StatisticsLayer = ({ videoTrackId, audioTrackId }: Props) => {

  const { statistics } = useDeveloperInfo();

  const videoRawStats = statistics.data[videoTrackId || ""];
  const videoStats: VideoStatistics | undefined = videoRawStats?.type === "video" ? videoRawStats : undefined;

  const videoScore = !videoStats ? 0 : calculateVideoScore(
    {
      codec: videoStats.codec,
      bitrate: videoStats.bitrate,
      bufferDelay: videoStats.bufferDelay,
      roundTripTime: videoStats.roundTripTime,
      frameRate: videoStats.frameRate,
      expectedWidth: 1280,
      expectedFrameRate: 24,
      expectedHeight: 720
    });

  const openTokVideoScore = !videoStats ? 0 : calculateOpenTokVideoScore({
    width: 1280,
    height: 720,
    bitrate: videoStats.bitrate
  });

  const audioRawStats = statistics.data[audioTrackId || ""];
  const audioStats: AudioStatistics | undefined = audioRawStats?.type === "audio" ? audioRawStats : undefined;

  const audioScore = !audioStats ? 0 : calculateAudioScore(
    {
      bitrate: audioStats.bitrate,
      bufferDelay: audioStats.bufferDelay,
      roundTripTime: audioStats.roundTripTime,
      packetLoss: audioStats.packetLoss,
      fec: audioStats.fec,
      dtx: audioStats.dtx
    });

  const openTokAudioScore = !audioStats ? 0 : calculateOpenTokAudioScore(
    {
      roundTripTime: audioStats.roundTripTime,
      packetLoss: audioStats.packetLoss
    });

  return <div className="absolute right-0 bottom-0 z-50 !text-xs text-black md:text-base bg-white/50 p-2">
    <table className="border-separate border-spacing-x-2">
      <thead>
      <tr>
        <th></th>
        <th>Video</th>
        <th>Audio</th>
      </tr>
      </thead>
      <tbody>
      <tr>
        <th>score 1 [unit]</th>
        <td>{decimal2FractionFormatter.format(videoScore).toString()} ({decimal2FractionFormatter.format(maxScore1HighLayer > 0 ? videoScore * 100 / maxScore1HighLayer : NaN).toString()}%)</td>
        <td>{decimal2FractionFormatter.format(audioScore).toString()}</td>
      </tr>
      <tr>
        <th>score 2 [unit]</th>
        <td>{decimal2FractionFormatter.format(openTokVideoScore).toString()} ({decimal2FractionFormatter.format(maxScore2HighLayer > 0 ? openTokVideoScore * 100 / maxScore2HighLayer : NaN).toString()}%)</td>
        <td>{decimal2FractionFormatter.format(openTokAudioScore).toString()} ({decimal2FractionFormatter.format(maxAudioScore2 > 0 ? openTokAudioScore * 100 / maxAudioScore2 : NaN).toString()}%)</td>
      </tr>
      <tr>
        <th>bitrate [bps]</th>
        <td>{integerFormatter.format(videoStats?.bitrate ?? NaN).toString()}</td>
        <td>{integerFormatter.format(audioStats?.bitrate ?? NaN).toString()}</td>
      </tr>
      <tr>
        <th>bufferDelay [s]</th>
        <td>{decimal3FractionFormatter.format(videoStats?.bufferDelay ?? NaN).toString()}</td>
        <td>{decimal3FractionFormatter.format(audioStats?.bufferDelay ?? NaN).toString()}</td>
      </tr>
      <tr>
        <th>roundTripTime [s]</th>
        <td>{decimal3FractionFormatter.format(videoStats?.roundTripTime ?? NaN).toString()}</td>
        <td>{decimal3FractionFormatter.format(audioStats?.roundTripTime ?? NaN).toString()}</td>
      </tr>
      <tr>
        <th>packetLoss [%]</th>
        <td>{decimal3FractionFormatter.format(videoStats?.packetLoss ?? NaN).toString()}</td>
        <td>{decimal3FractionFormatter.format(audioStats?.packetLoss ?? NaN).toString()}</td>
      </tr>
      <tr>
        <th>frameRate [fps]</th>
        <td>{videoStats?.frameRate ?? NaN.toString()}</td>
        <td></td>
      </tr>
      <tr>
        <th>videoCodec</th>
        <td>{videoStats?.codec}</td>
        <td></td>
      </tr>
      <tr>
        <th>fec</th>
        <td></td>
        <td>{audioStats?.fec?.toString()}</td>
      </tr>
      <tr>
        <th>est. max score 1</th>
        <td>{maxScore1HighLayer}, {maxScore1MediumLayer}, {maxScore1LowLayer}</td>
        <td>{maxAudioScore1}</td>
      </tr>
      <tr>
        <th>est. max score 2</th>
        <td>{decimal2FractionFormatter.format(maxScore2HighLayer).toString()}, {decimal2FractionFormatter.format(maxScore2MediumLayer).toString()}, {decimal2FractionFormatter.format(maxScore2LowLayer).toString()}</td>
        <td>{decimal2FractionFormatter.format(maxAudioScore2).toString()}</td>
      </tr>
      </tbody>
    </table>
  </div>;
};
