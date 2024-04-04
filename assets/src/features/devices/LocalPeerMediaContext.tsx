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
  // audio: UseMicrophoneResult<TrackMetadata>;
  // screenShare: UseScreenShareResult<TrackMetadata>;
  // camera: MembraneStreaming;
  init: () => void;
  blur: boolean;
  setBlur: (status: boolean, restart: boolean) => void;
  setDevice: (cameraId: string | null, microphoneId: string | null, blur: boolean) => void;
  toggleCamera: (value: boolean) => void,
  toggleMicrophone: (value: boolean) => void,
  restartMicrophone: () => void;
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
  // obecnie nadawany stram - może to być ciemność, może to być blur, może to być kamerka
  const streamRef = useRef<MediaStream | null>(null);
  const metadataActiveRef = useRef<boolean>(true);

  const managerInitializedRef = useRef<boolean>(false);

  const [track, setTrack] = useState<MediaStreamTrack | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const blackCanvasStreamRef = useRef<MediaStream | null>(null);
  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);
  const remoteTrackIdRef = useRef<string | null>(null);

  // if user start or stop camera during it's decision is reflected in this variables
  const cameraIntentionRef = useRef<boolean>(true);
  const microphoneIntentionRef = useRef<boolean>(true);
  const lastCameraIdRef = useRef<null | string>(null);

  // useEffect(() => {
  //   const a = setInterval(() => {
  //     console.log({ lastCameraIdRef: lastCameraIdRef.current, cameraIntention: cameraIntentionRef.current });
  //   }, 3000);
  //
  //   return () => {
  //     clearInterval(a);
  //   };
  // }, []);

  const broadcastedStreamRef = useRef<MediaStream | null>(null);

  const changeMediaStream = useCallback(async (stream: MediaStream | null, track: MediaStreamTrack | null, blur: boolean, metadataActive: boolean) => {
    console.log({ stream, track, blur, metadataActive });
    metadataActiveRef.current = metadataActive;

    if (processor.current && !blur) {
      console.log("Destroying processor");
      processor.current.destroy();
      processor.current = null;
    }

    if (blur && stream) {
      console.log({ name: "Handle blur", blur, stream });
      if (processor.current && streamRef.current?.id === stream.id) {
        console.log("Ignoring blur");
      } else {
        console.log("Disabling old processor and creating new one");

        processor?.current?.destroy();
        processor.current = null;
        processor.current = new BlurProcessor(stream);

        setStream(processor.current?.stream);
        setTrack(processor.current?.track);

        streamRef.current = processor.current?.stream || null;
        trackRef.current = processor.current?.track || null;
      }

    } else {
      console.log("Set stream and track");
      setStream(stream || null);
      setTrack(track || null);

      streamRef.current = stream || null;
      trackRef.current = track || null;
    }

    if (client.getSnapshot().status === "joined") {
      if (!remoteTrackIdRef.current && streamRef.current && trackRef.current) {
        console.log("Adding track");
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
        console.log("Replacing track");

        // todo add setter as an alternative to setting whole object
        broadcastedStreamRef.current?.removeTrack(broadcastedStreamRef.current?.getVideoTracks()[0]);
        broadcastedStreamRef.current?.addTrack(trackRef.current);

        // todo when you replaceTrack this not affects stream so local peer don't know that something changes
        const newMetadata: TrackMetadata = { active: metadataActive, type: "camera" };

        await client.replaceTrack(remoteTrackIdRef.current, trackRef.current, newMetadata);
        // todo ...
        // await client.updateTrackMetadata(remoteTrackIdRef.current, newMetadata);
      } else if (remoteTrackIdRef.current && !stream) {
        console.log("Removing track");

        await client.removeTrack(remoteTrackIdRef.current);
        remoteTrackIdRef.current = null;
      } else {
        console.log("Skipping track");
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

      console.log({ name: "managerInitialized", event });
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

      console.log({
        name: "joinedHandler - method start",
        cameraIntentionRef: cameraIntentionRef.current,
        lastCameraIdRef: lastCameraIdRef.current
      });

      if (cameraIntentionRef.current && !remoteTrackIdRef.current && stream && track) {
        console.log("First visit");

        await changeMediaStream(stream, track, blurRef.current, metadataActiveRef.current);
      } else if (cameraIntentionRef.current && lastCameraIdRef.current) {
        console.log("Rejoin");
        console.log("joinedHandler - start device if user wants it");
        await snapshot.deviceManager.start({ videoDeviceId: lastCameraIdRef.current });
      } else {
        console.log("joinedHandler - skipped");
      }

      const microphoneTrack = snapshot.devices.microphone.track;

      if (microphoneIntentionRef.current && !microphoneTrack) {
        console.log("Restarting microphone");
        await snapshot.deviceManager.start({ audioDeviceId: true });
      }

      // if (stream && track) {
      //   // naiwnie zakłądam zę jest tylko kamera a nie czarne ekran lub rozmycie
      //   const cameraId = snapshot?.media?.video?.media?.deviceInfo?.deviceId || null;
      //   console.log({ name: "setting camera id - joinedHandler", cameraId, stream, track });
      //
      //   lastCameraIdRef.current = cameraId;
      //
      //   await changeMediaStream(stream, track, blurRef.current, !!snapshot.media?.video?.media?.stream);
      // } else if (cameraIntentionRef.current && lastCameraIdRef.current) {
      //   // todo:
      //   //  we need another method that starts the last stopped one
      //   console.log("Jest intencja uruchomionej kamery");
      //   await snapshot.deviceManager.start({ videoDeviceId: lastCameraIdRef.current });
      // }
    };

    const deviceReady: ClientEvents<PeerMetadata, TrackMetadata>["deviceReady"] = async (event, client) => {
      const snapshot = client.getSnapshot();

      console.log({ name: "Device ready", event });

      const cameraId = snapshot.media?.video?.media?.deviceInfo?.deviceId;
      if (event.trackType === "video" && event.mediaDeviceType === "userMedia" && cameraId) {
        // todo remove? what about autost
        // cameraIntentionRef.current = true;

        console.log({ name: "setting camera id - device ready", cameraId });
        lastCameraIdRef.current = cameraId;
        // if (event.trackType === "audio") {
        //   // microphoneIntentionRef.current = true;
        // }

        const stream = snapshot?.media?.video?.media?.stream;
        const track = snapshot?.media?.video?.media?.track;

        if (snapshot.status === "joined" && event.trackType === "video" && stream && track) {
          // why is there remoteTrackIdRef.current?
          workerRef.current?.postMessage({ action: "stop" }, []); // todo what is the second parameter
          await changeMediaStream(stream, track, blurRef.current, track.enabled);
        }
      }
    };

    const devicesReady: ClientEvents<PeerMetadata, TrackMetadata>["devicesReady"] = async (event, client) => {
      const snapshot = client.getSnapshot();

      console.log({ name: "devicesReady", event });
      const cameraId = snapshot?.media?.video?.media?.deviceInfo?.deviceId || null;

      if (cameraId) {
        lastCameraIdRef.current = cameraId;
      }

      if (event.video.restarted && event.video?.media?.stream) {
        console.log({ name: "devicesReady -> changeMediaStream", cameraId });
        lastCameraIdRef.current = cameraId;

        await changeMediaStream(event.video?.media?.stream || null, event.video?.media?.track || null, blurRef.current, true);
      }
    };

    const deviceStopped: ClientEvents<PeerMetadata, TrackMetadata>["deviceStopped"] = async (event, client) => {
      console.log({ name: "device stopped", event });

      const snapshot = client.getSnapshot();

      if (event.trackType === "video" && event.mediaDeviceType === "userMedia") {
        // todo to nie jest prawda, intencja na stop jest wtedy gdy użytkownik to wciśnie
        // cameraIntentionRef.current = false;
      }
      if (event.trackType === "audio" && event.mediaDeviceType === "userMedia") {
        // microphoneIntentionRef.current = false;
      }

      if (snapshot.status !== "joined" && event.trackType === "video" && event.mediaDeviceType === "userMedia") {
        // w poczeklani trzeba wynullować tracki
        setStream(null);
        setTrack(null);

        streamRef.current = null;
        trackRef.current = null;
      }
      if (snapshot.status === "joined" && event.trackType === "video" && event.mediaDeviceType === "userMedia" && trackRef.current && remoteTrackIdRef.current) {
        // jeżeli jesteśmy połączeni to trzeba podmienić na blackscreen
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

    const localTrackMetadataChanged: ClientEvents<PeerMetadata, TrackMetadata>["localTrackMetadataChanged"] = async (event, client) => {
      const snapshot = client.getSnapshot();

      console.log({ name: "localTrackMetadataChanged", event, client, snapshot });
    };

    const disconnectRequested: ClientEvents<PeerMetadata, TrackMetadata>["disconnectRequested"] = async (event, client) => {
      const snapshot = client.getSnapshot();

      console.log({ name: "disconnectRequested", event, client, snapshot });
    };

    const authSuccess: ClientEvents<PeerMetadata, TrackMetadata>["authSuccess"] = async (client) => {
      console.log({ name: "authSuccess", client });
    };

    const socketOpen: ClientEvents<PeerMetadata, TrackMetadata>["socketOpen"] = async (client) => {
      console.log({ name: "socketOpen", client });
    };

    const disconnected: ClientEvents<PeerMetadata, TrackMetadata>["disconnected"] = async (client) => {
      const snapshot = client.getSnapshot();

      console.log({ name: "disconnected", client, snapshot });
      remoteTrackIdRef.current = null;

      if (snapshot.devices.microphone.stream) snapshot.devices.microphone.stop();
      if (snapshot.devices.camera.stream) snapshot.devices.camera.stop();
      if (snapshot.devices.screenShare.stream) snapshot.devices.screenShare.stop();
    };

    const devicesStarted: ClientEvents<PeerMetadata, TrackMetadata>["devicesStarted"] = async (event, client) => {
      console.log({ name: "devicesStarted", event, client });
    };


    client.on("joined", joinedHandler);
    client.on("localTrackMetadataChanged", localTrackMetadataChanged);
    client.on("managerInitialized", managerInitialized);
    client.on("deviceReady", deviceReady);
    client.on("devicesReady", devicesReady);
    client.on("deviceStopped", deviceStopped);
    client.on("disconnectRequested", disconnectRequested);
    client.on("socketOpen", socketOpen);
    client.on("authSuccess", authSuccess);
    client.on("disconnected", disconnected);
    client.on("devicesStarted", devicesStarted);

    return () => {
      client.removeListener("joined", joinedHandler);
      client.removeListener("localTrackMetadataChanged", localTrackMetadataChanged);
      client.removeListener("managerInitialized", managerInitialized);
      client.removeListener("deviceReady", deviceReady);
      client.removeListener("devicesReady", devicesReady);
      client.removeListener("deviceStopped", deviceStopped);
      client.removeListener("disconnectRequested", disconnectRequested);
      client.removeListener("socketOpen", socketOpen);
      client.removeListener("authSuccess", authSuccess);
      client.removeListener("disconnected", disconnected);
      client.removeListener("devicesStarted", devicesStarted);

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

  useEffect(() => {
    console.log({ newVideo, stream, track });
  }, [newVideo, stream, track]);

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
    console.log({ name: "Toggle camera", value });
    cameraIntentionRef.current = value;

    if (value) {
      video.start();
    } else {
      video.stop();
    }

  }, []);

  const toggleMicrophone = useCallback((value: boolean) => {
    console.log({ name: "Toggle microphone", value });
    microphoneIntentionRef.current = value;
    if (value) {
      microphone.start();
    } else {
      microphone.stop();
    }
  }, []);

  const restartMicrophone = useCallback(() => {
    const micStatus = client.getSnapshot().media?.audio?.mediaStatus;
    if (managerInitializedRef.current && microphoneIntentionRef.current && micStatus === "OK") {
      console.log("Restarting mic!");
      toggleMicrophone(true);
    }
    const camStatus = client.getSnapshot().media?.video?.mediaStatus;
    if (managerInitializedRef.current && cameraIntentionRef.current && camStatus === "OK") {
      console.log("Restarting camStatus!");
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
        restartMicrophone
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
