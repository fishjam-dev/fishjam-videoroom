import React, { useContext } from "react";
import { AUDIO_TRACK_CONSTRAINTS, VIDEO_TRACK_CONSTRAINTS } from "../../pages/room/consts";
// import { loadObject, saveObject } from "../shared/utils/localStorage";
// import { useMedia } from "./useMedia";
// import { DeviceState, Type, UseUserMediaConfig, UseUserMediaStartConfig } from "./use-user-media/type";
import { TrackMetadata, useCamera, useMicrophone, useScreenshare, useSetupMedia } from "../../jellifish.types";
import { UseCameraResult, UseMicrophoneResult, UseScreenshareResult } from "@jellyfish-dev/react-client-sdk";
// import { useUserMedia } from "./use-user-media/useUserMedia";

export type Device = {
  stream: MediaStream | null;
  start: () => void;
  stop: () => void;
  isEnabled: boolean;
  disable: () => void;
  enable: () => void;
};

export type UserMedia = {
  id: string | null;
  setId: (id: string) => void;
  device: Device;
  error: string | null;
  devices: MediaDeviceInfo[] | null;
};

export type DisplayMedia = {
  setConfig: (constraints: MediaStreamConstraints | null) => void;
  config: MediaStreamConstraints | null;
  device: Device;
};

export type LocalPeerContext = {
  video: UseCameraResult<TrackMetadata>;
  audio: UseMicrophoneResult<TrackMetadata>;
  screenShare: UseScreenshareResult<TrackMetadata>;
  init: () => void;
};

const LocalPeerMediaContext = React.createContext<LocalPeerContext | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

export const LocalPeerMediaProvider = ({ children }: Props) => {
  const { init } = useSetupMedia({
    camera: {
      trackConstraints: VIDEO_TRACK_CONSTRAINTS,
      defaultTrackMetadata: {active: true, type: "camera"},
      autoStreaming: false,
      preview: true,
      defaultSimulcastConfig: {
        enabled: true,
        active_encodings: ["l", "m", "h"],
      },
    },
    microphone: {
      trackConstraints: AUDIO_TRACK_CONSTRAINTS,
      defaultTrackMetadata: {active: true, type: "audio"},
      autoStreaming: false,
      preview: true,
    },
    screenshare: {
      defaultTrackMetadata: {active: true, type: "screensharing"},
      autoStreaming: false,
      preview: true,
      trackConstraints: true,
    },
    startOnMount: true,
    storage: true,
  });
  
  const video = useCamera();
  const audio = useMicrophone();
  const screenShare = useScreenshare();

  return (
    <LocalPeerMediaContext.Provider
      value={{
        video,
        audio,
        screenShare,
        init,
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
