import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AUDIO_TRACK_CONSTRAINTS,
  SCREENSHARING_TRACK_CONSTRAINTS,
  VIDEO_TRACK_CONSTRAINTS
} from "../../pages/room/consts";
import { PeerMetadata, TrackMetadata, useCamera, useClient, useMicrophone, useSetupMedia } from "../../jellyfish.types";
import { ClientEvents, UseCameraResult } from "@jellyfish-dev/react-client-sdk";
import { BlurProcessor } from "./BlurProcessor";
import { selectBandwidthLimit } from "../../pages/room/bandwidth.tsx";
import { useDeveloperInfo } from "../../contexts/DeveloperInfoContext.tsx";
import EmptyVideoWorker from "./emptyVideoWorker.ts?worker";

export type LocalPeerContext = {
  video: UseCameraResult<TrackMetadata>;
  init: () => void;
  blur: boolean;
  setBlur: (status: boolean, restart: boolean) => void;
  setDevice: (cameraId: string | null, microphoneId: string | null, blur: boolean) => void;
  toggleCamera: (value: boolean) => void,
  toggleMicrophone: (value: boolean) => void,
  restartDevices: () => void;
};

const LocalPeerMediaContext = React.createContext<LocalPeerContext | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

export const LocalPeerMediaProvider = ({ children }: Props) => {
  const { manualMode } = useDeveloperInfo();

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
      broadcastOnConnect: !manualMode.status,
      broadcastOnDeviceStart: !manualMode.status
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
  const metadataActiveRef = useRef<boolean>(true);

  const managerInitializedRef = useRef<boolean>(false);

  const [track, setTrack] = useState<MediaStreamTrack | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const blackCanvasStreamRef = useRef<MediaStream | null>(null);
  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);
  const remoteTrackIdRef = useRef<string | null>(null);

  const cameraIntentionRef = useRef<boolean>(true);
  const microphoneIntentionRef = useRef<boolean>(true);
  const lastCameraIdRef = useRef<null | string>(null);

  const broadcastedStreamRef = useRef<MediaStream | null>(null);

  const changeMediaStream = useCallback(async (stream: MediaStream | null, track: MediaStreamTrack | null, blur: boolean, metadataActive: boolean) => {
    metadataActiveRef.current = metadataActive;

    if (processor.current && !blur) {
      processor.current.destroy();
      processor.current = null;
    }

    if (blur && stream) {
      if (!(processor.current && streamRef.current?.id === stream.id)) {
        processor?.current?.destroy();
        processor.current = null;
        processor.current = new BlurProcessor(stream);

        setStream(processor.current?.stream);
        setTrack(processor.current?.track);

        streamRef.current = processor.current?.stream || null;
        trackRef.current = processor.current?.track || null;
      }
    } else {
      setStream(stream || null);
      setTrack(track || null);

      streamRef.current = stream || null;
      trackRef.current = track || null;
    }

    if (client.getSnapshot().status === "joined") {
      if (!remoteTrackIdRef.current && streamRef.current && trackRef.current) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(trackRef.current);

        broadcastedStreamRef.current = mediaStream;

        remoteTrackIdRef.current = await client.addTrack(
          trackRef.current,
          mediaStream,
          // todo think about track.enabled
          { active: metadataActive, type: "camera" },
          simulcastEnabled ? { enabled: true, activeEncodings: ["l", "m", "h"], disabledEncodings: [] } : undefined,
          selectBandwidthLimit("camera", simulcastEnabled)
        );
      } else if (remoteTrackIdRef.current && trackRef.current) {
        // todo add setter as an alternative to setting whole object
        broadcastedStreamRef.current?.removeTrack(broadcastedStreamRef.current?.getVideoTracks()[0]);
        broadcastedStreamRef.current?.addTrack(trackRef.current);

        // todo when you replaceTrack this not affects stream so local peer don't know that something changes
        const newMetadata: TrackMetadata = { active: metadataActive, type: "camera" };

        await client.replaceTrack(remoteTrackIdRef.current, trackRef.current, newMetadata);
      } else if (remoteTrackIdRef.current && !stream) {
        await client.removeTrack(remoteTrackIdRef.current);
        remoteTrackIdRef.current = null;
      }
    }
  }, [setStream, setTrack]);

  useEffect(() => {
    const managerInitialized: ClientEvents<PeerMetadata, TrackMetadata>["managerInitialized"] = (event) => {
      managerInitializedRef.current = true;

      setStream(() => event.video?.media?.stream || null);
      setTrack(() => event.video?.media?.track || null);

      trackRef.current = event.video?.media?.track || null;
      streamRef.current = event.video?.media?.stream || null;

      const snapshot = client.getSnapshot();

      const cameraId = snapshot?.media?.video?.media?.deviceInfo?.deviceId || null;

      if (cameraId) {
        lastCameraIdRef.current = cameraId;
      }
    };


    /*
     * Przypadki:
     * 1) uruchamiam kamerę i następnie wchodze do pokoju
     *    - intencja: true, ma być włączona
     *    - leci event
     *        - disconnect (czyli wyłączam)
     *        - i następnie joined (czyli uruchamiam bo intencja true)
     *    - sprawdzam intencje i wiem, że muszę uruchomić ponownie
     * 2) Wychodzę z pokoju i wracam
     *    - leci event disconnect -> czyli wyłączam
     *    - intencja jest true
     *    - wracam do pokoju czyli leci
     *        - connect (uruchamiam bo intencja jest true)
     *        - disconnect (wyłączam)
     *        - connect uruchamiam (bo inencja jest true)
     *
     * Czy z tego powodu wynika, że za każdym razem jak uruchamiam urządzenie, to sprawdzam czy jestem joined
     * i jak tak to dodaję
     */
    const joinedHandler: ClientEvents<PeerMetadata, TrackMetadata>["joined"] = async () => {

      // const stream = streamRef.current || null;
      // const track = trackRef.current || null;

      const snapshot = client.getSnapshot();

      const stream = snapshot.devices.camera.stream;
      const track = snapshot.devices.camera.track;

      if (cameraIntentionRef.current && !remoteTrackIdRef.current && stream && track) {
        await changeMediaStream(stream, track, blurRef.current, metadataActiveRef.current);
      } else if (cameraIntentionRef.current && lastCameraIdRef.current) {
        await snapshot.deviceManager.start({ videoDeviceId: lastCameraIdRef.current });
      }

      const microphoneTrack = snapshot.devices.microphone.track;

      if (microphoneIntentionRef.current && !microphoneTrack) {
        await snapshot.deviceManager.start({ audioDeviceId: true });
      }
    };

    const deviceReady: ClientEvents<PeerMetadata, TrackMetadata>["deviceReady"] = async (event, client) => {
      const snapshot = client.getSnapshot();

      const cameraId = snapshot.media?.video?.media?.deviceInfo?.deviceId;
      if (event.trackType === "video" && event.mediaDeviceType === "userMedia" && cameraId) {
        lastCameraIdRef.current = cameraId;

        const stream = snapshot?.media?.video?.media?.stream;
        const track = snapshot?.media?.video?.media?.track;

        if (snapshot.status === "joined" && event.trackType === "video" && stream && track) {
          workerRef.current?.postMessage({ action: "stop" }, []); // todo what is the second parameter
          await changeMediaStream(stream, track, blurRef.current, track.enabled);
        }
      }
    };

    const devicesReady: ClientEvents<PeerMetadata, TrackMetadata>["devicesReady"] = async (event, client) => {
      const snapshot = client.getSnapshot();

      const cameraId = snapshot?.media?.video?.media?.deviceInfo?.deviceId || null;

      if (cameraId) {
        lastCameraIdRef.current = cameraId;
      }

      if (event.video.restarted && event.video?.media?.stream) {
        lastCameraIdRef.current = cameraId;

        await changeMediaStream(event.video?.media?.stream || null, event.video?.media?.track || null, blurRef.current, true);
      }
    };

    const deviceStopped: ClientEvents<PeerMetadata, TrackMetadata>["deviceStopped"] = async (event, client) => {
      const snapshot = client.getSnapshot();

      if (snapshot.status !== "joined" && event.trackType === "video" && event.mediaDeviceType === "userMedia") {
        setStream(null);
        setTrack(null);

        streamRef.current = null;
        trackRef.current = null;
      }
      if (snapshot.status === "joined" && event.trackType === "video" && event.mediaDeviceType === "userMedia" && trackRef.current && remoteTrackIdRef.current) {
        if (!workerRef.current) {
          workerRef.current = new EmptyVideoWorker();
          const canvasElement = document.createElement("canvas");

          offscreenCanvasRef.current = canvasElement.transferControlToOffscreen();

          const worker = workerRef.current;
          if (!worker) throw Error("Worker is null");

          const offscreenCanvas = offscreenCanvasRef.current;
          if (!offscreenCanvas) throw Error("OffscreenCanvas is null");

          worker.postMessage({
            action: "init",
            canvas: offscreenCanvas
          }, [offscreenCanvas]);

          blackCanvasStreamRef.current = canvasElement.captureStream(24);
        }

        const worker = workerRef.current;
        const offscreenCanvas = offscreenCanvasRef.current;
        const stream = blackCanvasStreamRef.current;

        if (!worker) throw Error("Worker is null");
        if (!offscreenCanvas) throw Error("OffscreenCanvas is null");
        if (!stream) throw Error("Worker stream is null");

        stream.getVideoTracks().forEach((track) => track.enabled = false);

        worker.postMessage({
          action: "start"
        }, []);

        await changeMediaStream(stream, stream.getVideoTracks()[0], false, false);
      }
    };

    const disconnected: ClientEvents<PeerMetadata, TrackMetadata>["disconnected"] = async (client) => {
      const snapshot = client.getSnapshot();

      remoteTrackIdRef.current = null;

      if (snapshot.devices.microphone.stream) snapshot.devices.microphone.stop();
      if (snapshot.devices.camera.stream) snapshot.devices.camera.stop();
      if (snapshot.devices.screenShare.stream) snapshot.devices.screenShare.stop();
    };


    client.on("joined", joinedHandler);
    client.on("managerInitialized", managerInitialized);
    client.on("deviceReady", deviceReady);
    client.on("devicesReady", devicesReady);
    client.on("deviceStopped", deviceStopped);
    client.on("disconnected", disconnected);

    return () => {
      client.removeListener("joined", joinedHandler);
      client.removeListener("managerInitialized", managerInitialized);
      client.removeListener("deviceReady", deviceReady);
      client.removeListener("devicesReady", devicesReady);
      client.removeListener("deviceStopped", deviceStopped);
      client.removeListener("disconnected", disconnected);

    };
  }, [simulcast.status]);

  const applyNewSettings = useCallback(async (newBlurValue: boolean, restart: boolean) => {
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
    enabled: !!track?.enabled,
    error: video.error,
    setEnable: () => {
    },
    start: video.start,
    status: video.status,
    stop: video.stop,
    mediaStatus: video.mediaStatus
  }), [stream, track]);

  const microphone = useMicrophone();

  const setDevice = useCallback(async (cameraId: string | null, microphoneId: string | null, blur: boolean) => {
    if (microphoneId) {
      microphone.start(microphoneId);
    }

    if (blurRef.current !== blur) {
      blurRef.current = blur;

      if (streamRef.current && trackRef.current) {
        if (blur) {
          await changeMediaStream(streamRef.current, trackRef.current, blurRef.current, metadataActiveRef.current);
        } else {
          await changeMediaStream(video.stream, video.track, blurRef.current, metadataActiveRef.current);
        }
      }
    }

    if (cameraId) {
      video.start(cameraId);
    }
  }, [video]);

  const toggleCamera = useCallback((value: boolean) => {
    cameraIntentionRef.current = value;

    if (value) {
      video.start();
    } else {
      video.stop();
    }

  }, []);

  const toggleMicrophone = useCallback((value: boolean) => {
    microphoneIntentionRef.current = value;
    if (value) {
      microphone.start();
    } else {
      microphone.stop();
    }
  }, []);

  const restartDevices = useCallback(() => {
    const micStatus = client.getSnapshot().media?.audio?.mediaStatus;
    if (managerInitializedRef.current && microphoneIntentionRef.current && micStatus === "OK") {
      toggleMicrophone(true);
    }
    const camStatus = client.getSnapshot().media?.video?.mediaStatus;
    if (managerInitializedRef.current && cameraIntentionRef.current && camStatus === "OK") {
      toggleCamera(true);
    }
  }, [toggleMicrophone, toggleCamera]);

  return (
    <LocalPeerMediaContext.Provider
      value={{
        video: newVideo,
        init,
        blur,
        setBlur: applyNewSettings,
        setDevice,
        toggleCamera,
        toggleMicrophone,
        restartDevices
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
