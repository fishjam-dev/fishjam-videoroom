import { ComponentProps, FC, useEffect } from "react";
import { TrackEncoding } from "@jellyfish-dev/react-client-sdk";
import { useAutomaticEncodingSwitching } from "../../hooks/useAutomaticEncodingSwitching";
import { SimulcastEncodingToReceive } from "./simulcast/SimulcastEncodingToReceive";
import GenericMediaPlayerTile from "./GenericMediaPlayerTile";
import { useTracks } from "../../../../jellyfish.types.ts";
import { ScoreInputAudio, ScoreInputVideo, useDeveloperInfo } from "../../../../contexts/DeveloperInfoContext.tsx";

/*
 * Stats
 * packetLoss: 0-100%
 * bitrate: bps
 * roundTripTime: ms
 * bufferDelay: ms
 * codec: opus / vp8 / vp9 / h264 (only used for video)
 * fec: boolean (ony used for audio)
 * dtx: boolean (ony used for audio)
 * qp: number (not used yet)
 * keyFrames: number (not used yet)
 * width: number; Resolution of the video received
 * expectedWidth: number; Resolution of the rendering widget
 * height: number; Resolution of the video received
 * expectedHeight: number; Resolution of the rendering widget
 * frameRate: number; FrameRate of the video received
 * expectedFrameRate: number; FrameRate of the video source
 */
function calculateScore(stats: { audio: Partial<ScoreInputAudio>, video: Partial<ScoreInputVideo> }) {
  const scores = { audio: 0, video: 0 };
  const { audio, video } = normalize(stats);
  if (audio) {
    // Audio MOS calculation is based on E-Model algorithm
    // Assume 20 packetization delay
    const delay = 20 + audio.bufferDelay + audio.roundTripTime / 2;
    const pl = audio.packetLoss;
    const R0 = 100;
    // Ignore audio bitrate in dtx mode
    const Ie = audio.dtx
      ? 8
      : audio.bitrate
        ? clamp(55 - 4.6 * Math.log(audio.bitrate), 0, 30)
        : 6;
    const Bpl = audio.fec ? 20 : 10;
    const Ipl = Ie + (100 - Ie) * (pl / (pl + Bpl));

    const Id = delay * 0.03 + (delay > 150 ? 0.1 * delay - 150 : 0);
    const R = clamp(R0 - Ipl - Id, 0, 100);
    const MOS = 1 + 0.035 * R + (R * (R - 60) * (100 - R) * 7) / 1000000;

    scores.audio = clamp(Math.round(MOS * 100) / 100, 1, 5);
  }
  if (video) {
    const pixels = video.expectedWidth * video.expectedHeight;
    const codecFactor = video.codec === "vp9" ? 1.2 : 1.0;
    const delay = video.bufferDelay + video.roundTripTime / 2;
    // These parameters are generated with a logaritmic regression
    // on some very limited test data for now
    // They are based on the bits per pixel per frame (bPPPF)
    if (video.frameRate !== 0) {
      const bPPPF = (codecFactor * video.bitrate) / pixels / video.frameRate;
      // const bPPPF = (codecFactor * 2_500_000) / pixels / video.frameRate;
      const base = clamp(0.56 * Math.log(bPPPF) + 5.36, 1, 5);
      const expectedLog = 1.9 * Math.log(video.expectedFrameRate / video.frameRate);
      const MOS =
        base -
        expectedLog -
        delay * 0.002;
      console.log({ base, MOS, delay, bPPPF, expectedLog, codecFactor });
      scores.video = clamp(Math.round(MOS * 100) / 100, 1, 5);
    } else {
      scores.video = 1;
    }
  }
  return scores;
}

// todo

function normalize(stats: { audio: Partial<ScoreInputAudio>, video: Partial<ScoreInputVideo> }): {
  audio: ScoreInputAudio | undefined,
  video: ScoreInputVideo | undefined
} {

  // @ts-ignore
  const newAudio: ScoreInputAudio = {
    // @ts-ignore
    packetLoss: 0,
    // @ts-ignore
    bufferDelay: 50,
    // @ts-ignoreś
    roundTripTime: 50,
    // @ts-ignoreś
    fec: true,
    ...stats.audio
  };

  // @ts-ignore
  const newVideo: ScoreInputVideo = {
    // @ts-ignoreś
    packetLoss: 0,
    // @ts-ignoreś
    bufferDelay: 0,
    // @ts-ignoreś
    roundTripTime: 50,
    // fec: false,
    // @ts-ignoreś
    expectedHeight: stats.video.height || 640,
    // @ts-ignoreś
    expectedWidth: stats.video.width || 480,
    // @ts-ignoreś
    frameRate: stats.video.expectedFrameRate || 30,
    // @ts-ignoreś
    expectedFrameRate: stats.video.frameRate || 30,
    ...stats.video
  };

  return {
    audio: stats.audio
      ? newAudio
      : undefined,
    video: stats.video
      ? newVideo
      : undefined
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}


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

  useEffect(() => {
    Object.values(tracks).forEach((track) => {
      console.log({ track });
    });

    console.log({ stats });
  }, [tracks, stats]);

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

  const codec = stats[track?.track?.id || ""]?.codec;
  const bitrate = stats[track?.track?.id || ""]?.bitrate;
  const bufferDelay = stats[track?.track?.id || ""]?.bufferDelay;
  const width = stats[track?.track?.id || ""]?.width;
  const height = stats[track?.track?.id || ""]?.height;
  const packetLoss = stats[track?.track?.id || ""]?.packetLoss;
  const roundTripTime = stats[track?.track?.id || ""]?.roundTripTime;
  const frameRate = video?.getVideoTracks()?.[0]?.getSettings()?.frameRate;

  useEffect(() => {
    const id = setInterval(() => {
      console.log({ settings: video?.getVideoTracks()?.[0]?.getSettings()?.frameRate });
    }, 1000);

    return () => {
      clearInterval(id);
    };
  }, [video]);

  const score = codec && bitrate && bufferDelay && width && height && packetLoss !== undefined && roundTripTime !== undefined && frameRate ? calculateScore({
    video: {
      codec,
      bitrate,
      bufferDelay,
      width,
      height,
      packetLoss,
      roundTripTime,
      frameRate,
      expectedWidth,
      expectedFrameRate,
      expectedHeight
    }, audio: {}
  }) : { video: 0, audio: 0 };


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
            <div className="flex">score: {score.video ?? "Unknown"}</div>
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
