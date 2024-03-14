import React, { useContext } from "react";
import {
  AUDIO_TRACK_CONSTRAINTS,
  SCREENSHARING_TRACK_CONSTRAINTS,
  VIDEO_TRACK_CONSTRAINTS
} from "../../pages/room/consts";
import { TrackMetadata, useCamera, useMicrophone, useScreenShare, useSetupMedia } from "../../jellyfish.types";
import { UseCameraResult, UseMicrophoneResult, UseScreenShareResult } from "@jellyfish-dev/react-client-sdk";

export type LocalPeerContext = {
  video: UseCameraResult<TrackMetadata>;
  audio: UseMicrophoneResult<TrackMetadata>;
  screenShare: UseScreenShareResult<TrackMetadata>;
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
      trackConstraints: AUDIO_TRACK_CONSTRAINTS,
      defaultTrackMetadata: { active: true, type: "audio" },
      broadcastOnConnect: false,
      broadcastOnDeviceStart: false
    },
    screenShare: {
      streamConfig: {
        videoTrackConstraints: SCREENSHARING_TRACK_CONSTRAINTS,
        // todo add audio
      },
      defaultTrackMetadata: { active: true, type: "screensharing" },
      broadcastOnConnect: false,
      broadcastOnDeviceStart: false
    },
    startOnMount: true,
    storage: true
  });

  const video = useCamera();
  const audio = useMicrophone();
  const screenShare = useScreenShare();

  return (
    <LocalPeerMediaContext.Provider
      value={{
        video,
        audio,
        screenShare,
        init
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
