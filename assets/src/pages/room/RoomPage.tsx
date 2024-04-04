import { FC, useEffect, useRef, useState } from "react";
import MediaControlButtons from "./components/MediaControlButtons";
import { useToggle } from "./hooks/useToggle";
import { VideochatSection } from "./VideochatSection";
import PageLayout from "../../features/room-page/components/PageLayout";
import { useAcquireWakeLockAutomatically } from "./hooks/useAcquireWakeLockAutomatically";
import clsx from "clsx";
import RoomSidebar from "./RoomSidebar";
// import { useConnect, useClient } from "../../jellyfish.types.ts";
import { useClient, useConnect, useDisconnect } from "../../jellyfish.types.ts";
import { useUser } from "../../contexts/UserContext";
// import { getSignalingAddress } from "./consts";
// import { getTokenAndAddress } from "../../room.api";
// import { useStreaming } from "../../features/streaming/StreamingContext.tsx";
import { useLocalPeer } from "../../features/devices/LocalPeerMediaContext.tsx";
import { InboundRtpId, useDeveloperInfo } from "../../contexts/DeveloperInfoContext.tsx";
import { AudioStatsSchema, VideoStatsSchema } from "./components/StreamPlayer/rtcMosScore.ts";
import { getTokenAndAddress } from "../../room.api.tsx";
import { getSignalingAddress } from "./consts.ts";

type ConnectComponentProps = {
  username: string;
  roomId: string;
  wasMicrophoneDisabled: boolean;
  wasCameraDisabled: boolean;
};

const ConnectComponent: FC<ConnectComponentProps> = (
  {
    username,
    roomId,
    // wasCameraDisabled
    // wasMicrophoneDisabled
  }) => {
  const connect = useConnect();
  // const streaming = useStreaming();

  const localPeer = useLocalPeer();
  const localPeerRef = useRef(localPeer);
  useEffect(() => {
    localPeerRef.current = localPeer;
  }, [localPeer]);

  // const { video } = localPeer;
  // useEffect(() => {
  //   if (!wasCameraDisabled && !video.stream) video.start();
  //   // if (!wasMicrophoneDisabled && !audio.stream) audio.start();
  // }, [video.stream]);

  const client = useClient();
  const { statistics } = useDeveloperInfo();

  let intervalId: NodeJS.Timer | null = null;

  useEffect(() => {
    const callback = () => {
      let prevTime: number = 0;
      let lastInbound: Record<InboundRtpId, any> | null = null;

      intervalId = setInterval(async () => {
        if (!client) return;

        const currTime = Date.now();
        const dx = currTime - prevTime;

        if (!dx) return;

        const stats: RTCStatsReport = await client.getStatistics();
        const result: Record<string, any> = {};

        stats.forEach((report, id) => {
          result[id] = report;
        });

        const inbound: Record<InboundRtpId, any> = getGroupedStats(result, "inbound-rtp");

        Object.entries(inbound)
          .forEach(([id, report]) => {
            if (!lastInbound) return;

            const lastReport = lastInbound[id];

            const currentBytesReceived: number = report?.bytesReceived ?? 0;

            if (!currentBytesReceived) return;

            const prevBytesReceived: number = lastReport?.bytesReceived ?? 0;

            const bitrate = 8 * (currentBytesReceived - prevBytesReceived) * 1000 / dx; // bits per seconds

            const dxPacketsLost = (report?.packetsLost ?? 0) - (lastReport?.packetsLost ?? 0);
            const dxPacketsReceived = (report?.packetsReceived ?? 0) - (lastReport?.packetsReceived ?? 0);
            const packetLoss = dxPacketsReceived ? dxPacketsLost / dxPacketsReceived * 100 : NaN; // in %

            const selectedCandidatePairId = result[report?.transportId || ""]?.selectedCandidatePairId;
            const roundTripTime = result[selectedCandidatePairId]?.currentRoundTripTime;

            const dxJitterBufferEmittedCount = (report?.jitterBufferEmittedCount ?? 0) - (lastReport?.jitterBufferEmittedCount ?? 0);
            const dxJitterBufferDelay = (report?.jitterBufferDelay ?? 0) - (lastReport?.jitterBufferDelay ?? 0);
            const bufferDelay = dxJitterBufferEmittedCount > 0 ? dxJitterBufferDelay / dxJitterBufferEmittedCount : NaN;

            const codecId = report?.codecId || "";

            if (report?.kind === "video") {
              const codec = result[codecId]?.mimeType?.split("/")?.[1];

              const videoStats = VideoStatsSchema.safeParse({
                bitrate,
                packetLoss,
                codec,
                bufferDelay,
                roundTripTime,
                frameRate: report?.framesPerSecond ?? NaN
              });

              if (videoStats.success && report?.trackIdentifier) {
                statistics.setData(report.trackIdentifier, { ...videoStats.data, type: "video" });
              }

            } else {
              const fec: boolean = codecId.split(";")
                .filter((param: string) => param.startsWith("useinbandfec"))
                .map((param: string) => param.endsWith("1"))?.[0];

              const audioStats = AudioStatsSchema.safeParse({
                bitrate,
                packetLoss,
                bufferDelay,
                roundTripTime,
                fec,
                dtx: false
              });

              if (audioStats.success && report?.trackIdentifier) {
                statistics.setData(report.trackIdentifier, { ...audioStats.data, type: "audio" });
              }
            }
          });

        lastInbound = inbound;
        prevTime = currTime;
      }, 1000);
    };

    client?.on("joined", callback);

    window["ws-close"] = () => {
      client["client"]["websocket"].close();
    };

    return () => {
      client?.removeListener("joined", callback);
      intervalId && clearInterval(intervalId);
    };
  }, [client]);

  const disconnect = useDisconnect();

  useEffect(() => {
    getTokenAndAddress(roomId)
      .then((tokenAndAddress) => {

        // todo make connect in membrane js idempotent
        // because i get two connect event from this hook
        return connect({
          peerMetadata: { name: username },
          token: tokenAndAddress.token,
          signaling: getSignalingAddress(tokenAndAddress.serverAddress)
        });
      });

    return () => {
      disconnect();
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

const getGroupedStats = (result: Record<string, any>, type: string) => Object.entries(result)
  .filter(([_, value]) => value.type === type)
  .reduce((prev, [key, value]) => {
    prev[key] = value;
    return prev;
  }, {});

const RoomPage: FC<Props> = ({ roomId, wasCameraDisabled, wasMicrophoneDisabled }: Props) => {
  useAcquireWakeLockAutomatically();

  const [showSimulcastMenu, toggleSimulcastMenu] = useToggle(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { username } = useUser();

  const { statistics } = useDeveloperInfo();

  const showStats = async () => {
    statistics.setStatus(!statistics.status);
  };

  const client = useClient();

  return (
    <PageLayout>
      {username && <ConnectComponent username={username} roomId={roomId} wasCameraDisabled={wasCameraDisabled}
                                     wasMicrophoneDisabled={wasMicrophoneDisabled} />}
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
            {showSimulcastMenu ? "Hide simulcast controls" : "Show simulcast controls"}
          </button>
          <button
            onClick={showStats}
            className="m-1 w-full rounded bg-brand-grey-80 px-4 py-2 text-white hover:bg-brand-grey-100"
            type="submit"
          >
            {statistics.status ? "Hide statistics" : "Show statistics"}
          </button>
          <button onClick={() => {
            console.log(client.getSnapshot());
          }}>Show state
          </button>

          <button onClick={() => {
            window["ws-close"]();
          }}>Close socket
          </button>
        </div>
      </div>
    </PageLayout>
  );
};

export default RoomPage;
