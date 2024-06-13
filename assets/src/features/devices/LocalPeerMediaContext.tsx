import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AUDIO_TRACK_CONSTRAINTS,
  SCREENSHARING_TRACK_CONSTRAINTS,
  VIDEO_TRACK_CONSTRAINTS
} from "../../pages/room/consts";
import { PeerMetadata, TrackMetadata, useCamera, useClient, useMicrophone, useSetupMedia } from "../../fishjam";
import { ClientEvents, CameraAPI, SimulcastConfig } from "@fishjam-dev/react-client";
import { BlurProcessor } from "./BlurProcessor";
import { selectBandwidthLimit } from "../../pages/room/bandwidth.tsx";
import { useDeveloperInfo } from "../../contexts/DeveloperInfoContext.tsx";
import { useUser } from "../../contexts/UserContext.tsx";

export type LocalPeerContext = {
  video: CameraAPI<TrackMetadata>;
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
  const { username } = useUser();

  const displayName = username ?? "";

  const { init } = useSetupMedia({
    camera: {
      trackConstraints: VIDEO_TRACK_CONSTRAINTS,
      defaultTrackMetadata: { active: true, type: "camera", displayName },
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
      defaultTrackMetadata: { active: true, type: "audio", displayName },
      broadcastOnConnect: !manualMode.status,
      broadcastOnDeviceStart: !manualMode.status
    },
    screenShare: {
      streamConfig: {
        videoTrackConstraints: SCREENSHARING_TRACK_CONSTRAINTS
        // todo add audio
      },
      defaultTrackMetadata: { active: true, type: "screensharing", displayName },
      broadcastOnConnect: true,
      broadcastOnDeviceStart: true
    },
    startOnMount: true,
    storage: true
  });

  const video = useCamera();
  const microphone = useMicrophone();

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

    if (client.status === "joined") {
      const lastCameraTrack = Object.values(client?.local?.tracks || {})
        .some((track) => track?.metadata?.type === "camera");

      const newTrack = trackRef.current;

      const newMetadata = { active: metadataActive, type: "camera", displayName } as const;

      if (!lastCameraTrack && streamRef.current && newTrack) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(newTrack);

        broadcastedStreamRef.current = mediaStream;

        const simulcastConfig: SimulcastConfig | undefined =
          simulcastEnabled
            ? { enabled: true, activeEncodings: ["l", "m", "h"], disabledEncodings: [] }
            : undefined;

        remoteTrackIdRef.current = await client.addTrack(
          newTrack,
          newMetadata,
          simulcastConfig,
          selectBandwidthLimit("camera", simulcastEnabled)
        );
      } else if (remoteTrackIdRef.current && trackRef.current) {
        broadcastedStreamRef.current?.removeTrack(broadcastedStreamRef.current?.getVideoTracks()[0]);
        broadcastedStreamRef.current?.addTrack(trackRef.current);

        // todo
        //  When you replaceTrack, this does not affect the stream, so the local peer doesn't know that something has changed.
        //  add localTrackReplaced event
        await client.replaceTrack(remoteTrackIdRef.current, trackRef.current, newMetadata);
      } else if (remoteTrackIdRef.current && !stream) {
        await client.removeTrack(remoteTrackIdRef.current);
        remoteTrackIdRef.current = null;
      }
    }
  }, [setStream, setTrack, simulcastEnabled, displayName]);

  useEffect(() => {
    const managerInitialized: ClientEvents<PeerMetadata, TrackMetadata>["managerInitialized"] = (event) => {
      managerInitializedRef.current = true;

      setStream(() => event.video?.media?.stream || null);
      setTrack(() => event.video?.media?.track || null);

      trackRef.current = event.video?.media?.track || null;
      streamRef.current = event.video?.media?.stream || null;

      const cameraId = client?.media?.video?.media?.deviceInfo?.deviceId || null;

      if (cameraId) {
        lastCameraIdRef.current = cameraId;
      }
    };

    const joinedHandler: ClientEvents<PeerMetadata, TrackMetadata>["joined"] = async () => {
      const stream = client.devices.camera.stream;
      const track = client.devices.camera.track;

      if (cameraIntentionRef.current && !remoteTrackIdRef.current && stream && track) {
        await changeMediaStream(stream, track, blurRef.current, metadataActiveRef.current);
      } else if (
        cameraIntentionRef.current
        && lastCameraIdRef.current
        && client.deviceManager.video.mediaStatus !== "Requesting"
      ) {
        await client.deviceManager.start({ videoDeviceId: lastCameraIdRef.current });
      }

      const microphoneTrack = client.devices.microphone.track;

      if (microphoneIntentionRef.current && !microphoneTrack) {
        await client.deviceManager.start({ audioDeviceId: true });
      }
    };

    const deviceReady: ClientEvents<PeerMetadata, TrackMetadata>["deviceReady"] = async (event, client) => {
      const cameraId = client.media?.video?.media?.deviceInfo?.deviceId;
      if (event.trackType === "video" && event.mediaDeviceType === "userMedia" && cameraId) {
        lastCameraIdRef.current = cameraId;

        const stream = client?.media?.video?.media?.stream;
        const track = client?.media?.video?.media?.track;

        if (client.status === "joined" && event.trackType === "video" && stream && track) {
          await changeMediaStream(stream, track, blurRef.current, track.enabled);
        }
      }
    };

    const devicesReady: ClientEvents<PeerMetadata, TrackMetadata>["devicesReady"] = async (event, client) => {
      const cameraId = client?.media?.video?.media?.deviceInfo?.deviceId || null;

      if (cameraId) {
        lastCameraIdRef.current = cameraId;
      }

      if (event.video.restarted && event.video?.media?.stream) {
        lastCameraIdRef.current = cameraId;

        await changeMediaStream(event.video?.media?.stream || null, event.video?.media?.track || null, blurRef.current, true);
      }
    };

    const deviceStopped: ClientEvents<PeerMetadata, TrackMetadata>["deviceStopped"] = async (event, client) => {
      if (client.status !== "joined" && event.trackType === "video" && event.mediaDeviceType === "userMedia") {
        setStream(null);
        setTrack(null);

        streamRef.current = null;
        trackRef.current = null;
      }
      if (client.status === "joined" && event.trackType === "video" && event.mediaDeviceType === "userMedia" && trackRef.current && remoteTrackIdRef.current) {
        await changeMediaStream(null, null, false, false);
      }
    };

    const disconnected: ClientEvents<PeerMetadata, TrackMetadata>["disconnected"] = async (client) => {
      remoteTrackIdRef.current = null;

      if (client.devices.microphone.stream) client.devices.microphone.stop();
      if (client.devices.camera.stream) client.devices.camera.stop();
      if (client.devices.screenShare.stream) client.devices.screenShare.stop();
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

  const newVideo: CameraAPI<TrackMetadata> = useMemo(() => ({
    stream: stream || null,
    track: track || null,
    addTrack: noop,
    removeTrack: noop,
    replaceTrack: noop,
    updateTrackMetadata: noop,
    muteTrack: noop,
    unmuteTrack: noop,
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

  const setDevice = useCallback(async (cameraId: string | null, microphoneId: string | null, blur: boolean) => {
    if (microphoneId && microphoneIntentionRef.current) {
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

    if (cameraId && cameraIntentionRef.current) {
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
    const micStatus = client.media?.audio?.mediaStatus;
    if (managerInitializedRef.current && microphoneIntentionRef.current && micStatus === "OK") {
      toggleMicrophone(true);
    }
    const camStatus = client.media?.video?.mediaStatus;
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
