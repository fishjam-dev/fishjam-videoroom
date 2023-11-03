import { FC, useEffect, useRef, useState } from "react";
import MediaControlButtons from "./components/MediaControlButtons";
import { useToggle } from "./hooks/useToggle";
import { VideochatSection } from "./VideochatSection";
import PageLayout from "../../features/room-page/components/PageLayout";
import { useAcquireWakeLockAutomatically } from "./hooks/useAcquireWakeLockAutomatically";
import clsx from "clsx";
import RoomSidebar from "./RoomSidebar";
import { useConnect } from "../../jellyfish.types.ts";
import { useUser } from "../../contexts/UserContext";
import { getSignalingAddress } from "./consts";
import { getTokenAndAddress } from "../../room.api";
import { useStreaming } from "../../features/streaming/StreamingContext.tsx";
import { useLocalPeer } from "../../features/devices/LocalPeerMediaContext.tsx";

type ConnectComponentProps = {
  username: string;
  roomId: string;
  wasMicrophoneDisabled: boolean;
  wasCameraDisabled: boolean;
};

const ConnectComponent: FC<ConnectComponentProps> = ({ username, roomId, wasCameraDisabled, wasMicrophoneDisabled }) => {
  const connect = useConnect();
  const streaming = useStreaming();

  const localPeer = useLocalPeer();
  const localPeerRef = useRef(localPeer);
  useEffect(() => {
    localPeerRef.current = localPeer;
  }, [localPeer]);

  const { video, audio } = localPeer;
  useEffect(() => {
    if (!wasCameraDisabled && !video.stream) video.start();
    if (!wasMicrophoneDisabled && !audio.stream) audio.start();
  }, [video.stream, audio.stream])

  useEffect(() => {
    const disconnectCallback = getTokenAndAddress(roomId).then((tokenAndAddress) => {
      return connect({
        peerMetadata: { name: username },
        token: tokenAndAddress.token,
        signaling: getSignalingAddress(tokenAndAddress.serverAddress)
      });
    });

    return () => {
      streaming.camera.removeTracks();
      streaming.microphone.removeTracks();
      streaming.screenShare.removeTracks();
      const { video, audio, screenShare } = localPeerRef.current;
      video.stop();
      audio.stop();
      screenShare.stop();
      disconnectCallback.then((disconnect) => {
        disconnect();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <></>;
};

type Props = {
  roomId: string;
  wasCameraDisabled: boolean;
  wasMicrophoneDisabled: boolean;
};

const RoomPage: FC<Props> = ({ roomId, wasCameraDisabled, wasMicrophoneDisabled }: Props) => {
  useAcquireWakeLockAutomatically();

  const [showSimulcastMenu, toggleSimulcastMenu] = useToggle(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { username } = useUser();
  
  return (
    <PageLayout>
      {username && <ConnectComponent username={username} roomId={roomId} wasCameraDisabled={wasCameraDisabled} wasMicrophoneDisabled={wasMicrophoneDisabled} />}
      <div className="flex h-full w-full flex-col gap-y-4">
        {/* main grid - videos + future chat */}
        <section
          className={clsx(
            "flex h-full w-full self-center justify-self-center 3xl:max-w-[3200px]",
            isSidebarOpen && "gap-x-4"
          )}
        >
          <VideochatSection showSimulcast={showSimulcastMenu} unpinnedTilesHorizontal={isSidebarOpen} />

          <RoomSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        </section>

        <MediaControlButtons isSidebarOpen={isSidebarOpen} openSidebar={() => setIsSidebarOpen((prev) => !prev)} />

        {/* dev helpers */}
        <div className="invisible absolute bottom-3 right-3 flex flex-col items-stretch md:visible">
          <button
            onClick={toggleSimulcastMenu}
            className="m-1 w-full rounded bg-brand-grey-80 px-4 py-2 text-white hover:bg-brand-grey-100"
            type="submit"
          >
            Show simulcast controls
          </button>
        </div>
      </div>
    </PageLayout>
  );
};

export default RoomPage;
