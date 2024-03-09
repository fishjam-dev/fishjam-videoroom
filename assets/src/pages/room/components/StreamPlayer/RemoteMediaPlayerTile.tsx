import { ComponentProps, FC } from "react";
import { TrackEncoding } from "@jellyfish-dev/react-client-sdk";
import { useAutomaticEncodingSwitching } from "../../hooks/useAutomaticEncodingSwitching";
import { SimulcastEncodingToReceive } from "./simulcast/SimulcastEncodingToReceive";
import GenericMediaPlayerTile from "./GenericMediaPlayerTile";
import { useTracks } from "../../../../jellyfish.types.ts";
import { useDeveloperInfo } from "../../../../contexts/DeveloperInfoContext.tsx";
import { calculateAudioScore, calculateVideoScore } from "./rtcMosScore.ts";
import { SIMULCAST_BANDWIDTH_LIMITS } from "../../bandwidth.tsx";

export type Props = {
  peerId: string | null;
  remoteTrackId: string | null;
  encodingQuality: TrackEncoding | null;
  showSimulcast: boolean;
  forceEncoding: TrackEncoding | null;
} & ComponentProps<typeof GenericMediaPlayerTile>;

const maxScoreHighLayer = calculateVideoScore({
  codec: "",
  bitrate: SIMULCAST_BANDWIDTH_LIMITS.get("h")!,
  bufferDelay: 0,
  roundTripTime: 0,
  frameRate: 30,
  expectedFrameRate: 30,
  expectedWidth: 1280,
  expectedHeight: 720
});

const maxScoreMediumLayer = calculateVideoScore({
  codec: "",
  bitrate: SIMULCAST_BANDWIDTH_LIMITS.get("m")!,
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
  bitrate: SIMULCAST_BANDWIDTH_LIMITS.get("l")!,
  bufferDelay: 0,
  roundTripTime: 0,
  frameRate: 30,
  expectedFrameRate: 30,
  expectedWidth: 1280,
  expectedHeight: 720
  // expectedWidth: 320,
  // expectedHeight: 180
});

// todo divide to ScreenShare and RemoteTile
const RemoteMediaPlayerTile: FC<Props> = (
  {
    peerId,
    video,
    audio,
    flipHorizontally,
    remoteTrackId,
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

  const track = tracks[remoteTrackId ?? ""];

  const { ref, setTargetEncoding, targetEncoding, smartEncoding, smartEncodingStatus, setSmartEncodingStatus } =
    useAutomaticEncodingSwitching(
      encodingQuality,
      peerId,
      remoteTrackId,
      !track?.simulcastConfig?.enabled,
      forceEncoding
    );

  const videoStats = stats[track?.track?.id || ""];
  const audioStats = stats[track?.track?.id || ""];

  const videoScore = videoStats ? calculateVideoScore(
    {
      codec: videoStats.codec,
      bitrate: videoStats.bitrate,
      bufferDelay: videoStats.bufferDelay,
      roundTripTime: videoStats.roundTripTime,
      frameRate: videoStats.frameRate,
      expectedWidth: 1280,
      expectedFrameRate: 24,
      expectedHeight: 720
    }) : 0;

  const audioScore = videoStats ? calculateAudioScore(
    {
      bitrate: audioStats.bitrate,
      bufferDelay: audioStats.bufferDelay,
      roundTripTime: audioStats.roundTripTime,
      packetLoss: audioStats.packetLoss,
      fec: false,
      dtx: false,
    }) : 0;

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
            <div className="flex">Max score: h {maxScoreHighLayer}, m {maxScoreMediumLayer}, l: {maxScoreLowLayer}</div>
            <div className="flex">codec ID: {videoStats?.codec}</div>
            <div className="flex">bitrate: {videoStats?.bitrate}</div>
            <div className="flex">bufferDelay: {videoStats?.bufferDelay}</div>
            <div className="flex">roundTripTime: {videoStats?.roundTripTime}</div>
            <div className="flex">frameRate: {videoStats?.frameRate}</div>
            <div className="flex">Video score: {videoScore}</div>

            <div className="flex">Audio score: {audioScore}</div>
          </div>
          {layers}
          {showSimulcast && (
            <SimulcastEncodingToReceive
              currentEncoding={encodingQuality}
              disabled={!video || !track?.simulcastConfig?.enabled}
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
