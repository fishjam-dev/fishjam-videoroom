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
import { useLocalPeer } from "../../devices/LocalPeerMediaContext";
import GenericMediaPlayerTile from "../../../pages/room/components/StreamPlayer/GenericMediaPlayerTile";

type HomePageVideoTileProps = {
  displayName: string;
};

const HomePageVideoTile: FC<HomePageVideoTileProps> = ({ displayName }) => {
  const { audio, video } = useLocalPeer();
  
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
              {video.enabled ? (
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
                    if (video.stream) {
                      video.setEnable(true);
                    } else {
                      video.start();
                    }
                  }}
                />
              )}
              {audio.enabled ? (
                <MediaControlButton
                  icon={Microphone}
                  hover="Turn off the microphone"
                  buttonClassName={neutralButtonStyle}
                  onClick={() => {
                    audio.stop();
                  }}
                />
              ) : (
                <MediaControlButton
                  icon={MicrophoneOff}
                  hover="Turn on the microphone"
                  buttonClassName={activeButtonStyle}
                  onClick={() => {
                    if (audio.stream) {
                      audio.setEnable(true);
                    } else {
                      audio.start();
                    }
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
