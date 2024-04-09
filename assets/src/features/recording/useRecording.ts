import { useCallback, useEffect, useState } from "react";
import { PeerMetadata, TrackMetadata, useClient, useStatus } from "../../jellyfish.types";
import { useParams } from "react-router-dom";
import useToast from "../shared/hooks/useToast";
import { startRecording as startRecordingOpenApi } from "../../room.api";
import { ClientEvents } from "@jellyfish-dev/react-client-sdk";

type UseRecording = {
  canStartRecording: boolean;
  startRecording: () => void;
};

export function useRecording(): UseRecording {
  const [isRecording, setIsRecording] = useState(false);
  const status = useStatus();
  const roomId = useParams().roomId;
  const client = useClient();
  const { addToast } = useToast();

  const peerJoinedCallback: ClientEvents<PeerMetadata, TrackMetadata>["componentAdded"] = useCallback(
    (component) => {
      if (component.type === "recording") {
        addToast({ id: "toast-record-started", message: "Recording started" });
        setIsRecording(true);
      }
    },
    [addToast]
  );

  const joinedCallback: ClientEvents<PeerMetadata, TrackMetadata>["joined"] = useCallback(
    (event) => {
      if (event.components.some(({ type }) => type === "recording")) {
        addToast({ id: "toast-record-started", message: "Recording is in progress" });
        setIsRecording(true);
      } else {
        setIsRecording(false);
      }
    },
    [addToast]
  );

  const disconnectedCallback = useCallback(() => {
    setIsRecording(false);
  }, []);

  useEffect(() => {
    client?.on("componentAdded", peerJoinedCallback);
    client?.on("joined", joinedCallback);
    client?.on("disconnected", disconnectedCallback);

    return () => {
      client?.removeListener("componentAdded", peerJoinedCallback);
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
  };
}
