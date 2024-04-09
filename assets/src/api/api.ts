/* tslint:disable */
/* eslint-disable */
/**
 * Videoroom
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import type { Configuration } from './configuration';
import type { AxiosPromise, AxiosInstance, RawAxiosRequestConfig } from 'axios';
import globalAxios from 'axios';
// Some imports not used depending on template conditions
// @ts-ignore
import { DUMMY_BASE_URL, assertParamExists, setApiKeyToObject, setBasicAuthToObject, setBearerAuthToObject, setOAuthToObject, setSearchParams, serializeDataIfNeeded, toPathString, createRequestFunction } from './common';
import type { RequestArgs } from './base';
// @ts-ignore
import { BASE_PATH, COLLECTION_FORMATS, BaseAPI, RequiredError, operationServerMap } from './base';


/**
 * RoomApi - axios parameter creator
 * @export
 */
export const RoomApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * Create a new peer in a room and get its token
         * @summary Join a room
         * @param {string} roomName Room name
         * @param {any} [body] Room params
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        videoroomWebRoomControllerShow: async (roomName: string, body?: any, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'roomName' is not null or undefined
            assertParamExists('videoroomWebRoomControllerShow', 'roomName', roomName)
            const localVarPath = `/api/room/{room_name}`
                .replace(`{${"room_name"}}`, encodeURIComponent(String(roomName)));
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;


    
            localVarHeaderParameter['Content-Type'] = 'application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};
            localVarRequestOptions.data = serializeDataIfNeeded(body, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Starts recording in the specified room
         * @summary Start recording in a room
         * @param {string} roomName Room name
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        videoroomWebRoomControllerStartRecording: async (roomName: string, options: RawAxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'roomName' is not null or undefined
            assertParamExists('videoroomWebRoomControllerStartRecording', 'roomName', roomName)
            const localVarPath = `/api/room/{room_name}/start_recording`
                .replace(`{${"room_name"}}`, encodeURIComponent(String(roomName)));
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;


    
            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * RoomApi - functional programming interface
 * @export
 */
export const RoomApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = RoomApiAxiosParamCreator(configuration)
    return {
        /**
         * Create a new peer in a room and get its token
         * @summary Join a room
         * @param {string} roomName Room name
         * @param {any} [body] Room params
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async videoroomWebRoomControllerShow(roomName: string, body?: any, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<string>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.videoroomWebRoomControllerShow(roomName, body, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['RoomApi.videoroomWebRoomControllerShow']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        /**
         * Starts recording in the specified room
         * @summary Start recording in a room
         * @param {string} roomName Room name
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async videoroomWebRoomControllerStartRecording(roomName: string, options?: RawAxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<string>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.videoroomWebRoomControllerStartRecording(roomName, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = operationServerMap['RoomApi.videoroomWebRoomControllerStartRecording']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    }
};

/**
 * RoomApi - factory interface
 * @export
 */
export const RoomApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = RoomApiFp(configuration)
    return {
        /**
         * Create a new peer in a room and get its token
         * @summary Join a room
         * @param {string} roomName Room name
         * @param {any} [body] Room params
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        videoroomWebRoomControllerShow(roomName: string, body?: any, options?: any): AxiosPromise<string> {
            return localVarFp.videoroomWebRoomControllerShow(roomName, body, options).then((request) => request(axios, basePath));
        },
        /**
         * Starts recording in the specified room
         * @summary Start recording in a room
         * @param {string} roomName Room name
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        videoroomWebRoomControllerStartRecording(roomName: string, options?: any): AxiosPromise<string> {
            return localVarFp.videoroomWebRoomControllerStartRecording(roomName, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * RoomApi - object-oriented interface
 * @export
 * @class RoomApi
 * @extends {BaseAPI}
 */
export class RoomApi extends BaseAPI {
    /**
     * Create a new peer in a room and get its token
     * @summary Join a room
     * @param {string} roomName Room name
     * @param {any} [body] Room params
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof RoomApi
     */
    public videoroomWebRoomControllerShow(roomName: string, body?: any, options?: RawAxiosRequestConfig) {
        return RoomApiFp(this.configuration).videoroomWebRoomControllerShow(roomName, body, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Starts recording in the specified room
     * @summary Start recording in a room
     * @param {string} roomName Room name
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof RoomApi
     */
    public videoroomWebRoomControllerStartRecording(roomName: string, options?: RawAxiosRequestConfig) {
        return RoomApiFp(this.configuration).videoroomWebRoomControllerStartRecording(roomName, options).then((request) => request(this.axios, this.basePath));
    }
}



