import axios from "axios";
import { ConnectionData, RoomApi } from "./api";
import { BACKEND_URL } from "./pages/room/consts";

const API = new RoomApi(undefined, BACKEND_URL.origin, axios);

export const getTokenAndAddress = (roomId: string, username: string): Promise<ConnectionData> =>
  API.apiRoomsRoomIdUsersUserIdGet(roomId, username).then((resp) => {
    if (!resp) throw Error("Empty response");

    console.log({ name: "Response", result: resp.data });

    return resp.data;
  });

export const startRecording = (roomId: string) =>
  API.videoroomWebRoomControllerStartRecording(roomId);
