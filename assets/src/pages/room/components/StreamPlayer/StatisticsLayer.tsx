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
    bitrate: 15000,
    bufferDelay: 0,
    roundTripTime: 0,
    packetLoss: 0,
    fec: false,
    dtx: false
  });


export type Props = { videoTrackId: string | null, audioTrackId: string | null }

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

  return <div className="absolute right-0 top-0 z-50 w-full text-sm text-gray-700 md:text-base">
    <div className="flex">Video estimated max score: h {maxScoreHighLayer}, m {maxScoreMediumLayer},
      l: {maxScoreLowLayer}</div>
    <div className="flex">Video score: {videoScore}</div>
    <div className="flex">Video codec: {videoStats?.codec}</div>
    <div className="flex">Video bitrate: {videoStats?.bitrate}</div>
    <div className="flex">Video bufferDelay: {videoStats?.bufferDelay}</div>
    <div className="flex">Video roundTripTime: {videoStats?.roundTripTime}</div>
    <div className="flex">Video frameRate: {videoStats?.frameRate}</div>

    <div className="flex">Audio estimated max score: {maxAudioScore}</div>
    <div className="flex">Audio score: {audioScore}</div>
    <div className="flex">Audio bitrate: {audioStats?.bitrate}</div>
    <div className="flex">Audio bufferDelay: {audioStats?.bufferDelay}</div>
    <div className="flex">Audio roundTripTime: {audioStats?.roundTripTime}</div>
    <div className="flex">Audio packetLoss: {audioStats?.packetLoss}</div>
  </div>;
};
