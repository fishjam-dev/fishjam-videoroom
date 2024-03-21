import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AUDIO_TRACK_CONSTRAINTS,
  SCREENSHARING_TRACK_CONSTRAINTS,
  VIDEO_TRACK_CONSTRAINTS
} from "../../pages/room/consts";
import { PeerMetadata, TrackMetadata, useCamera, useClient, useSetupMedia } from "../../jellyfish.types";
import { ClientEvents, UseCameraResult } from "@jellyfish-dev/react-client-sdk";
import { BlurProcessor } from "./BlurProcessor";
import { selectBandwidthLimit } from "../../pages/room/bandwidth.tsx";
import { useDeveloperInfo } from "../../contexts/DeveloperInfoContext.tsx";
import EmptyVideoWorker from "./emptyVideoWorker.ts?worker";

export type LocalPeerContext = {
  video: UseCameraResult<TrackMetadata>;
  // audio: UseMicrophoneResult<TrackMetadata>;
  // screenShare: UseScreenShareResult<TrackMetadata>;
  // camera: MembraneStreaming;
  init: () => void;
  blur: boolean;
  setBlur: (status: boolean, restart: boolean) => void;
};

const LocalPeerMediaContext = React.createContext<LocalPeerContext | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

export const LocalPeerMediaProvider = ({ children }: Props) => {
  const { init } = useSetupMedia({
    camera: {
      trackConstraints: VIDEO_TRACK_CONSTRAINTS,
      defaultTrackMetadata: undefined,
      broadcastOnConnect: false,
      broadcastOnDeviceStart: false,
      defaultSimulcastConfig: {
        enabled: true,
        activeEncodings: ["l", "m", "h"],
        disabledEncodings: []
      }
    },
    microphone: {
      // todo add replaceTrackOnChange: boolean
      trackConstraints: AUDIO_TRACK_CONSTRAINTS,
      defaultTrackMetadata: { active: true, type: "audio" },
      broadcastOnConnect: true,
      broadcastOnDeviceStart: true
    },
    screenShare: {
      streamConfig: {
        videoTrackConstraints: SCREENSHARING_TRACK_CONSTRAINTS
        // todo add audio
      },
      defaultTrackMetadata: { active: true, type: "screensharing" },
      broadcastOnConnect: true,
      broadcastOnDeviceStart: true
    },
    startOnMount: true,
    storage: true
  });

  const video = useCamera();

  const [blur, setBlur] = useState(false);
  const processor = useRef<BlurProcessor | null>(null);

  const client = useClient();

  const { simulcast } = useDeveloperInfo();
  const simulcastEnabled = simulcast.status;

  const blurRef = useRef<boolean>(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [track, setTrack] = useState<MediaStreamTrack | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const blackCanvasStreamRef = useRef<MediaStream | null>(null);
  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);
  const remoteTrackIdRef = useRef<string | null>(null);

  const broadcastedStreamRef = useRef<MediaStream | null>(null);

  const changeMediaStream = useCallback(async (stream: MediaStream | null, track: MediaStreamTrack | null, blur: boolean, metadataActive: boolean) => {
    console.log({ name: "changeMediaStream1", stream, track, metadataActive });
    if (processor.current) {
      processor.current.destroy();
      processor.current = null;
    }
    console.log({ name: "changeMediaStream2", stream, track });

    if (blur && stream) {
      console.log({ name: "blur true, start blur", blur, stream });
      processor.current = new BlurProcessor(stream);

      setStream(processor.current?.stream);
      setTrack(processor.current?.track);

      streamRef.current = processor.current?.stream || null;
      trackRef.current = processor.current?.track || null;
    } else {
      console.log({ name: "blur false", blur, stream });

      setStream(stream || null);
      setTrack(track || null);

      streamRef.current = stream || null;
      trackRef.current = track || null;
    }

    if (client.getSnapshot().status === "joined") {
      console.log("Handling remote tracks");
      if (!remoteTrackIdRef.current && stream && track) {
        console.log("Adding track");

        const mediaStream = new MediaStream();
        mediaStream.addTrack(track);

        broadcastedStreamRef.current = mediaStream;

        remoteTrackIdRef.current = await client.addTrack(
          track,
          mediaStream,
          // todo think about track.enabled
          { active: metadataActive, type: "camera" },
          simulcastEnabled ? { enabled: true, activeEncodings: ["l", "m", "h"], disabledEncodings: [] } : undefined,
          selectBandwidthLimit("camera", simulcastEnabled)
        );
      } else if (remoteTrackIdRef.current && trackRef.current) {
        console.log({ name: "Replacing track", stream: streamRef.current, track: trackRef.current });

        // todo add setter as an alternative to setting whole object
        broadcastedStreamRef.current?.removeTrack(broadcastedStreamRef.current?.getVideoTracks()[0]);
        broadcastedStreamRef.current?.addTrack(trackRef.current);

        // todo when you replaceTrack this not affects stream so local peer don't know that something changes
        const newMetadata: TrackMetadata = { active: metadataActive, type: "camera" };

        console.log({ newMetadata });

        await client.replaceTrack(remoteTrackIdRef.current, trackRef.current, newMetadata);
        // todo ...
        // await client.updateTrackMetadata(remoteTrackIdRef.current, newMetadata);
      } else if (remoteTrackIdRef.current && !stream) {
        console.log("Removing track");
        await client.removeTrack(remoteTrackIdRef.current);
      }
    }
  }, [setStream, setTrack]);

  useEffect(() => {
    const managerInitialized: ClientEvents<PeerMetadata, TrackMetadata>["managerInitialized"] = (event) => {
      console.log({ name: "managerInitialized", event });

      setStream(() => event.video?.media?.stream || null);
      setTrack(() => event.video?.media?.track || null);

      trackRef.current = event.video?.media?.track || null;
      streamRef.current = event.video?.media?.stream || null;
    };


    const joinedHandler: ClientEvents<PeerMetadata, TrackMetadata>["joined"] = async () => {
      const stream = streamRef.current || null;
      const track = trackRef.current || null;

      if (stream && track) {
        console.log({ name: "joinedHandler", stream, track });

        await changeMediaStream(stream, track, blur, track.enabled);
      }
    };

    const deviceReady: ClientEvents<PeerMetadata, TrackMetadata>["deviceReady"] = async (event, client) => {
      const snapshot = client.getSnapshot();

      console.log({ name: "deviceReady", event, client, snapshot });

      const stream = snapshot?.media?.video?.media?.stream;
      const track = snapshot?.media?.video?.media?.track;

      if (snapshot.status === "joined" && event.type === "video" && remoteTrackIdRef.current && stream && track) {
        workerRef.current?.postMessage({ action: "stop" }, []); // todo what is the second parameter
        await changeMediaStream(stream, track, blurRef.current, track.enabled);
      }
    };

    const devicesReady: ClientEvents<PeerMetadata, TrackMetadata>["devicesReady"] = async (event, client) => {
      const snapshot = client.getSnapshot();

      console.log({ name: "devicesReady", event, client, snapshot });

      if (event.video.restarted && event.video?.media?.stream) {
        await changeMediaStream(event.video?.media?.stream || null, event.video?.media?.track || null, blurRef.current, !!track?.enabled);
      }
    };

    const deviceStopped: ClientEvents<PeerMetadata, TrackMetadata>["deviceStopped"] = async (event, client) => {
      const snapshot = client.getSnapshot();

      console.log({ name: "deviceStopped", event, client, snapshot });

      if (snapshot.status === "joined" && event.type === "video" && trackRef.current && remoteTrackIdRef.current) {
        if (!workerRef.current) {
          workerRef.current = new EmptyVideoWorker();
          const canvasElement = document.createElement("canvas");

          offscreenCanvasRef.current = canvasElement.transferControlToOffscreen();

          const worker = workerRef.current;
          if(!worker) throw Error("Worker is null");

          const offscreenCanvas = offscreenCanvasRef.current
          if(!offscreenCanvas) throw Error("OffscreenCanvas is null");

          worker.postMessage({
            action: "init",
            canvas: offscreenCanvas
          }, [offscreenCanvas]);

          blackCanvasStreamRef.current = canvasElement.captureStream(24);
        }

        const worker = workerRef.current;
        const offscreenCanvas = offscreenCanvasRef.current
        const stream = blackCanvasStreamRef.current;

        if(!worker) throw Error("Worker is null");
        if(!offscreenCanvas) throw Error("OffscreenCanvas is null");
        if (!stream) throw Error("Worker stream is null");

        worker.postMessage({
          action: "start",
        }, []);

        await changeMediaStream(stream, stream.getVideoTracks()[0], false, false);
      }
    };

    const localTrackMetadataChanged: ClientEvents<PeerMetadata, TrackMetadata>["localTrackMetadataChanged"] = async (event, client) => {
      const snapshot = client.getSnapshot();

      console.log({ name: "localTrackMetadataChanged", event, client, snapshot });
    };


    client.on("joined", joinedHandler);
    client.on("localTrackMetadataChanged", localTrackMetadataChanged);
    client.on("managerInitialized", managerInitialized);
    client.on("deviceReady", deviceReady);
    client.on("devicesReady", devicesReady);
    client.on("deviceStopped", deviceStopped);

    return () => {
      client.removeListener("joined", joinedHandler);
      client.removeListener("localTrackMetadataChanged", localTrackMetadataChanged);
      client.removeListener("managerInitialized", managerInitialized);
      client.removeListener("deviceReady", deviceReady);
      client.removeListener("devicesReady", devicesReady);
      client.removeListener("deviceStopped", deviceStopped);
    };
  }, [simulcast.status]);

  const applyNewSettings = useCallback(async (newBlurValue: boolean, restart: boolean) => {
    console.log({ name: "applyNewSettings", newBlurValue, stream, track });

    if (restart) {
      await changeMediaStream(video.stream, video.track, newBlurValue, !!video.track?.enabled);
    }
    blurRef.current = newBlurValue;
  }, [setBlur, stream, track, video]);

  const noop: () => Promise<any> = useCallback((..._args) => Promise.resolve(), []);

  const newVideo: UseCameraResult<TrackMetadata> = useMemo(() => ({
    stream: stream || null,
    track: track || null,
    addTrack: noop,
    removeTrack: noop,
    replaceTrack: noop,
    broadcast: video.broadcast,
    deviceInfo: video.deviceInfo,
    devices: video.devices,
    enabled: true,
    error: video.error,
    setEnable: () => {
    },
    start: video.start,
    status: video.status,
    stop: video.stop
  }), [stream, track]);

  useEffect(() => {
    console.log({ video, newVideo });
  }, [video, newVideo]);

  return (
    <LocalPeerMediaContext.Provider
      value={{
        video: newVideo,
        // audio,
        // screenShare,
        // camera,
        init,
        blur,
        setBlur: applyNewSettings
      }}
    >
      {children}
    </LocalPeerMediaContext.Provider>
  );
};

export const useLocalPeer = (): LocalPeerContext => {
  const context = useContext(LocalPeerMediaContext);
  if (!context) throw new Error("useLocalPeer must be used within a LocalPeerMediaContext");
  return context;
};
