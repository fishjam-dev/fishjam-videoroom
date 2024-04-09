import { FC, PropsWithChildren } from "react";
import useToast from "../shared/hooks/useToast";
import useEffectOnChange from "../shared/hooks/useEffectOnChange";
import { useCamera, useMicrophone, useScreenShare } from "../../jellyfish.types.ts";

const prepareErrorMessage = (videoDeviceError: string | null, audioDeviceError: string | null): null | string => {
  if (videoDeviceError && audioDeviceError) {
    return "Access to camera and microphone is blocked";
  } else if (videoDeviceError) {
    return "Access to camera is blocked";
  } else if (audioDeviceError) {
    return "Access to microphone is blocked";
  } else return null;
};

export const LocalMediaMessagesBoundary: FC<PropsWithChildren> = ({ children }) => {
  const { addToast } = useToast();

  // todo change to events
  const microphone = useMicrophone()
  const camera = useCamera()
  const screenShare = useScreenShare()

  useEffectOnChange(
    [camera.error, microphone.error],
    () => {
      const message = prepareErrorMessage(camera.error?.name ?? null, microphone.error?.name ?? null);

      if (message) {
        addToast({
          id: "device-not-allowed-error",
          message: message,
          timeout: "INFINITY",
          type: "error",
        });
      }
    },
    (next, prev) => prev?.[0] === next[0] && prev?.[1] === next[1]
  );

  useEffectOnChange(screenShare.stream, () => {
    if (screenShare.stream) {
      addToast({ id: "screen-sharing", message: "You are sharing the screen now", timeout: 4000 });
    }
  });

  return <>{children}</>;
};
