import { ComponentProps, FC } from "react";
import { TrackEncoding } from "@jellyfish-dev/react-client-sdk";
import { useAutomaticEncodingSwitching } from "../../hooks/useAutomaticEncodingSwitching";
import { SimulcastEncodingToReceive } from "./simulcast/SimulcastEncodingToReceive";
import GenericMediaPlayerTile from "./GenericMediaPlayerTile";
import { useTracks } from "../../../../jellyfish.types.ts";
import { useDeveloperInfo } from "../../../../contexts/DeveloperInfoContext.tsx";
import { calculateVideoScore } from "./rtcMosScore.ts";

export type Props = {
  peerId: string | null;
  remoteTrackId: string | null;
  encodingQuality: TrackEncoding | null;
  showSimulcast: boolean;
  forceEncoding: TrackEncoding | null;
} & ComponentProps<typeof GenericMediaPlayerTile>;

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

  const expectedWidth = 1280;
  const expectedHeight = 720;
  const expectedFrameRate = 24;

  const codec = stats[track?.track?.id || ""]?.codec ?? "";
  const bitrate = stats[track?.track?.id || ""]?.bitrate ?? 0;
  const bufferDelay = stats[track?.track?.id || ""]?.bufferDelay ?? 0;
  const roundTripTime = stats[track?.track?.id || ""]?.roundTripTime ?? 0;
  const frameRate = stats[track?.track?.id || ""]?.frameRate ?? 0;

  const videoScore = calculateVideoScore(
    {
      codec,
      bitrate,
      bufferDelay,
      roundTripTime,
      frameRate,
      expectedWidth,
      expectedFrameRate,
      expectedHeight
    });

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
            Additional layer
            <div className="flex">codec ID: {codec ?? "Unknown"}</div>
            <div className="flex">bitrate: {bitrate ?? "Unknown"}</div>
            <div className="flex">bufferDelay: {bufferDelay ?? "Unknown"}</div>
            <div className="flex">width: {width ?? "Unknown"}</div>
            <div className="flex">height: {height ?? "Unknown"}</div>
            <div className="flex">packetLoss: {packetLoss ?? "Unknown"}</div>
            <div className="flex">roundTripTime: {roundTripTime ?? "Unknown"}</div>
            <div className="flex">frameRate: {frameRate ?? "Unknown"}</div>
            <div className="flex">score: {videoScore ?? "Unknown"}</div>
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
