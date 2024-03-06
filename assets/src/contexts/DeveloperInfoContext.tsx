import React, { useCallback, useContext, useState } from "react";

export type DeveloperInfo = {
  simulcast: { status: boolean; setSimulcast: (status: boolean) => void };
  manualMode: { status: boolean; setManualMode: (status: boolean) => void };
  smartLayerSwitching: { status: boolean; setSmartLayerSwitching: (status: boolean) => void };
  stats: Record<TrackIdentifier, Partial<ScoreInputVideo>>;
  setStats: (id: TrackIdentifier, stats: Partial<ScoreInputVideo>) => void;
};

export const DeveloperInfoContext = React.createContext<DeveloperInfo | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

export type InboundRtpId = string
export type OutboundRtpId = string
export type TrackIdentifier = string

export type ScoreInputVideo = {
  //  * packetLoss: 0-100%
  packetLoss: number;
  //  * bitrate: bps
  bitrate: number;
  //  * roundTripTime: ms
  roundTripTime: number;
  //  * bufferDelay: ms
  bufferDelay: number;
  // * codec: opus / vp8 / vp9 / h264 (only used for video)
  codec: string,
  //  * width: number; Resolution of the video received
  width: number;
  //  * expectedWidth: number; Resolution of the rendering widget
  expectedWidth: number;
  //  * height: number; Resolution of the video received
  height: number;
  //  * expectedHeight: number; Resolution of the rendering widget
  expectedHeight: number;
  //  * frameRate: number; FrameRate of the video received
  frameRate: number;
  //  * expectedFrameRate: number; FrameRate of the video source
  expectedFrameRate: number;
}

export type ScoreInputAudio = {
  bufferDelay: number;
  //  * packetLoss: 0-100%
  packetLoss: number;
  //  * bitrate: bps
  bitrate: number;
  //  * roundTripTime: ms
  roundTripTime: number;
  //  * bufferDelay: ms
  codec: string;
  //  * fec: boolean (ony used for audio)
  fec: boolean;
  //  * dtx: boolean (ony used for audio)
  dtx: boolean;
}

export const DeveloperInfoProvider = ({ children }: Props) => {
  const [simulcast, setSimulcast] = useState<boolean>(false);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [smartLayerSwitching, setSmartLayerSwitching] = useState<boolean>(false);
  const [scoreInput, setScoreInput] = useState<Record<TrackIdentifier, Partial<ScoreInputVideo>>>({});
  const updateStat = useCallback((id: TrackIdentifier, stats: Partial<ScoreInputVideo>) => {
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
