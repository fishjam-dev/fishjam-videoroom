import { useEffect, useMemo, useReducer } from "react";
import {
  PeerMetadata,
  toLocalTrackSelector,
  TrackMetadata,
  TrackType,
  useClient,
  useSelector
} from "../../../fishjam";
import useEffectOnChange from "../../../features/shared/hooks/useEffectOnChange";
import { ClientEvents, MessageEvents } from "@fishjam-dev/react-client";
import { LOCAL_SCREEN_SHARING_ID, LOCAL_VIDEO_ID } from "../consts";

type PinningFlags = {
  blockPinning: boolean;
  isAnyPinned: boolean;
  isAnyUnpinned: boolean;
};

type TilePinningApi = {
  pinnedTilesIds: string[];
  unpinnedTilesIds: string[];
  pinTile: (tileId: string) => void;
  unpinTile: (tileId: string) => void;
  pinningFlags: PinningFlags;
};

const INITIAL_STATE: PinState = {
  pinnedTilesIds: [],
  unpinnedTilesIds: [],
  autoPinned: [],
  autoUnpinned: [LOCAL_VIDEO_ID],
  autoPictureInPicture: []
};

type VideoTrackType = Exclude<TrackType, "audio">;

type Action =
  | { type: "pin"; tileId: string }
  | { type: "unpin"; tileId: string }
  | { type: "remotePeerAdded"; tileId: string }
  | { type: "remoteTrackAdded"; trackType: VideoTrackType; tileId: string }
  | { type: "remoteTrackRemoved"; tileId: string }
  | { type: "localTrackAdded"; trackType: VideoTrackType; tileId: string }
  | { type: "localTrackRemoved"; trackType: VideoTrackType; tileId: string };

const pin = (state: PinState, tileId: string): PinState =>
  !state.pinnedTilesIds.includes(tileId)
    ? {
      ...state,
      pinnedTilesIds: [...state.pinnedTilesIds, tileId],
      unpinnedTilesIds: state.unpinnedTilesIds.filter((unpinned) => unpinned !== tileId),
      autoPinned: state.autoPinned.filter((unpinned) => unpinned !== tileId),
      autoUnpinned: state.autoUnpinned.filter((unpinned) => unpinned !== tileId)
    }
    : state;

const autoPin = (state: PinState, tileId: string): PinState =>
  state.autoPinned.includes(tileId) ? state : { ...state, autoPinned: [...state.autoPinned, tileId] };

const autoUnpin = (state: PinState, tileId: string): PinState =>
  state.autoUnpinned.includes(tileId) ? state : { ...state, autoUnpinned: [...state.autoUnpinned, tileId] };

const unpin = (state: PinState, tileId: string): PinState =>
  state.unpinnedTilesIds.includes(tileId)
    ? state
    : {
      ...state,
      unpinnedTilesIds: [...state.unpinnedTilesIds, tileId],
      pinnedTilesIds: state.pinnedTilesIds.filter((pinnedTileId) => pinnedTileId !== tileId),
      autoPinned: state.autoPinned.filter((pinnedTileId) => pinnedTileId !== tileId),
      autoUnpinned: state.autoUnpinned.filter((pinnedTileId) => pinnedTileId !== tileId)
    };

const remove = (state: PinState, tileId: string): PinState => ({
  ...state,
  unpinnedTilesIds: state.unpinnedTilesIds.filter((currentTileId) => currentTileId !== tileId),
  pinnedTilesIds: state.pinnedTilesIds.filter((currentTileId) => currentTileId !== tileId),
  autoPinned: state.autoPinned.filter((currentTileId) => currentTileId !== tileId),
  autoUnpinned: state.autoUnpinned.filter((currentTileId) => currentTileId !== tileId)
});

