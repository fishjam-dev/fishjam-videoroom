import { useCallback, useEffect, useState } from "react";
import { useJellyfishClient, useStatus } from "../../jellyfish.types";
import { useParams } from "react-router-dom";
import useToast from "../shared/hooks/useToast";
import { startRecording as startRecordingOpenApi } from "../../room.api";

type UseRecording = {
  canStartRecording: boolean;
  startRecording: () => void;
};

export function useRecording(): UseRecording {
  const [isRecording, setIsRecording] = useState(false);
  const status = useStatus();
  const roomId = useParams().roomId;
  const client = useJellyfishClient();
  const { addToast } = useToast();

  const peerJoinedCallback = useCallback(
    (peer) => {
      if (peer.type === "recording") {
        addToast({ id: "toast-record-started", message: "Recording started" });
        setIsRecording(true);
      }
    },
    [addToast]
  );

  const joinedCallback = useCallback(
    (_, peers) => {
      if (peers.some(({ type }) => type === "recording")) {
        addToast({ id: "toast-record-started", message: "Recording is in progress" });
        setIsRecording(true);
      } else {
        setIsRecording(false)
      }
    },
    [addToast]
  );
  
  const disconnectedCallback = useCallback(() => {
    setIsRecording(false); 
  }, []);

  useEffect(() => {
    client?.on("peerJoined", peerJoinedCallback);
    client?.on("joined", joinedCallback);
    client?.on("disconnected", disconnectedCallback);

    return () => {
      client?.removeListener("peerJoined", peerJoinedCallback);
      client?.removeListener("joined", joinedCallback);
      client?.removeListener("disconnected", disconnectedCallback);
    };
  }, [client, peerJoinedCallback, joinedCallback, disconnectedCallback]);
  
  const startRecording = useCallback(() => {
    if (isRecording || !roomId) return;
    startRecordingOpenApi(roomId);
  }, [isRecording, roomId]);

  const canStartRecording = status === "joined" && !isRecording;

  return {
    canStartRecording,
    startRecording
  }
}
