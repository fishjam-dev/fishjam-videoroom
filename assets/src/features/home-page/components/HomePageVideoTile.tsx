import { FC } from "react";
import MediaControlButton from "../../../pages/room/components/MediaControlButton";
import InitialsImage, { computeInitials } from "../../room-page/components/InitialsImage";
import { activeButtonStyle, neutralButtonStyle } from "../../room-page/consts";
import Camera from "../../room-page/icons/Camera";
import CameraOff from "../../room-page/icons/CameraOff";
import Microphone from "../../room-page/icons/Microphone";
import MicrophoneOff from "../../room-page/icons/MicrophoneOff";
import Settings from "../../room-page/icons/Settings";
import { useModal } from "../../../contexts/ModalContext";
import GenericMediaPlayerTile from "../../../pages/room/components/StreamPlayer/GenericMediaPlayerTile";
import { useMicrophone } from "../../../jellyfish.types.ts";
import { useLocalPeer } from "../../devices/LocalPeerMediaContext.tsx";

type HomePageVideoTileProps = {
  displayName: string;
};

const HomePageVideoTile: FC<HomePageVideoTileProps> = ({ displayName }) => {
  const microphone = useMicrophone();
  // todo add loading to device manager
  // const video = useCamera();
  const { video } = useLocalPeer()
  const initials = computeInitials(displayName);
  const { setOpen } = useModal();

  return (
    <div className="h-full w-full">
      <GenericMediaPlayerTile
        video={video.stream || null}
        audio={null}
        flipHorizontally
        layers={
          <>
            {!video.enabled ? <InitialsImage initials={initials} /> : null}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 transform gap-x-4">
              {video.stream ? (
                <MediaControlButton
                  icon={Camera}
                  hover="Turn off the camera"
                  buttonClassName={neutralButtonStyle}
                  onClick={() => {
                    video.stop();
                  }}
                />
              ) : (
                <MediaControlButton
                  icon={CameraOff}
                  hover="Turn on the camera"
                  buttonClassName={activeButtonStyle}
                  onClick={() => {
                    video.start();
                  }}
                />
              )}
              {microphone.enabled ? (
                <MediaControlButton
                  icon={Microphone}
                  hover="Turn off the microphone"
                  buttonClassName={neutralButtonStyle}
                  onClick={() => {
                    microphone.stop();
                  }}
                />
              ) : (
                <MediaControlButton
                  icon={MicrophoneOff}
                  hover="Turn on the microphone"
                  buttonClassName={activeButtonStyle}
                  onClick={() => {
                    microphone.start();
                  }}
                />
              )}
              <MediaControlButton
                icon={Settings}
                hover="Open Settings"
                buttonClassName={neutralButtonStyle}
                onClick={() => {
                  setOpen(true);
                }}
              />
            </div>
          </>
        }
      />
    </div>
  );
};

export default HomePageVideoTile;