const reducer = (state: PinState, action: Action): PinState => {
  const { tileId, type } = action;

  if (type === "pin") {
    return pin(state, tileId);
  } else if (type === "unpin") {
    return unpin(state, tileId);
  } else if (type === "remotePeerAdded") {
    return autoUnpin(state, tileId);
  } else if (type === "remoteTrackAdded") {
    if (action.trackType === "screensharing") {
      return autoPin(state, tileId);
    } else {
      return autoUnpin(state, tileId);
    }
  } else if (type === "remoteTrackRemoved") {
    return remove(state, tileId);
  } else if (type === "localTrackAdded") {
    if (action.trackType === "camera") {
      return autoUnpin(state, tileId);
    } else {
      return autoPin(state, tileId);
    }
  } else if (type === "localTrackRemoved") {
    if (action.trackType === "camera") {
      return remove(state, tileId);
    } else {
      return remove(state, tileId);
    }
  }

  throw Error("Unhandled Pin Action!");
};

export type PinState = {
  pinnedTilesIds: string[];
  unpinnedTilesIds: string[];
  autoPinned: string[];
  autoUnpinned: string[];
  autoPictureInPicture: string[];
};

const useTilePinning = (): TilePinningApi => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const client = useClient();

  const screenSharing = useSelector((state) => toLocalTrackSelector(state, "screensharing"));

  useEffectOnChange(screenSharing?.stream, (prev, current) => {
    if (!prev && current) {
      dispatch({ type: "localTrackAdded", trackType: "screensharing", tileId: LOCAL_SCREEN_SHARING_ID });
    } else if (prev && !current) {
      dispatch({ type: "localTrackRemoved", trackType: "screensharing", tileId: LOCAL_SCREEN_SHARING_ID });
    }
  });

  useEffect(() => {
    if (!client) return;

    const onPeerJoined: MessageEvents<PeerMetadata, TrackMetadata>["peerJoined"] = (peer) => {
      dispatch({ type: "remotePeerAdded", tileId: peer.id });
    };

    const onJoinSuccess: ClientEvents<PeerMetadata, TrackMetadata>["joined"] = ({ peers }) => {
      peers.forEach((peer) => {
        dispatch({ type: "remotePeerAdded", tileId: peer.id });
      });
    };

    const onTrackReady: MessageEvents<PeerMetadata, TrackMetadata>["trackReady"] = (ctx) => {
      if (!ctx.metadata) return;

      const trackType: TrackType = ctx.metadata.type;

      if (trackType === "camera" || trackType === "screensharing") {
        dispatch({ type: "remoteTrackAdded", trackType, tileId: ctx.trackId });
      }
    };

    const onTrackRemoved: MessageEvents<PeerMetadata, TrackMetadata>["trackRemoved"] = (ctx) => {
      if (!ctx.metadata) return;

      const trackType: TrackType = ctx.metadata.type;
      if (trackType === "camera" || trackType === "screensharing") {
        dispatch({ type: "remoteTrackRemoved", tileId: ctx.trackId });
      }
    };

    client.on("peerJoined", onPeerJoined);
    client.on("joined", onJoinSuccess);
    client.on("trackReady", onTrackReady);
    client.on("trackRemoved", onTrackRemoved);

    return () => {
      client.off("peerJoined", onPeerJoined);
      client.off("joined", onJoinSuccess);
      client.off("trackReady", onTrackReady);
      client.off("trackRemoved", onTrackRemoved);
    };
  }, [client, dispatch]);

  return useMemo(() => {
    const effectivelyPinned = [...state.autoPinned, ...state.pinnedTilesIds, ...state.autoPictureInPicture];
    const effectivelyUnpinned = [...state.autoUnpinned, ...state.unpinnedTilesIds];

    return {
      pinTile: (tileId) => dispatch({ type: "pin", tileId }),
      unpinTile: (tileId) => dispatch({ type: "unpin", tileId }),
      pinningFlags: {
        blockPinning: effectivelyPinned.length + effectivelyUnpinned.length === 1,
        isAnyPinned: effectivelyPinned.length > 0,
        isAnyUnpinned: effectivelyUnpinned.length > 0
      },
      pinnedTilesIds: effectivelyPinned,
      unpinnedTilesIds: effectivelyUnpinned
    };
  }, [state]);
};

export default useTilePinning;
