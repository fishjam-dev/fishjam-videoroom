import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TrackMetadata, useApi } from "../../../jellyfish.types.ts";
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
  {
    type,
    device,
  }:
    | {
        type: "screensharing";
        device: UseScreenshareResult<TrackMetadata>;
      }
    | {
        type: "audio";
        device: UseMicrophoneResult<TrackMetadata>;
      },
  isConnected: boolean
): MembraneStreaming => {
  const [trackIds, setTrackIds] = useState<TrackIds | null>(null);

  const api = useApi();

  const deviceRemoveTrackRef = useRef<typeof device.removeTrack | null>(null);
  useEffect(() => {
    deviceRemoveTrackRef.current = device.removeTrack;
  }, [device.removeTrack]);

  const [trackMetadata, setTrackMetadata] = useState<TrackMetadata | null>(null);
  const defaultTrackMetadata = useMemo(() => ({ active: device.enabled, type }), [device.enabled, type]);

  const addTracks = useCallback(
    async () => {
      await device.addTrack(
        defaultTrackMetadata,
        selectBandwidthLimit(type, false)
      );
      setTrackMetadata(defaultTrackMetadata);
    },
    [defaultTrackMetadata, type]
  );

  const replaceTrack = useCallback(
    async () => {
      if (!trackIds || !device.stream) return;
      if (!device.track) {
        console.error({ stream: device.stream, type });
        throw Error("Stream has no tracks!");
      }

      await device.replaceTrack(device.track, device.stream);
    },
    [device.stream, device.track, trackIds, type]
  );

  const removeTracks = useCallback(() => {
    setTrackMetadata(null);
    deviceRemoveTrackRef.current?.();
  }, []);

  useEffect(() => {
    (async () => {
      if (!api || !isConnected || mode !== "automatic") {
        return;
      }
      const stream = device.stream;

      const localTrackId: string | undefined = device.track?.id;

      if (stream && !trackIds) {
        await addTracks();
      } else if (stream && trackIds && trackIds.localId !== localTrackId) {
        await replaceTrack();
      } else if (!stream && trackIds) {
        removeTracks();
      }
    })();
  }, [api, device.stream, device.track, device.enabled, isConnected, addTracks, mode, removeTracks, trackIds, replaceTrack, type]);

  useEffect(() => {
    if (device.track?.id && device.broadcast?.trackId) {
      setTrackIds({ localId: device.track?.id, remoteId: device.broadcast?.trackId });
    } else if (trackIds !== null) {
      setTrackIds(null);
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
    trackMetadata,
  };
};

export const useMembraneCameraStreaming = (
  mode: StreamingMode,
  device: UseCameraResult<TrackMetadata>,
  isConnected: boolean
): MembraneStreaming => {
  const [trackIds, setTrackIds] = useState<TrackIds | null>(null);

  const api = useApi();
  const { simulcast } = useDeveloperInfo();
  const simulcastEnabled = simulcast.status;

  const [trackMetadata, setTrackMetadata] = useState<TrackMetadata | null>(null);
  const defaultTrackMetadata = useMemo(() => ({ active: device.enabled, type: "camera" as const }), [device.enabled]);

  const addTracks = useCallback(async () => {
    if (!device.track || !device.stream) return;
    const remoteId = await api.addTrack(
      device.track,
      device.stream,
      defaultTrackMetadata,
      simulcastEnabled ? { enabled: true, activeEncodings: ["l", "m", "h"], disabledEncodings: [] } : undefined,
      selectBandwidthLimit("camera", simulcastEnabled)
    );
    setTrackMetadata(defaultTrackMetadata);
    setTrackIds({
      localId: device.track.id,
      remoteId,
    });
  }, [api, device.addTrack, defaultTrackMetadata, simulcastEnabled]);

  const replaceTrack = useCallback(async () => {
    if (!trackIds || !device.stream) return;
    if (!device.track) {
      console.error({ stream: device.stream, type: "camera" });
      throw Error("Stream has no tracks!");
    }

    await api.replaceTrack(trackIds.remoteId, device.track, device.stream);
    setTrackIds({ ...trackIds, localId: device.track.id });
  }, [api, device.stream, device.track, trackIds]);

  const removeTracks = useCallback(() => {
    if (!trackIds) return;
    api.removeTrack(trackIds.localId);
    setTrackMetadata(null);
  }, [api, trackIds]);

  useEffect(() => {
    if (!api || !isConnected || mode !== "automatic") {
      return;
    }
    const stream = device.stream;

    const localTrackId: string | undefined = device.track?.id;

    if (stream && !trackIds) {
      addTracks();
    } else if (stream && trackIds && trackIds.localId !== localTrackId) {
      replaceTrack();
    } else if (!stream && trackIds) {
      removeTracks();
    }
  }, [
    api,
    device.stream,
    device.track,
    device.enabled,
    isConnected,
    addTracks,
    mode,
    removeTracks,
    trackIds,
    replaceTrack,
  ]);

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
    trackMetadata,
  };
};
