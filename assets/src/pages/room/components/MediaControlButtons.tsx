import { FC } from "react";

import MediaControlButton, { MediaControlButtonProps } from "./MediaControlButton";
import { NavigateFunction, useNavigate, useParams } from "react-router-dom";
import { useToggle } from "../hooks/useToggle";
import Microphone from "../../../features/room-page/icons/Microphone";
import MicrophoneOff from "../../../features/room-page/icons/MicrophoneOff";
import Camera from "../../../features/room-page/icons/Camera";
import CameraOff from "../../../features/room-page/icons/CameraOff";
import Screenshare from "../../../features/room-page/icons/Screenshare";
import HangUp from "../../../features/room-page/icons/HangUp";
import Chat from "../../../features/room-page/icons/Chat";
import useSmartphoneViewport from "../../../features/shared/hooks/useSmartphoneViewport";
import MenuDots from "../../../features/room-page/icons/MenuDots";
import { activeButtonStyle, neutralButtonStyle, redButtonStyle } from "../../../features/room-page/consts";
import { useDeveloperInfo } from "../../../contexts/DeveloperInfoContext";
import {
  PeerMetadata,
  TrackMetadata,
  useCamera,
  useClient,
  useMicrophone,
  useScreenShare
} from "../../../jellyfish.types.ts";
import { UseCameraResult, UseMicrophoneResult, UseScreenShareResult, Client } from "@jellyfish-dev/react-client-sdk";
import { LocalPeerContext, useLocalPeer } from "../../../features/devices/LocalPeerMediaContext.tsx";

type ControlButton = MediaControlButtonProps & { id: string };
export type StreamingMode = "manual" | "automatic";

type Sidebar = {
  isSidebarOpen: boolean;
  openSidebar: () => void;
};

const getAutomaticControls = (
  navigate: NavigateFunction,
  roomId: string | null,
  isSidebarOpen: boolean,
  openSidebar: () => void,
  isMobileViewport: boolean,
  microphone: UseMicrophoneResult<TrackMetadata>,
  screenShare: UseScreenShareResult<TrackMetadata>,
  camera: UseCameraResult<TrackMetadata>,
  localPeerContext: LocalPeerContext
): ControlButton[] => [
  camera.stream
    ? {
      id: "cam-off",
      icon: Camera,
      hover: "Turn off the camera",
      buttonClassName: neutralButtonStyle,
      onClick: () => {
        localPeerContext.toggleCamera(false);
      }
    }
    : {
      id: "cam-on",
      hover: "Turn on the camera",
      icon: CameraOff,
      buttonClassName: activeButtonStyle,
      onClick: () => {
        localPeerContext.toggleCamera(true);
      }
    },
  microphone.stream
    ? {
      id: "mic-mute",
      icon: Microphone,
      hover: "Turn off the microphone",
      buttonClassName: neutralButtonStyle,
      onClick: () => {
        localPeerContext.toggleMicrophone(false);
      }
    }
    : {
      id: "mic-unmute",
      icon: MicrophoneOff,
      hover: "Turn on the microphone",
      buttonClassName: activeButtonStyle,
      onClick: () => {
        localPeerContext.toggleMicrophone(true);
        // todo implement replace track with silence
      }
    },
  screenShare.enabled
    ? {
      id: "screenshare-stop",
      icon: Screenshare,
      hover: "Stop sharing your screen",
      buttonClassName: neutralButtonStyle,
      hideOnMobile: true,
      onClick: () => {
        screenShare.stop();
      }
    }
    : {
      id: "screenshare-start",
      icon: Screenshare,
      hover: "Share your screen",
      buttonClassName: neutralButtonStyle,
      hideOnMobile: true,
      onClick: () => {
        screenShare.start();
      }
    },
  {
    id: "chat",
    icon: isMobileViewport ? MenuDots : Chat,
    hover: isMobileViewport ? undefined : isSidebarOpen ? "Close the sidebar" : "Open the sidebar",
    buttonClassName: isSidebarOpen ? activeButtonStyle : neutralButtonStyle,
    onClick: openSidebar
  },
  {
    id: "leave-room",
    icon: HangUp,
    hover: "Leave the room",
    buttonClassName: redButtonStyle,
    onClick: () => {
      navigate(`/room/${roomId}`, {
        state: {
          isLeavingRoom: true
        }
      });
    }
  }
];

