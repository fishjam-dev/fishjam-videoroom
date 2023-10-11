import axios from "axios";
import { RoomApi } from "./api";
import { BACKEND_URL } from "./pages/room/consts";

const API = new RoomApi(undefined, BACKEND_URL.origin, axios);

export const getTokenAndAddress = (roomId: string) =>
  API.videoroomWebRoomControllerShow(roomId).then((resp) => {
    // @ts-ignore    
    const address = resp?.data?.data?.jellyfish_address || "";

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const token = resp?.data?.data?.token || "";
    return { token: token, serverAddress: address };
  });
