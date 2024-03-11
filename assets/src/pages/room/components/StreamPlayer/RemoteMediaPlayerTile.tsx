import { ComponentProps, FC, useMemo } from "react";
import { TrackEncoding } from "@jellyfish-dev/react-client-sdk";
import { useAutomaticEncodingSwitching } from "../../hooks/useAutomaticEncodingSwitching";
import { SimulcastEncodingToReceive } from "./simulcast/SimulcastEncodingToReceive";
import GenericMediaPlayerTile from "./GenericMediaPlayerTile";
import { useTracks } from "../../../../jellyfish.types.ts";
import { AudioStatistics, useDeveloperInfo, VideoStatistics } from "../../../../contexts/DeveloperInfoContext.tsx";
import { calculateAudioScore, calculateVideoScore } from "./rtcMosScore.ts";
import { SIMULCAST_BANDWIDTH_LIMITS } from "../../bandwidth.tsx";

export type Props = {
  peerId: string | null;
  remoteVideoTrackId: string | null;
  remoteAudioTrackId: string | null;
  encodingQuality: TrackEncoding | null;
  showSimulcast: boolean;
  forceEncoding: TrackEncoding | null;
} & ComponentProps<typeof GenericMediaPlayerTile>;

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
  // expectedWidth: 640,
  // expectedHeight: 360
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
  // expectedWidth: 320,
  // expectedHeight: 180
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

// todo divide to ScreenShare and RemoteTile
const RemoteMediaPlayerTile: FC<Props> = (
  {
    peerId,
    video,
    audio,
    flipHorizontally,
    remoteVideoTrackId,
    remoteAudioTrackId,
    encodingQuality,
    showSimulcast,
    layers,
    className,
    blockFillContent,
    forceEncoding
  }: Props
) => {
  const tracks = useTracks();
  const { stats } = useDeveloperInfo();

  const videoTrack = tracks[remoteVideoTrackId ?? ""];

  const { ref, setTargetEncoding, targetEncoding, smartEncoding, smartEncodingStatus, setSmartEncodingStatus } =
    useAutomaticEncodingSwitching(
      encodingQuality,
      peerId,
      remoteVideoTrackId,
      !videoTrack?.simulcastConfig?.enabled,
      forceEncoding
    );

  const videoRawStats = stats[videoTrack?.track?.id || ""]
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

  const audioTrack = tracks[remoteAudioTrackId ?? ""];
  const audioRawStats = stats[audioTrack?.track?.id || ""]
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

  return (
    <GenericMediaPlayerTile
      ref={ref}
      video={video}
      audio={audio}
      flipHorizontally={flipHorizontally}
      blockFillContent={blockFillContent}
      className={className}
      layers={
        <>
          <div className="absolute right-0 top-0 z-50 w-full text-sm text-gray-700 md:text-base">
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
          </div>
          {layers}
          {showSimulcast && (
            <SimulcastEncodingToReceive
              currentEncoding={encodingQuality}
              disabled={!video || !videoTrack?.simulcastConfig?.enabled}
              targetEncoding={targetEncoding || null}
              smartEncoding={smartEncoding}
              localSmartEncodingStatus={smartEncodingStatus}
              setLocalSmartEncodingStatus={setSmartEncodingStatus}
              setTargetEncoding={setTargetEncoding}
            />
          )}
        </>
      }
    />
  );
};

export default RemoteMediaPlayerTile;
