export const AUDIO_TRACK_CONSTRAINTS: MediaTrackConstraints = {
  advanced: [{ autoGainControl: true }, { noiseSuppression: true }, { echoCancellation: true }]
};

export const VIDEO_TRACK_CONSTRAINTS: MediaTrackConstraints = {
  width: {
    max: 1280,
    ideal: 1280,
    min: 640
  },
  height: {
    max: 720,
    ideal: 720,
    min: 320
  },
  frameRate: {
    max: 30,
    ideal: 24
  }
} as const;

export const SCREENSHARING_TRACK_CONSTRAINTS: MediaTrackConstraints = {
  frameRate: { ideal: 20, max: 25 },
  width: { max: 1920, ideal: 1920 },
  height: { max: 1080, ideal: 1080 }
};

export const LOCAL_PEER_NAME = "You";
export const LOCAL_VIDEO_ID = "LOCAL_VIDEO_ID";
export const LOCAL_SCREEN_SHARING_ID = "LOCAL_SCREEN_SHARING_ID";

export const DEFAULT_AUTOSTART_CAMERA_VALUE = true;
export const DEFAULT_AUTOSTART_MICROPHONE_VALUE = true;
export const DEFAULT_MANUAL_MODE_CHECKBOX_VALUE = false;
export const DEFAULT_SMART_LAYER_SWITCHING_CHECKBOX_VALUE = true;

// @ts-ignore
export const JELLYFISH_VERSION = import.meta.env.VITE_JELLYFISH_VERSION;
// @ts-ignore
export const JELLYROOM_VERSION = import.meta.env.VITE_JELLYROOM_VERSION;

export const getSignalingAddress = (url: string) => {
  const jellyfishUrl = new URL(url);

  return ({
    protocol: jellyfishUrl.protocol.replace(":", ""),
    path: jellyfishUrl.pathname,
    host: jellyfishUrl.host
  });
};

export const MAX_TILE_HEIGHT_FOR_MEDIUM_ENCODING = 600;
export const MAX_TILE_HEIGHT_FOR_LOW_ENCODING = 250;
export const VIDEO_TILE_RESIZE_DETECTOR_DEBOUNCE_VALUE = 1000; // milliseconds

export const MAX_DATA_POINTS_ON_CHART = 60;
