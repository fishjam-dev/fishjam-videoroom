import { createContext, ReactNode, useContext } from "react";
import {
  MembraneStreaming,
  StreamingMode,
  useMembraneCameraStreaming,
  useMembraneMediaStreaming,
} from "../../pages/room/hooks/useMembraneMediaStreaming";
import { useStatus } from "../../jellyfish.types";
import { useDeveloperInfo } from "../../contexts/DeveloperInfoContext";
import { useLocalPeer } from "../devices/LocalPeerMediaContext";

export type StreamingContext = {
  camera: MembraneStreaming;
  microphone: MembraneStreaming;
  screenShare: MembraneStreaming;
};

const StreamingContext = createContext<StreamingContext | undefined>(undefined);

type Props = {
  children: ReactNode;
};

export const StreamingProvider = ({ children }: Props) => {
  const { manualMode } = useDeveloperInfo();
  const mode: StreamingMode = manualMode.status ? "manual" : "automatic";
  const isConnected = useStatus() === "joined";
  const { video, audio, screenShare: screenShareMedia } = useLocalPeer();

  const camera = useMembraneCameraStreaming(mode, video, isConnected);
  const microphone = useMembraneMediaStreaming(mode, {type:"audio", device: audio}, isConnected);
  const screenShare = useMembraneMediaStreaming(mode, {type:"screensharing", device: screenShareMedia}, isConnected);

  return <StreamingContext.Provider value={{ camera, microphone, screenShare }}>{children}</StreamingContext.Provider>;
};

export const useStreaming = (): StreamingContext => {
  const context = useContext(StreamingContext);
  if (!context) throw new Error("useStreaming must be used within a StreamingProvider");
  return context;
};
