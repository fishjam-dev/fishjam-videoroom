import { FC, useEffect, useRef, useState } from "react";
import MediaControlButtons from "./components/MediaControlButtons";
import { useToggle } from "./hooks/useToggle";
import { VideochatSection } from "./VideochatSection";
import PageLayout from "../../features/room-page/components/PageLayout";
import { useAcquireWakeLockAutomatically } from "./hooks/useAcquireWakeLockAutomatically";
import clsx from "clsx";
import RoomSidebar from "./RoomSidebar";
import { useConnect, useJellyfishClient } from "../../jellyfish.types.ts";
import { useUser } from "../../contexts/UserContext";
import { getSignalingAddress } from "./consts";
import { getTokenAndAddress } from "../../room.api";
import { useStreaming } from "../../features/streaming/StreamingContext.tsx";
import { useLocalPeer } from "../../features/devices/LocalPeerMediaContext.tsx";
import {
  InboundRtpId,
  useDeveloperInfo
} from "../../contexts/DeveloperInfoContext.tsx";

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
    wasCameraDisabled,
    wasMicrophoneDisabled
  }) => {
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
  }, [video.stream, audio.stream]);

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

const getGroupedStats = (result: Record<string, any>, type: string = "outbound-rtp") => Object.entries(result)
  .filter(([_, value]) => value.type === type)
  .reduce((prev, [key, value]) => {
    prev[key] = value;
    return prev;
  }, {});

const RoomPage: FC<Props> = ({ roomId, wasCameraDisabled, wasMicrophoneDisabled }: Props) => {
  useAcquireWakeLockAutomatically();

  const [showSimulcastMenu, toggleSimulcastMenu] = useToggle(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const client = useJellyfishClient();
  const { setStats } = useDeveloperInfo();


  // useEffect(() => {
  //   if(client.n)
  // }, []);
  //

  const showStats = async () => {
    if (!client) return;

    const connection = client.getConnection();

    let prevTime: number = 0;
    // let lastOutbound: Record<OutboundRtpId, any> | null = null;
    let lastInbound: Record<InboundRtpId, any> | null = null;

    setInterval(async () => {
      // An RTCStatsReport instance is a read-only Map-like object,
      // in which each key is an identifier for an object for which statistics are being reported,
      // and the corresponding value is a dictionary object providing the statistics.
      const stats: RTCStatsReport = await client.getStats();
      const currentDate = new Date();
      const currTime = currentDate.getTime();
      const dx = currTime - prevTime;

      // console.log({ dx, currTime, prevTime });

      console.log({ stats });

      const result: Record<string, any> = {};

      stats.forEach((report, id) => {
        result[id] = report;
      });

      // console.log({ result });
      // console.log(JSON.stringify(result, undefined, 2));

      // const outbound: Record<OutboundRtpId, any> = getGroupedStats(result, "outbound-rtp");

      // console.log({ outbound });

      // if (lastOutbound !== null) {
      //   Object.entries(outbound)
      //     .filter(([_, report]) => {
      //       return report.kind === "video";
      //     }).forEach(([key, report]) => {
      //     // console.log(report);
      //     // const currentBytesSent: number = report.bytesSent ?? 0;
      //     // const prevBytesSent: number = lastOutbound[key].bytesSent;
      //     //
      //     // console.log({ prevBytesSent, currentBytesSent });
      //     // trackReport[report.trackIdentifier] = {
      //     //
      //     // }
      //   });
      // }

      const inbound: Record<InboundRtpId, any> = getGroupedStats(result, "inbound-rtp");

      // console.log({ outbound });

      if (lastInbound) {
        Object.entries(inbound)
          .filter(([_, report]) => {
            return report.kind === "video";
          }).forEach(([key, report]) => {
          if (!lastInbound) return;

          const lastReport = lastInbound[key];
          // console.log({ report, lastReport });

          const currentBytesReceived: number = report.bytesReceived ?? 0;
          const prevBytesReceived: number = lastReport.bytesReceived;

          const bitrate = 8 * (currentBytesReceived - prevBytesReceived); // bits per seconds
          console.log({ bitrate, currentBytesReceived, prevBytesReceived });
          const packetLoss = report.packetsLost / report.packetsReceived * 100; // in %

          const selectedCandidatePairId = result[report.transportId].selectedCandidatePairId;
          const currentRoundTripTime = result[selectedCandidatePairId].currentRoundTripTime;

          const codec = result[report.codecId].mimeType.split("/")?.[1];

          // console.log({ selectedCandidatePairId });

          setStats(report.trackIdentifier, {
            bitrate,
            packetLoss,
            codec: codec,
            width: report.frameWidth,
            height: report.frameHeight,
            bufferDelay: report.jitterBufferDelay,
            roundTripTime: currentRoundTripTime
          });
        });
      }

      const candidatePair: Record<string, any> = getGroupedStats(result, "candidate-pair");

      const roundTripTimes = Object.entries(candidatePair)
        .filter(([_, report]) => {
          return report.state === "succeeded";
        }).map(([_key, report]) => {
          // console.log({ _key, currentRoundTripTime: report.currentRoundTripTime });
          return report.totalRoundTripTime;
        });

      const averageTotalRoundTripTimes = roundTripTimes.reduce((prev, acc) => prev + acc, 0) / roundTripTimes.length;

      console.log({ averageTotalRoundTripTimes });

      const senders = connection?.getSenders() ?? [];
      const transcievers = connection?.getTransceivers() ?? [];
      const recievers = connection?.getReceivers() ?? [];


      console.log({ senders, transcievers, recievers });
      // lastOutbound = outbound;
      lastInbound = inbound;
      prevTime = currTime;
    }, 1000);

  };

  // todo:
  //  * packetLoss: 0-100%
  //  * bitrate: bps
  //  * roundTripTime: ms
  //  * bufferDelay: ms
  //  * codec: opus / vp8 / vp9 / h264 (only used for video)
  //  * fec: boolean (ony used for audio)
  //  * dtx: boolean (ony used for audio)
  //  * qp: number (not used yet)
  //  * keyFrames: number (not used yet)
  //  * width: number; Resolution of the video received
  //  * expectedWidth: number; Resolution of the rendering widget
  //  * height: number; Resolution of the video received
  //  * expectedHeight: number; Resolution of the rendering widget
  //  * frameRate: number; FrameRate of the video received
  //  * expectedFrameRate: number; FrameRate of the video source

  const { username } = useUser();

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
            Show simulcast controls
          </button>
          <button
            onClick={showStats}
            className="m-1 w-full rounded bg-brand-grey-80 px-4 py-2 text-white hover:bg-brand-grey-100"
            type="submit"
          >Show stats
          </button>
        </div>
      </div>
    </PageLayout>
  );
};

export default RoomPage;
