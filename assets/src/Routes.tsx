import React from "react";
import RoomPage from "./pages/room/RoomPage";
import { createBrowserRouter, useLocation, useParams } from "react-router-dom";
import { useUser } from "./contexts/UserContext";
import VideoroomHomePage from "./features/home-page/components/VideoroomHomePage";
import LeavingRoomScreen from "./features/home-page/components/LeavingRoomScreen";
import Page404 from "./features/shared/components/Page404";

const RoomPageWrapper: React.FC = () => {
  const match = useParams();
  const roomId: string | undefined = match?.roomId;
  const { state } = useLocation();
  const isLeavingRoom = !!state?.isLeavingRoom;
  const wasCameraDisabled = !!state?.wasCameraDisabled;
  const wasMicrophoneDisabled = !!state?.wasMicrophoneDisabled;
  
  const { username } = useUser();

  if (isLeavingRoom && roomId) {
    return <LeavingRoomScreen roomId={roomId} wasCameraDisabled={wasCameraDisabled} wasMicrophoneDisabled={wasMicrophoneDisabled} />;
  }

  return username && roomId ? (
    <RoomPage roomId={roomId} wasCameraDisabled={wasCameraDisabled} wasMicrophoneDisabled={wasMicrophoneDisabled} />
  ) : (
    <VideoroomHomePage />
  );
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <VideoroomHomePage />,
  },

  {
    path: "/room/:roomId",
    element: <RoomPageWrapper />,
  },
  {
    path: "*",
    element: <Page404 />,
  },
]);
