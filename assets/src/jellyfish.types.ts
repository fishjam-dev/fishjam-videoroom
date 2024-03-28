import { toPairs } from "ramda";
import { TrackWithId } from "./pages/types";
import { ApiTrack, RemotePeer } from "./pages/room/hooks/usePeerState";
import { Client, create, State } from "@jellyfish-dev/react-client-sdk";
import { z } from "zod";

const trackTypeSchema = z.union([z.literal("screensharing"), z.literal("camera"), z.literal("audio")]);
export type TrackType = z.infer<typeof trackTypeSchema>

const peerMetadataSchema = z.object({
  name: z.string()
});

export type PeerMetadata = z.infer<typeof peerMetadataSchema>

const trackMetadataSchema = z.object({
  type: trackTypeSchema,
  active: z.boolean()
});

export type TrackMetadata = z.infer<typeof trackMetadataSchema>;

export const {
  useSelector,
  useStatus,
  useConnect,
  useSetupMedia,
  useCamera,
  useMicrophone,
  useScreenShare,
  useTracks,
  JellyfishContextProvider
} = create<PeerMetadata, TrackMetadata>({
  peerMetadataParser: (obj) => peerMetadataSchema.parse(obj),
  trackMetadataParser: (obj) => trackMetadataSchema.parse(obj),
  reconnect: {
    initialDelay: 5,
    maxAttempts: 1,
    delay: 5
  }
});

export const useClient = (): Client<PeerMetadata, TrackMetadata> =>
  useSelector((s) => s.client);

export const useCurrentUserVideoTrackId = (): string | null =>
  useSelector(
    (s) =>
      Object.values(s?.local?.tracks || {})
        .filter((track) => track?.metadata?.type === "camera")
        .map((track) => track.trackId)[0] || null
  );

export const toLocalTrackSelector = (state: State<PeerMetadata, TrackMetadata>, type: TrackType): TrackWithId | null =>
  toPairs(state?.local?.tracks || {})
    .filter(([_, value]) => value?.metadata?.type === type)
    .map(([key, value]): TrackWithId => {
      const { stream, metadata, encoding, track } = value;
      return {
        stream: stream || undefined,
        track: track || undefined,
        remoteTrackId: key,
        metadata,
        isSpeaking: true,
        enabled: true,
        encodingQuality: encoding
      };
    })[0] || null;

export const toRemotePeerSelector = (state: State<PeerMetadata, TrackMetadata>): RemotePeer[] => {
  return toPairs(state?.remote || {}).map(([peerId, peer]) => {
    const tracks: ApiTrack[] = toPairs(peer.tracks || {}).map(([trackId, track]) => {
      return {
        trackId,
        metadata: track.metadata || undefined,
        isSpeaking: track.vadStatus === "speech",
        encoding: track.encoding || undefined,
        mediaStream: track.stream || undefined,
        mediaStreamTrack: track.track || undefined
      };
    });

    return {
      id: peerId,
      displayName: peer?.metadata?.name || "",
      source: "remote",
      tracks
    };
  });
};
