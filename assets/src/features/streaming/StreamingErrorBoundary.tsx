import { FC, PropsWithChildren, useCallback, useEffect, useState } from "react";
import useToast from "../shared/hooks/useToast";
import { ErrorMessage, messageComparator } from "../../pages/room/errorMessage";
import { PeerMetadata, TrackMetadata, useClient } from "../../fishjam";
import useEffectOnChange from "../shared/hooks/useEffectOnChange";
import { ClientEvents } from "@fishjam-dev/react-client";

export const StreamingErrorBoundary: FC<PropsWithChildren> = ({ children }) => {
  const { addToast } = useToast();

  // todo remove state, refactor to function invocation
  const [errorMessage, setErrorMessage] = useState<ErrorMessage | undefined>();

  const client = useClient();

  const handleError = useCallback(
    (text: string, id?: string) => {
      console.error(text);
      setErrorMessage({ message: text, id: id });
    },
    [setErrorMessage]
  );

  useEffect(() => {
    if (!client) return;

    const onSocketError: ClientEvents<PeerMetadata, TrackMetadata>["socketError"] = (error: Event) => {
      console.warn(error);
      handleError(`Socket error occurred.`, "onSocketError");
    };

    const onConnectionError: ClientEvents<PeerMetadata, TrackMetadata>["connectionError"] = (error) => {
      console.warn({ error, type: error?.event?.type });
      handleError(`Connection error occurred. ${error?.message ?? ""}`);
    };

    const onJoinError: ClientEvents<PeerMetadata, TrackMetadata>["joinError"] = (event) => {
      console.log(event)
      handleError(`Failed to join the room`);
    };
    const onAuthError: ClientEvents<PeerMetadata, TrackMetadata>["authError"] = (reason) => {
      console.warn(reason);
      handleError(`Socket error occurred.`, "onAuthError");
    };

    const onSocketClose: ClientEvents<PeerMetadata, TrackMetadata>["socketClose"] = (event) => {
      console.warn(event);
      handleError(`Signaling socket closed.`, "onSocketClose");
    };

    client.on("socketError", onSocketError);
    client.on("connectionError", onConnectionError);
    client.on("joinError", onJoinError);
    client.on("authError", onAuthError);
    client.on("socketClose", onSocketClose);

    return () => {
      client.off("socketError", onSocketError);
      client.off("connectionError", onConnectionError);
      client.off("joinError", onJoinError);
      client.off("authError", onAuthError);
      client.off("socketClose", onSocketClose);
    };
  }, [client, handleError]);

  useEffectOnChange(
    errorMessage,
    () => {
      if (errorMessage) {
        addToast({
          id: errorMessage.id || crypto.randomUUID(),
          message: errorMessage.message,
          timeout: "INFINITY",
          type: "error"
        });
      }
    },
    messageComparator
  );

  return <>{children}</>;
};
