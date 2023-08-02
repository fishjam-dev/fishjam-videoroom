export const AUDIO_TRACK_CONSTRAINTS: MediaTrackConstraints = {
  advanced: [{ autoGainControl: true }, { noiseSuppression: true }, { echoCancellation: true }],
};

export const VIDEO_TRACK_CONSTRAINTS: MediaTrackConstraints = {
  width: {
    max: 1280,
    ideal: 1280,
    min: 640,
  },
  height: {
    max: 720,
    ideal: 720,
    min: 320,
  },
  frameRate: {
    max: 30,
    ideal: 24,
  },
};

export const SCREENSHARING_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    frameRate: { ideal: 20, max: 25 },
    width: { max: 1920, ideal: 1920 },
    height: { max: 1080, ideal: 1080 },
  },
};

export const LOCAL_PEER_NAME = "You";
export const LOCAL_VIDEO_ID = "LOCAL_VIDEO_ID";
export const LOCAL_SCREEN_SHARING_ID = "LOCAL_SCREEN_SHARING_ID";

export const DEFAULT_AUTOSTART_CAMERA_VALUE = true;
export const DEFAULT_AUTOSTART_MICROPHONE_VALUE = true;
export const DEFAULT_MANUAL_MODE_CHECKBOX_VALUE = false;
export const DEFAULT_SMART_LAYER_SWITCHING_VALUE = false;

const isSecure = new URL(window.location.origin).protocol === "https:";
// @ts-ignore
const isProxyUsed = import.meta.env.MODE === "development" || import.meta.env.VITE_IS_REVERSE_PROXY_USED == "true";

const protocol = isSecure ? "https" : "http"

// @ts-ignore
export const BACKEND_URL = isProxyUsed ?
  new URL(window.location.origin) :
  new URL(`${protocol}://${import.meta.env.VITE_BACKEND_ADDRESS}`)



// videoroom_backend should return this address (host and port)
// @ts-ignore
const origin_websocket_url = isProxyUsed ?
  new URL(window.location.origin) :
  new URL(`${protocol}://${import.meta.env.VITE_JELLYFISH_ADDRESS}`)
origin_websocket_url.protocol = isSecure ? "wss:" : "ws:";

console.log("BACKEND_URL: ", BACKEND_URL)
console.log("WEBSOCKET_URL: ", origin_websocket_url)

// @ts-ignore
export const JELLYFISH_WEBSOCKET_URL = `${origin_websocket_url}/socket/peer/websocket`;
export const JELLYFISH_WEBSOCKET_PROTOCOL = isSecure ? "wss" : "ws";
console.log("URL: ", JELLYFISH_WEBSOCKET_URL)

export const MAX_TILE_HEIGHT_FOR_MEDIUM_ENCODING = 600;
export const MAX_TILE_HEIGHT_FOR_LOW_ENCODING = 250;
export const VIDEO_TILE_RESIZE_DETECTOR_DEBOUNCE_VALUE = 1000; // milliseconds

export const MAX_DATA_POINTS_ON_CHART = 60;
