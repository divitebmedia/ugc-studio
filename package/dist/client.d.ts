/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { HedraOptions, GenerateTalkingAvatarRequestBody, ProjectInitializationResponseBody, AvatarProjectItem, GetUserAvatarJobsResponse, UploadResponseBody, VoicesResponseBody, AspectRatio } from './types';
import { Readable } from 'stream';
export declare class HedraClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly axiosInstance;
    constructor(apiKey: string, options?: HedraOptions);
    ping(): Promise<void>;
    getVoices(): Promise<VoicesResponseBody>;
    uploadAudio(file: Buffer | Readable, filename?: string): Promise<UploadResponseBody>;
    uploadImage(file: Buffer | Readable, aspectRatio?: AspectRatio, filename?: string): Promise<UploadResponseBody>;
    generateCharacter(payload: GenerateTalkingAvatarRequestBody): Promise<ProjectInitializationResponseBody>;
    waitForProjectCompletion(projectId: string, onProgress?: (status: string) => void, interval?: number, maxAttempts?: number): Promise<AvatarProjectItem>;
    getAllProjects(): Promise<GetUserAvatarJobsResponse>;
    getProject(projectId: string): Promise<AvatarProjectItem>;
    deleteProject(projectId: string): Promise<void>;
    shareProject(projectId: string, shared: boolean): Promise<void>;
    downloadVideo(videoUrl: string, outputPath: string): Promise<void>;
}
