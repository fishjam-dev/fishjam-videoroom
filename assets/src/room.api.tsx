import axios from "axios";
import { RoomApi } from "./api";

const API = new RoomApi(undefined, window.location.origin, axios);

export const getToken = (roomId: string) =>
  API.videoroomWebRoomControllerShow(roomId).then((resp) => {
    // console.log(resp);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return resp?.data?.data?.token || "";
  });
