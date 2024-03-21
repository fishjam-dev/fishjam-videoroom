import React, { useCallback, useContext, useState } from "react";
import { AudioStats, VideoStats } from "../pages/room/components/StreamPlayer/rtcMOS1.ts";

export type VideoStatistics = VideoStats & { type: "video" }
export type AudioStatistics = AudioStats & { type: "audio" }
export type Statistics = VideoStatistics | AudioStatistics
export type InboundRtpId = string
export type TrackIdentifier = string

export type DeveloperInfo = {
  simulcast: { status: boolean; setSimulcast: (status: boolean) => void };
  manualMode: { status: boolean; setManualMode: (status: boolean) => void };
  smartLayerSwitching: { status: boolean; setSmartLayerSwitching: (status: boolean) => void };
  statistics: {
    data: Record<TrackIdentifier, Statistics>;
    setData: (id: TrackIdentifier, stats: Statistics) => void;
    status: boolean;
    setStatus: (status: boolean) => void;
  }
};

export const DeveloperInfoContext = React.createContext<DeveloperInfo | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

export const DeveloperInfoProvider = ({ children }: Props) => {
  const [simulcast, setSimulcast] = useState<boolean>(false);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [smartLayerSwitching, setSmartLayerSwitching] = useState<boolean>(false);

  const [statisticsStatus, setStatisticStatus] = useState<boolean>(false);
  const [statisticsData, setStatisticsData] = useState<Record<TrackIdentifier, Statistics>>({});

  const updateStatisticsData = useCallback((id: TrackIdentifier, stats: VideoStats | AudioStats) => {
    setStatisticsData((prev) => {
      return {
        ...prev, [id]: {
          ...prev[id],
          ...stats
        }
      };
    });
  }, []);

  return (
    <DeveloperInfoContext.Provider
      value={{
        simulcast: { status: simulcast, setSimulcast },
        manualMode: { status: manualMode, setManualMode },
        smartLayerSwitching: { status: smartLayerSwitching, setSmartLayerSwitching },
        statistics: {
          data: statisticsData,
          setData: updateStatisticsData,
          status: statisticsStatus,
          setStatus: setStatisticStatus,
        }
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