//dev helpers
// todo fix manual mode
const getManualControls = (
  navigate: NavigateFunction,
  microphone: UseMicrophoneResult<TrackMetadata>,
  screenShare: UseScreenShareResult<TrackMetadata>,
  camera: UseCameraResult<TrackMetadata>,
  client: Client<PeerMetadata, TrackMetadata>,
  roomId?: string
): ControlButton[][] =>
  [
    [
      microphone.stream
        ? {
          id: "mic-stop",
          icon: Microphone,
          buttonClassName: neutralButtonStyle,
          hover: "Start the microphone",
          onClick: () => microphone.stop()
        }
        : {
          id: "mic-start",
          icon: MicrophoneOff,
          buttonClassName: activeButtonStyle,
          hover: "Stop the microphone",
          onClick: () => microphone.start()
        },
      microphone.enabled
        ? {
          id: "mic-disable",
          icon: Microphone,
          buttonClassName: neutralButtonStyle,
          hover: "Disable microphone stream",
          onClick: () => microphone.setEnable(false)
        }
        : {
          id: "mic-enable",
          icon: MicrophoneOff,
          buttonClassName: activeButtonStyle,
          hover: "Enable microphone stream",
          onClick: () => microphone.setEnable(true)
        },
      microphone.broadcast?.trackId
        ? {
          id: "mic-remove",
          icon: Microphone,
          buttonClassName: neutralButtonStyle,
          hover: "Remove microphone track",
          onClick: () => microphone.removeTrack()
        }
        : {
          id: "mic-add",
          icon: MicrophoneOff,
          buttonClassName: activeButtonStyle,
          hover: "Add microphone track",
          onClick: () => microphone.stream && microphone.addTrack({ type: "audio", active: microphone.enabled })
        },
      microphone.broadcast?.metadata?.active
        ? {
          id: "mic-metadata-false",
          icon: Microphone,
          buttonClassName: neutralButtonStyle,
          hover: "Set 'active' metadata to 'false'",
          onClick: () => {
            if (microphone.broadcast?.trackId && microphone.broadcast.metadata) {
              const prevMetadata = microphone.broadcast.metadata;
              client.updateTrackMetadata(microphone.broadcast?.trackId, { ...prevMetadata, active: false });
            }
          }
        }
        : {
          id: "mic-metadata-true",
          icon: MicrophoneOff,
          buttonClassName: activeButtonStyle,
          hover: "Set 'active' metadata to 'true'",
          onClick: () => {
            if (microphone.broadcast?.trackId && microphone.broadcast.metadata) {
              const prevMetadata = microphone.broadcast.metadata;
              client.updateTrackMetadata(microphone.broadcast?.trackId, { ...prevMetadata, active: true });
            }
          }
        }
    ],
    [
      camera.stream
        ? {
          id: "cam-stop",
          icon: Camera,
          buttonClassName: neutralButtonStyle,
          hover: "Turn off the camera",
          onClick: () =>
            camera.stop()

        }
        : {
          id: "cam-start",
          hover: "Turn on the camera",
          icon: CameraOff,
          buttonClassName: activeButtonStyle,
          onClick: () =>
            camera.start()

        },
      // todo fix this
      camera.enabled
        ? {
          id: "cam-disable",
          icon: Camera,
          buttonClassName: neutralButtonStyle,
          hover: "Disable the camera stream",
          onClick: () => camera.setEnable(false)
        }
        : {
          id: "cam-enable",
          hover: "Enable the the camera stream",
          icon: CameraOff,
          buttonClassName: activeButtonStyle,
          onClick: () => camera.setEnable(true)
        },
      // todo fix this
      camera.broadcast?.trackId
        ? {
          id: "cam-remove",
          icon: Camera,
          buttonClassName: neutralButtonStyle,
          hover: "Remove camera track",
          onClick: () => camera.removeTrack()
        }
        : {
          id: "cam-add",
          icon: CameraOff,
          buttonClassName: activeButtonStyle,
          hover: "Add camera track",
          onClick: () => camera.stream && camera.addTrack({ type: "camera", active: camera.enabled })
        },
      camera.broadcast?.metadata?.active
        ? {
          id: "cam-metadata-false",
          icon: Camera,
          buttonClassName: neutralButtonStyle,
          hover: "Set 'active' metadata to 'false'",
          onClick: () => {
            if (camera.broadcast?.trackId && camera.broadcast.metadata) {
              const prevMetadata = camera.broadcast.metadata;
              client.updateTrackMetadata(camera.broadcast?.trackId, { ...prevMetadata, active: false });
            }
          }
        }
        : {
          id: "cam-metadata-true",
          icon: CameraOff,
          buttonClassName: activeButtonStyle,
          hover: "Set 'active' metadata to 'true'",
          onClick: () => {
            if (camera.broadcast?.trackId && camera.broadcast.metadata) {
              const prevMetadata = camera.broadcast.metadata;
              client.updateTrackMetadata(camera.broadcast?.trackId, { ...prevMetadata, active: true });
            }
          }
        }
    ],
    [
      screenShare.stream
        ? {
          id: "screen-stop",
          icon: Screenshare,
          buttonClassName: neutralButtonStyle,
          hover: "Stop the screensharing",
          hideOnMobile: true,
          onClick: () => screenShare.stop()
        }
        : {
          id: "screen-start",
          icon: Screenshare,
          buttonClassName: neutralButtonStyle,
          hover: "Start the screen share",
          hideOnMobile: true,
          onClick: () => screenShare.start()
        },
      screenShare.enabled
        ? {
          id: "screen-disable",
          icon: Screenshare,
          buttonClassName: neutralButtonStyle,
          hover: "Disable screen share stream",
          hideOnMobile: true,
          onClick: () => screenShare.setEnable(false)
        }
        : {
          id: "screen-enable",
          icon: Screenshare,
          buttonClassName: neutralButtonStyle,
          hover: "Enable screen share stream",
          hideOnMobile: true,
          onClick: () => screenShare.setEnable(true)
        },
      screenShare.broadcast?.trackId
        ? {
          id: "screen-remove",
          icon: Screenshare,
          buttonClassName: neutralButtonStyle,
          hover: "Remove screen share track",
          hideOnMobile: true,
          onClick: () => screenShare.removeTrack()
        }
        : {
          id: "screen-add",
          icon: Screenshare,
          buttonClassName: neutralButtonStyle,
          hover: "Add screen share track",
          hideOnMobile: true,
          onClick: () => screenShare.stream && screenShare.addTrack()
        },
      screenShare.broadcast?.metadata?.active
        ? {
          id: "screen-metadata-false",
          icon: Screenshare,
          buttonClassName: neutralButtonStyle,
          hover: "Set 'active' metadata to 'false'",
          hideOnMobile: true,
          onClick: () => {
            if (screenShare.broadcast?.trackId && screenShare.broadcast.metadata) {
              const prevMetadata = screenShare.broadcast.metadata;
              client.updateTrackMetadata(screenShare.broadcast?.trackId, { ...prevMetadata, active: false });
            }

          }
        }
        : {
          id: "screen-metadata-true",
          icon: Screenshare,
          buttonClassName: neutralButtonStyle,
          hover: "Set 'active' metadata to 'true'",
          hideOnMobile: true,
          onClick: () => {
            if (screenShare.broadcast?.trackId && screenShare.broadcast.metadata) {
              const prevMetadata = screenShare.broadcast.metadata;
              client.updateTrackMetadata(screenShare.broadcast?.trackId, { ...prevMetadata, active: true });
            }
          }
        }
    ],
    [
      {
        id: "leave-room",
        icon: HangUp,
        hover: "Leave the room",
        buttonClassName: redButtonStyle,
        onClick: () => {
          navigate(`/room/${roomId}`, { state: { isLeavingRoom: true } });
        }
      }
    ]
  ];

