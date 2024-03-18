import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PeerMetadata, TrackMetadata, useClient } from "../../../jellyfish.types.ts";
import { useDeveloperInfo } from "../../../contexts/DeveloperInfoContext.tsx";
import { selectBandwidthLimit } from "../bandwidth.tsx";
import {
  ClientEvents,
  UseCameraResult,
  UseMicrophoneResult,
  UseScreenShareResult
} from "@jellyfish-dev/react-client-sdk";

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
  { type, device }: {
    type: "screensharing",
    device: UseScreenShareResult<TrackMetadata>
  } | {
    type: "audio",
    device: UseMicrophoneResult<TrackMetadata>
  },
  isConnected: boolean
): MembraneStreaming => {
  const [trackIds, setTrackIds] = useState<TrackIds | null>(null);

  const client = useClient();

  const deviceRemoveTrackRef = useRef(device.removeTrack);
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
    deviceRemoveTrackRef.current();
  }, []);

  useEffect(() => {
    (async () => {
      if (!client || !isConnected || mode !== "automatic") {
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
  }, [client, device.stream, device.track, device.enabled, isConnected, addTracks, mode, removeTracks, trackIds, replaceTrack, type]);

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
      client?.updateTrackMetadata(trackIds.remoteId, metadata);
      setTrackMetadata(metadata);
    },
    [client, trackIds]
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

export const useMembraneCameraStreaming = (
  mode: StreamingMode,
  device: UseCameraResult<TrackMetadata>,
  isConnected: boolean
): MembraneStreaming => {
  console.log({ device });
  const [trackIds, setTrackIds] = useState<TrackIds | null>(null);

  // const client = useClient();
  // const defaultTrackMetadata = useRef({ active: true, type: "camera" as const });

  const { simulcast } = useDeveloperInfo();
  const simulcastEnabled = simulcast.status;

  useEffect(() => {
    // const joinedHandler: ClientEvents<PeerMetadata, TrackMetadata>["joined"] = async () => {
    //   const { stream, track, enabled } = client.getSnapshot().devices.camera;
    //
    //   if (stream && track) {
    //     await client.addTrack(
    //       track,
    //       stream,
    //       { active: enabled, type: "camera" },
    //       simulcastEnabled ? { enabled: true, activeEncodings: ["l", "m", "h"], disabledEncodings: [] } : undefined,
    //       selectBandwidthLimit("camera", simulcastEnabled)
    //     );
    //   }
    // };
    //
    // client.on("joined", joinedHandler);
    //
    // return () => {
    //   client.removeListener("joined", joinedHandler);
    // };
  }, []);


  const [trackMetadata, setTrackMetadata] = useState<TrackMetadata | null>(null);

  const addTracks = useCallback(async () => {
  //   if (!device.track || !device.stream) return;
    // const remoteId = await client.addTrack(
    //   device.track,
    //   device.stream,
    //   defaultTrackMetadata,
    //   simulcastEnabled ? { enabled: true, activeEncodings: ["l", "m", "h"], disabledEncodings: [] } : undefined,
    //   selectBandwidthLimit("camera", simulcastEnabled)
    // );
    // setTrackMetadata(defaultTrackMetadata);
    // setTrackIds({
    //   localId: device.track.id,
    //   remoteId
    // });
    // }, [client, device.addTrack, defaultTrackMetadata, simulcastEnabled]);
  // }, [device.addTrack, defaultTrackMetadata, simulcastEnabled]);
  }, [device.addTrack, simulcastEnabled]);

  const replaceTrack = useCallback(async () => {
    if (!trackIds || !device.stream) return;
    if (!device.track) {
      console.error({ stream: device.stream, type: "camera" });
      throw Error("Stream has no tracks!");
    }

    // await client.replaceTrack(trackIds.remoteId, device.track);
    setTrackIds({ ...trackIds, localId: device.track.id });
    // }, [client, device.stream, device.track, trackIds]);
  }, [device.stream, device.track, trackIds]);

  const removeTracks = useCallback(() => {
    if (!trackIds) return;
    // client.removeTrack(trackIds.localId);
    setTrackMetadata(null);
    // }, [client, trackIds]);
  }, [trackIds]);

  useEffect(() => {
    // if (!client || !isConnected || mode !== "automatic") {
    //   return;
    // }
    // const stream = device.stream;
    //
    // const localTrackId: string | undefined = device.track?.id;
    //
    // if (stream && !trackIds) {
    //   addTracks();
    // } else if (stream && trackIds && trackIds.localId !== localTrackId) {
    //   replaceTrack();
    // } else if (!stream && trackIds) {
    //   removeTracks();
    // }
  }, [
    // client,
    device.stream,
    device.track,
    device.enabled,
    isConnected,
    addTracks,
    mode,
    removeTracks,
    trackIds,
    replaceTrack
  ]);

  const updateTrackMetadata = useCallback(
    (metadata: TrackMetadata) => {
      if (!trackIds) return;
      // client?.updateTrackMetadata(trackIds.remoteId, metadata);
      setTrackMetadata(metadata);
    },
    // [client, trackIds]
    [trackIds]
  );

  const setActive = useCallback(
    (_status: boolean) => {
    //   if (trackMetadata) {
    //     updateTrackMetadata({ ...trackMetadata, active: status });
    //   } else {
    //     throw Error("Track metadata is null!");
    //   }
    },
    []
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
