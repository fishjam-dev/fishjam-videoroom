import { useToggle } from "./useToggle";
import { TrackEncoding } from "@jellyfish-dev/react-client-sdk";
import { useClient, useCurrentUserVideoTrackId } from "../../../jellyfish.types";

export type UseSimulcastLocalEncoding = {
  highQuality: boolean;
  toggleHighQuality: () => void;
  mediumQuality: boolean;
  toggleMediumQuality: () => void;
  lowQuality: boolean;
  toggleLowQuality: () => void;
};

export const useSimulcastSend = (): UseSimulcastLocalEncoding => {
  const client = useClient()
  const trackId = useCurrentUserVideoTrackId();

  const toggleRemoteEncoding = (status: boolean, encodingName: TrackEncoding) => {
    if (!trackId) {
      throw Error("Toggling simulcast layer is not possible when trackId is null");
    }

    status ? client?.enableTrackEncoding(trackId, encodingName) : client?.disableTrackEncoding(trackId, encodingName);
  };

  const [highQuality, toggleHighQuality] = useToggle(true, (encoding) => {
    toggleRemoteEncoding(encoding, "h");
  });
  const [mediumQuality, toggleMediumQuality] = useToggle(true, (encoding) => {
    toggleRemoteEncoding(encoding, "m");
  });
  const [lowQuality, toggleLowQuality] = useToggle(true, (encoding) => {
    toggleRemoteEncoding(encoding, "l");
  });

  return {
    highQuality,
    toggleHighQuality,
    mediumQuality,
    toggleMediumQuality,
    lowQuality,
    toggleLowQuality,
  };
};
