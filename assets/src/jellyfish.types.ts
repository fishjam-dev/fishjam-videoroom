import { toPairs } from "ramda";
import { TrackWithId } from "./pages/types";
import { ApiTrack, RemotePeer } from "./pages/room/hooks/usePeerState";
import { create, State } from "@jellyfish-dev/react-client-sdk";
import { z } from "zod";

const trackTypeSchema = z.union([z.literal("screensharing"), z.literal("camera"), z.literal("audio")]);
export type TrackType = z.infer<typeof trackTypeSchema>

const peerMetadataSchema = z.object({
  name: z.string()
});

export type PeerMetadata = z.infer<typeof peerMetadataSchema>

const trackMetadataSchema = z.object({
  type: trackTypeSchema,
  active: z.boolean(),
  // required for recordings
  displayName: z.string()
});

export type TrackMetadata = z.infer<typeof trackMetadataSchema>;

export const {
  useSelector,
  useStatus,
  useConnect,
  useDisconnect,
  useSetupMedia,
  useCamera,
  useMicrophone,
  useScreenShare,
  useTracks,
  useClient,
  JellyfishContextProvider
} = create<PeerMetadata, TrackMetadata>({
  peerMetadataParser: (obj) => peerMetadataSchema.parse(obj),
  trackMetadataParser: (obj) => trackMetadataSchema.parse(obj),
  reconnect: {
    initialDelay: 10, // ms
    delay: 200, // ms
    maxAttempts: 1,
  }
}, { storage: true });

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
  return toPairs(state?.remote || {})
    .map(([peerId, peer]) => {
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
