import { ComponentProps, FC } from "react";
import { TrackEncoding } from "@fishjam-dev/react-client";
import { useAutomaticEncodingSwitching } from "../../hooks/useAutomaticEncodingSwitching";
import { SimulcastEncodingToReceive } from "./simulcast/SimulcastEncodingToReceive";
import GenericMediaPlayerTile from "./GenericMediaPlayerTile";
import { useTracks } from "../../../../fishjam.ts";
import { StatisticsLayer } from "./StatisticsLayer.tsx";
import { useDeveloperInfo } from "../../../../contexts/DeveloperInfoContext.tsx";

export type Props = {
  peerId: string | null;
  remoteVideoTrackId: string | null;
  remoteAudioTrackId: string | null;
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

  const videoTrack = tracks[remoteVideoTrackId ?? ""];

  const { ref, setTargetEncoding, targetEncoding, smartEncoding, smartEncodingStatus, setSmartEncodingStatus } =
    useAutomaticEncodingSwitching(
      encodingQuality,
      peerId,
      remoteVideoTrackId,
      !videoTrack?.simulcastConfig?.enabled,
      forceEncoding
    );

  const { statistics } = useDeveloperInfo();

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
          {layers}
          {statistics.status && <StatisticsLayer
            videoTrackId={tracks[remoteVideoTrackId ?? ""]?.track?.id || null}
            audioTrackId={tracks[remoteAudioTrackId ?? ""]?.track?.id || null}
          />}
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
