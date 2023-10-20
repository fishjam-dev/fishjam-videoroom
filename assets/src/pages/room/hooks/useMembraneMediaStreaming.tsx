import { useCallback, useEffect, useMemo, useState } from "react";
import { TrackMetadata, useApi } from "../../../jellifish.types.ts";
import { useDeveloperInfo } from "../../../contexts/DeveloperInfoContext.tsx";
import { selectBandwidthLimit } from "../bandwidth.tsx";
import { UseCameraResult, UseMicrophoneResult, UseScreenshareResult } from "@jellyfish-dev/react-client-sdk";

export type MembraneStreaming = {
  trackId: string | null;
  removeTracks: () => void;
  addTracks: () => void;
  setActive: (status: boolean) => void;
  updateTrackMetadata: (metadata: TrackMetadata) => void;
  trackMetadata: TrackMetadata | null;
};

export type StreamingMode = "manual" | "automatic";

type TrackIds = {
  localId: string;
  remoteId: string;
};

export const useMembraneMediaStreaming = (
  mode: StreamingMode,
  {type, device}: {type: "screensharing",
  device: UseScreenshareResult<TrackMetadata>} | {type: "camera", device: UseCameraResult<TrackMetadata>} | {type: "audio", device: UseMicrophoneResult<TrackMetadata>},
  isConnected: boolean,
): MembraneStreaming => {
  const [trackIds, setTrackIds] = useState<TrackIds | null>(null);

  const api = useApi();
  const { simulcast } = useDeveloperInfo();
  const simulcastEnabled = simulcast.status;

  const [trackMetadata, setTrackMetadata] = useState<TrackMetadata | null>(null);
  const defaultTrackMetadata = useMemo(() => ({ active: device.enabled, type }), [device.enabled, type]);

  const addTracks = useCallback(
    () => {
      const simulcast = simulcastEnabled && type === "camera";
      const trackMetadata = { active: device.enabled, type };
      if (type === "camera") {
        device.addTrack(trackMetadata, simulcast ? { enabled: true, active_encodings: ["l", "m", "h"]} : undefined, selectBandwidthLimit(type, simulcast));
      } else {
        device.addTrack(trackMetadata, selectBandwidthLimit(type, simulcast))
      }
      setTrackMetadata(defaultTrackMetadata);
    },
    [defaultTrackMetadata, simulcastEnabled, type, api]
  );

  const replaceTrack = useCallback(
    (stream: MediaStream) => {
      if (!api || !trackIds) return;
      const tracks = type === "audio" ? stream.getAudioTracks() : stream.getVideoTracks();

      const track: MediaStreamTrack | undefined = tracks[0];
      if (!device.track) {
        console.error({ stream, type });
        throw Error("Stream has no tracks!");
      }

      api.replaceTrack(trackIds?.remoteId, track, stream);
    },
    [trackIds, type, api]
  );

  const removeTracks = useCallback(() => {
    setTrackIds(null);
    setTrackMetadata(null);
    device.removeTrack();
  }, [device]);

  useEffect(() => {
    if (!api || !isConnected || mode !== "automatic") {
      return;
    }
    const stream = device.stream;

    const tracks = type === "audio" ? stream?.getAudioTracks() : stream?.getVideoTracks();
    const localTrackId: string | undefined = (tracks || [])[0]?.id;

    if (stream && !trackIds) {
      addTracks();
    } else if (stream && trackIds && trackIds.localId !== localTrackId) {
      replaceTrack(stream);
    } else if (!stream && trackIds) {
      removeTracks();
    }
  }, [api, device.stream, device.enabled, isConnected, addTracks, mode, removeTracks, trackIds, replaceTrack, type]);
  
  useEffect(() => {
    if (device.track?.id && device.broadcast?.trackId) {
      setTrackIds({ localId: device.track?.id, remoteId: device.broadcast?.trackId });
    }
  }, [device.track?.id, device.broadcast?.trackId]);

  const updateTrackMetadata = useCallback(
    (metadata: TrackMetadata) => {
      if (!trackIds) return;
      api?.updateTrackMetadata(trackIds.remoteId, metadata);
      setTrackMetadata(metadata);
    },
    [api, trackIds]
  );

  const setActive = useCallback(
    (status: boolean) => {
      if (trackMetadata) {
        updateTrackMetadata({ ...trackMetadata, active: status });
      } else {
        throw Error("Track metadata is null!");
      }
    },
    [trackMetadata, updateTrackMetadata]
  );

  return {
    trackId: trackIds?.remoteId || null,
    removeTracks,
    addTracks,
    setActive,
    updateTrackMetadata,
    trackMetadata
  };
};
