import { AudioStatistics, useDeveloperInfo, VideoStatistics } from "../../../../contexts/DeveloperInfoContext.tsx";
import { useMemo } from "react";
import { calculateAudioScore, calculateVideoScore } from "./rtcMosScore.ts";
import { SIMULCAST_BANDWIDTH_LIMITS } from "../../bandwidth.tsx";


const maxScoreHighLayer = calculateVideoScore({
  codec: "",
  bitrate: SIMULCAST_BANDWIDTH_LIMITS.get("h")! * 1024,
  bufferDelay: 0,
  roundTripTime: 0,
  frameRate: 30,
  expectedFrameRate: 30,
  expectedWidth: 1280,
  expectedHeight: 720
});

const maxScoreMediumLayer = calculateVideoScore({
  codec: "",
  bitrate: SIMULCAST_BANDWIDTH_LIMITS.get("m")! * 1024,
  bufferDelay: 0,
  roundTripTime: 0,
  frameRate: 30,
  expectedFrameRate: 30,
  expectedWidth: 1280,
  expectedHeight: 720
});

const maxScoreLowLayer = calculateVideoScore({
  codec: "",
  bitrate: SIMULCAST_BANDWIDTH_LIMITS.get("l")! * 1024,
  bufferDelay: 0,
  roundTripTime: 0,
  frameRate: 30,
  expectedFrameRate: 30,
  expectedWidth: 1280,
  expectedHeight: 720
});

const maxAudioScore = calculateAudioScore(
  {
    bitrate: 30_000,
    bufferDelay: 0,
    roundTripTime: 0,
    packetLoss: 0,
    fec: true,
    dtx: false
  });


export type Props = { videoTrackId: string | null, audioTrackId: string | null }

const numberFormatter = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 3 });

export const StatisticsLayer = ({ videoTrackId, audioTrackId }: Props) => {

  const { statistics } = useDeveloperInfo();

  const videoRawStats = statistics.data[videoTrackId || ""];
  const videoStats: VideoStatistics | undefined = videoRawStats?.type === "video" ? videoRawStats : undefined;

  const videoScore = useMemo(() => {
    if (!videoStats) return 0;

    return calculateVideoScore(
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
  }, [videoStats]);

  const audioRawStats = statistics.data[audioTrackId || ""];
  const audioStats: AudioStatistics | undefined = audioRawStats?.type === "audio" ? audioRawStats : undefined;

  const audioScore = useMemo(() => {
    if (!audioStats) return 0;

    return calculateAudioScore(
      {
        bitrate: audioStats.bitrate,
        bufferDelay: audioStats.bufferDelay,
        roundTripTime: audioStats.roundTripTime,
        packetLoss: audioStats.packetLoss,
        fec: audioStats.fec,
        dtx: audioStats.dtx
      });
  }, [audioStats]);

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
        <th>score</th>
        <td>{videoScore.toString()}</td>
        <td>{audioScore.toString()}</td>
      </tr>
      <tr>
        <th>bitrate</th>
        <td>{numberFormatter.format(videoStats?.bitrate ?? NaN).toString()}</td>
        <td>{numberFormatter.format(audioStats?.bitrate ?? NaN).toString()}</td>
      </tr>
      <tr>
        <th>bufferDelay</th>
        <td>{numberFormatter.format(videoStats?.bufferDelay ?? NaN).toString()}</td>
        <td>{numberFormatter.format(audioStats?.bufferDelay ?? NaN).toString()}</td>
      </tr>
      <tr>
        <th>roundTripTime</th>
        <td>{numberFormatter.format(videoStats?.roundTripTime ?? NaN).toString()}</td>
        <td>{numberFormatter.format(audioStats?.roundTripTime ?? NaN).toString()}</td>
      </tr>
      <tr>
        <th>packetLoss</th>
        <td>{videoStats?.packetLoss ?? NaN.toString()}</td>
        <td>{audioStats?.packetLoss ?? NaN.toString()}</td>
      </tr>
      <tr>
        <th>frameRate</th>
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
        <th>max score</th>
        <td>{maxScoreHighLayer}, {maxScoreMediumLayer}, {maxScoreLowLayer}</td>
        <td>{maxAudioScore}</td>
      </tr>
      </tbody>
    </table>
  </div>;
};
