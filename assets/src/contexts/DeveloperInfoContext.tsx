import React, { useCallback, useContext, useState } from "react";
import { AudioStats, VideoStats } from "../pages/room/components/StreamPlayer/rtcMosScore.ts";

export type VideoStatistics = VideoStats & { type: "video" }
export type AudioStatistics = AudioStats & { type: "audio" }
export type Statistics = VideoStatistics | AudioStatistics

export type DeveloperInfo = {
  simulcast: { status: boolean; setSimulcast: (status: boolean) => void };
  manualMode: { status: boolean; setManualMode: (status: boolean) => void };
  smartLayerSwitching: { status: boolean; setSmartLayerSwitching: (status: boolean) => void };
  stats: Record<TrackIdentifier, Statistics>;
  setStats: (id: TrackIdentifier, stats: Statistics) => void;
};

export const DeveloperInfoContext = React.createContext<DeveloperInfo | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

export type InboundRtpId = string
export type OutboundRtpId = string
export type TrackIdentifier = string

export const DeveloperInfoProvider = ({ children }: Props) => {
  const [simulcast, setSimulcast] = useState<boolean>(false);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [smartLayerSwitching, setSmartLayerSwitching] = useState<boolean>(false);
  const [scoreInput, setScoreInput] = useState<Record<TrackIdentifier, Statistics>>({});
  const updateStat = useCallback((id: TrackIdentifier, stats: VideoStats | AudioStats) => {
    setScoreInput((prev) => {
      return {
        ...prev, [id]: {
          ...prev[id],
          ...stats
        }
      };
    });
  }, [setScoreInput]);

  return (
    <DeveloperInfoContext.Provider
      value={{
        simulcast: { status: simulcast, setSimulcast },
        manualMode: { status: manualMode, setManualMode },
        smartLayerSwitching: { status: smartLayerSwitching, setSmartLayerSwitching },
        stats: scoreInput,
        setStats: updateStat
      }}
    >
      {children}
    </DeveloperInfoContext.Provider>
  );
};

export const useDeveloperInfo = (): DeveloperInfo => {
  const context = useContext(DeveloperInfoContext);
  if (!context) throw new Error("useDeveloperInfo must be used within a DeveloperInfoProvider");
  return context;
};
