import { FC, PropsWithChildren, useCallback, useEffect, useState } from "react";
import useToast from "../shared/hooks/useToast";
import { ErrorMessage, messageComparator } from "../../pages/room/errorMessage";
import { PeerMetadata, TrackMetadata, useClient } from "../../fishjam";
import useEffectOnChange from "../shared/hooks/useEffectOnChange";
import { ClientEvents } from "@fishjam-dev/react-client";

const RECONNECTING_TOAST_ID = "RECONNECTING";

export const StreamingErrorBoundary: FC<PropsWithChildren> = ({ children }) => {
  const { addToast, removeToast } = useToast();

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

  const displayInfo = useCallback(
    (text: string, id?: string) => {
      addToast({
        id: id || crypto.randomUUID(),
        message: text,
        timeout: 5000,
        type: "information"
      });
    },
    []
  );

  useEffect(() => {
    if (!client) return;

    const onReconnectionStarted: ClientEvents<PeerMetadata, TrackMetadata>["reconnectionStarted"] = () => {
      console.log("%c" + "reconnectionStarted", "color:green");

      addToast({
        id: RECONNECTING_TOAST_ID,
        message: "Reconnecting",
        timeout: "INFINITY",
        type: "information"
      });
    };

    const onReconnected: ClientEvents<PeerMetadata, TrackMetadata>["reconnected"] = () => {
      console.log("%cReconnected", "color:green");
      removeToast(RECONNECTING_TOAST_ID);

      setTimeout(() => {
        displayInfo("Reconnected");
      }, 2000);
    };

    const onReconnectionRetriesLimitReached: ClientEvents<PeerMetadata, TrackMetadata>["reconnectionRetriesLimitReached"] = () => {
      console.log("%cReconnectionFailed", "color:red");
      removeToast(RECONNECTING_TOAST_ID);

      setTimeout(() => {
        handleError(`Reconnection failed`);
      }, 2000);
    };

    const onSocketError: ClientEvents<PeerMetadata, TrackMetadata>["socketError"] = (error: Event) => {
      console.warn(error);
      handleError(`Socket error occurred.`, "onSocketError");
    };

    const onConnectionError: ClientEvents<PeerMetadata, TrackMetadata>["connectionError"] = (error, client) => {
      if (client.isReconnecting()) {
        console.log("%c" + "During reconnection: connectionError %o", "color:gray", {
          error,
          iceConnectionState: error?.event?.target?.["iceConnectionState"]
        });
      } else {
        console.warn({ error, state: error?.event?.target?.["iceConnectionState"] });
        handleError(`Connection error occurred. ${error?.message ?? ""}`);
      }
    };

    const onJoinError: ClientEvents<PeerMetadata, TrackMetadata>["joinError"] = (event) => {
      console.log(event);
      handleError(`Failed to join the room`);
    };

    const onAuthError: ClientEvents<PeerMetadata, TrackMetadata>["authError"] = (reason) => {
      if (client.isReconnecting()) {
        console.log("%c" + "During reconnection: authError: " + reason, "color:gray");
      } else {
        handleError(`Socket error occurred.`, "onAuthError");
      }
    };

    const onSocketClose: ClientEvents<PeerMetadata, TrackMetadata>["socketClose"] = (event) => {
      if (client.isReconnecting()) {
        console.log("%c" + "During reconnection: Signaling socket closed", "color:gray");
      } else {
        console.warn(event);
        handleError(`Signaling socket closed.`, "onSocketClose");
      }
    };

    client.on("reconnectionStarted", onReconnectionStarted);
    client.on("reconnected", onReconnected);
    client.on("reconnectionRetriesLimitReached", onReconnectionRetriesLimitReached);

    client.on("socketError", onSocketError);
    client.on("connectionError", onConnectionError);
    client.on("joinError", onJoinError);
    client.on("authError", onAuthError);
    client.on("socketClose", onSocketClose);

    return () => {
      client.off("reconnectionStarted", onReconnectionStarted);
      client.off("reconnected", onReconnected);
      client.off("reconnectionRetriesLimitReached", onReconnectionRetriesLimitReached);

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
