import { useCallback, useRef, useState } from "react";
import { TrackEncoding } from "@fishjam-dev/react-client";
import { useClient } from "../../../fishjam.ts";

export type UseSimulcastRemoteEncodingResult = {
  targetEncoding: TrackEncoding | null;
  setTargetEncoding: (quality: TrackEncoding) => void;
};

export const useSimulcastRemoteEncoding = (
  peerId: string | null,
  trackId: string | null
): UseSimulcastRemoteEncodingResult => {
  const [targetEncoding, setTargetEncodingState] = useState<TrackEncoding | null>(null);

  const client = useClient();

  const lastSelectedEncoding = useRef<TrackEncoding | null>(null);
  const setTargetEncoding = useCallback(
    (encoding: TrackEncoding) => {
      if (lastSelectedEncoding.current === encoding) return;
      lastSelectedEncoding.current = encoding;
      setTargetEncodingState(encoding);

      if (!trackId || !peerId || !client) return;
      client.setTargetTrackEncoding(trackId, encoding);
    },
    [peerId, trackId, client]
  );

  return { setTargetEncoding, targetEncoding };
};
