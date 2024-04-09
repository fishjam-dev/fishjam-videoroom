import { TrackEncoding } from "@jellyfish-dev/react-client-sdk";

const StreamSourceValues = ["local", "remote"] as const;
export type StreamSource = (typeof StreamSourceValues)[number];

export type TrackWithId = {
  stream?: MediaStream;
  track?: MediaStreamTrack;
  remoteTrackId: string | null;
  encodingQuality: TrackEncoding | null;
  metadata?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  isSpeaking?: boolean;
  enabled?: boolean;
};

// Media Tile Types
type CommonTile = {
  mediaPlayerId: string;
  peerId: string;
  video: TrackWithId | null;
  displayName: string;
  streamSource: StreamSource;
};

export type PeerTileConfig = {
  typeName: StreamSource;
  audio: TrackWithId | null;
  isSpeaking: boolean;
  initials: string;
} & CommonTile;

export type ScreenShareTileConfig = {
  typeName: "screenShare";
} & CommonTile;

export type MediaPlayerTileConfig = PeerTileConfig | ScreenShareTileConfig;