type MediaControlButtonsProps = Sidebar;

const MediaControlButtons: FC<MediaControlButtonsProps> =
  ({
     openSidebar,
     isSidebarOpen
   }: MediaControlButtonsProps) => {
    const { manualMode } = useDeveloperInfo();
    const mode: StreamingMode = manualMode.status ? "manual" : "automatic";

    const [show, toggleShow] = useToggle(true);
    const { isSmartphone } = useSmartphoneViewport();
    const { roomId } = useParams();

    const navigate = useNavigate();

    const camera: UseCameraResult<TrackMetadata> = useCamera();
    const microphone: UseMicrophoneResult<TrackMetadata> = useMicrophone();
    const screenShare: UseScreenShareResult<TrackMetadata> = useScreenShare();
    const client = useClient();

    const localPeerContext = useLocalPeer();

    // todo fix sidebar
    const controls: ControlButton[][] =
      mode === "manual"
        ? getManualControls(navigate, microphone, screenShare, localPeerContext.video, client, roomId)
        : [
          getAutomaticControls(
            navigate,
            roomId || null,
            isSidebarOpen,
            openSidebar,
            !!isSmartphone,
            microphone,
            screenShare,
            camera,
            localPeerContext
          )
        ];
    return (
      <div>
        <div
          onClick={toggleShow}
          className="absolute left-1/2 top-[-15px] z-[-10] h-[15px] w-[50px] -translate-x-1/2 rounded-t-lg hover:bg-brand-dark-gray/90"
        ></div>
        {show && (
          <div className="inset-x-0 z-10 flex flex-wrap justify-center gap-x-4 rounded-t-md">
            {controls.map((group, index) => (
              <div key={index} className="flex justify-center gap-x-4">
                {group.map(({ hover, onClick, buttonClassName, id, icon, hideOnMobile }) => (
                  <MediaControlButton
                    key={id}
                    onClick={onClick}
                    hover={hover}
                    buttonClassName={buttonClassName}
                    icon={icon}
                    hideOnMobile={hideOnMobile}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

export default MediaControlButtons;
