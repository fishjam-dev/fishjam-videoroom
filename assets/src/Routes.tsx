import React from "react";
import RoomPage from "./pages/room/RoomPage";
import { Outlet, createBrowserRouter, useLocation, useParams } from "react-router-dom";
import { useUser } from "./contexts/UserContext";
import VideoroomHomePage from "./features/home-page/components/VideoroomHomePage";
import LeavingRoomScreen from "./features/home-page/components/LeavingRoomScreen";
import Page404 from "./features/shared/components/Page404";
import { MediaSettingsModal } from "./features/devices/MediaSettingsModal";

function PageWrapper() {
  return (
    <>
      <Outlet />
      <MediaSettingsModal />
    </>
  );
}

const RoomPageWrapper: React.FC = () => {
  const match = useParams();
  const roomId: string | undefined = match?.roomId;
  const { state } = useLocation();
  const isLeavingRoom = !!state?.isLeavingRoom;

  const { username } = useUser();

  if (isLeavingRoom && roomId) {
    return (<LeavingRoomScreen roomId={roomId} />);
  }

  return username && roomId ? (<RoomPage roomId={roomId} />) : (<VideoroomHomePage />);
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PageWrapper />,
    children: [
      {
        path: "",
        element: <VideoroomHomePage />
      },

      {
        path: "/room/:roomId",
        element: <RoomPageWrapper />
      },
      {
        path: "*",
        element: <Page404 />
      }
    ]
  }
]);
