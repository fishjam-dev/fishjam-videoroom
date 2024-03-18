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

export type LocalPeerContext = {
  video: UseCameraResult<TrackMetadata>;
  // audio: UseMicrophoneResult<TrackMetadata>;
  // screenShare: UseScreenShareResult<TrackMetadata>;
  // camera: MembraneStreaming;
  init: () => void;
  blur: boolean;
  setBlur: (status: boolean) => void;
};

const LocalPeerMediaContext = React.createContext<LocalPeerContext | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

export const LocalPeerMediaProvider = ({ children }: Props) => {
  const { init } = useSetupMedia({
    camera: {
      trackConstraints: VIDEO_TRACK_CONSTRAINTS,
      defaultTrackMetadata: { active: true, type: "camera" },
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
  // const audio = useMicrophone();
  // const screenShare = useScreenShare();

  // const { video: blurVideo } = useBlur(video);

  const [blur, setBlur] = useState(false);
  // const [prevStream, setPrevStream] = useState(video.stream);
  const processor = useRef<BlurProcessor | null>(null);
  // const [, rerender] = useReducer((p) => p + 1, 0);


  // useEffect(() => {
  //   if (!video.stream) {
  //     if (processor.current) {
  //       processor.current.destroy();
  //       processor.current = null;
  //       setPrevStream(null);
  //     }
  //     return;
  //   }
  //   if (!blur) return;
  //
  //   if (prevStream === video.stream) return;
  //   setPrevStream(video.stream);
  //   processor.current = new BlurProcessor(video.stream);
  //
  //   return () => {
  //     processor.current?.destroy();
  //     processor.current = null;
  //     setPrevStream(null);
  //   };
  // }, [video.stream, blur]);

  // const stream = processor.current?.stream ?? null;
  // const track = processor.current?.track ?? null;
  //

  // todo remove
  // const isConnected = useStatus() === "joined";
  // moze to musi być ref?

  const client = useClient();

  const { simulcast } = useDeveloperInfo();

  const blurRef = useRef<boolean>(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [track, setTrack] = useState<MediaStreamTrack | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);


  const changeMediaStream = useCallback((stream: MediaStream | null, track: MediaStreamTrack | null, blur: boolean) => {
    if (processor.current) {
      processor.current.destroy();
      processor.current = null;
    }

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
  }, [setStream, setTrack]);

  useEffect(() => {
    const simulcastEnabled = simulcast.status;

    const managerInitialized: ClientEvents<PeerMetadata, TrackMetadata>["managerInitialized"] = (event) => {
      console.log({ name: "managerInitialized", event });

      setStream(() => event.video?.media?.stream || null);
      setTrack(() => event.video?.media?.track || null);
    };


    const joinedHandler: ClientEvents<PeerMetadata, TrackMetadata>["joined"] = async () => {
      const snapshot = client.getSnapshot();

      if (!snapshot.media?.video?.media) return;

      const { stream, track, enabled } = snapshot.media.video.media;

      if (stream && track) {
        // if (processor.current) {
        //   processor.current.destroy();
        //   processor.current = null;
        // }
        //
        // if (blur) {
        //   processor.current = new BlurProcessor(stream);
        //   setStream(processor.current?.stream);
        //   setTrack(processor.current?.track);
        // }
        //
        // const selectedStream = blur ? processor.current?.stream : stream;
        // const selectedTrack = blur ? processor.current?.track : track;
        console.log({ name: "joinedHandler", stream, track });

        changeMediaStream(stream, track, blur);

        if (!streamRef.current || !trackRef.current) return;

        await client.addTrack(
          trackRef.current,
          streamRef.current,
          { active: enabled, type: "camera" },
          simulcastEnabled ? { enabled: true, activeEncodings: ["l", "m", "h"], disabledEncodings: [] } : undefined,
          selectBandwidthLimit("camera", simulcastEnabled)
        );
      }
    };

    const deviceReady: ClientEvents<PeerMetadata, TrackMetadata>["deviceReady"] = async (event, client) => {
      const snapshot = client.getSnapshot();

      console.log({ name: "deviceReady", event, client, snapshot });
    };

    const devicesReady: ClientEvents<PeerMetadata, TrackMetadata>["devicesReady"] = async (event, client) => {
      const snapshot = client.getSnapshot();

      console.log({ name: "devicesReady", event, client, snapshot });

      if (event.video.restarted && event.video?.media?.stream) {
        changeMediaStream(event.video?.media?.stream || null, event.video?.media?.track || null, blurRef.current);
      }
    };

    client.on("joined", joinedHandler);
    client.on("managerInitialized", managerInitialized);
    client.on("deviceReady", deviceReady);
    client.on("devicesReady", devicesReady);

    return () => {
      client.removeListener("joined", joinedHandler);
      client.removeListener("managerInitialized", managerInitialized);
      client.removeListener("deviceReady", deviceReady);
      client.removeListener("devicesReady", devicesReady);
    };
  }, [simulcast.status]);

  const applyNewSettings = useCallback((newBlurValue: boolean) => {
    console.log({ name: "applyNewSettings", newBlurValue, stream, track });

    setBlur(newBlurValue);
    blurRef.current = newBlurValue;

    changeMediaStream(stream, track, newBlurValue);
    // if (stream && track && newBlurValue) {
    //   if (processor.current) {
    //     processor.current.destroy();
    //     processor.current = null;
    //   }
    //
    //   processor.current = new BlurProcessor(stream);
    //   setStream(processor.current?.stream);
    //   setTrack(processor.current?.track);
    // } else if (!newBlurValue) {
    //   if (processor.current) {
    //     processor.current.destroy();
    //     processor.current = null;
    //   }
    //   const snapshot = client.getSnapshot();
    //   console.log({ newBlurValue, snapshot });
    //
    //   const localVideoStream = snapshot.media?.video?.media?.stream;
    //   const localVideoTrack = snapshot.media?.video?.media?.track;
    //
    //   if (localVideoStream && localVideoTrack) {
    //     setStream(localVideoStream);
    //     setTrack(localVideoTrack);
    //   } else {
    //     setStream(null);
    //     setTrack(null);
    //   }
    // }
  }, [setBlur, stream, track]);

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
