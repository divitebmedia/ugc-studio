import { AxiosInstance } from 'axios';
import { AvatarProjectItem } from '../types';
export declare function pollForCompletion(axiosInstance: AxiosInstance, projectId: string, onProgress?: (status: string) => void, interval?: number, maxAttempts?: number): Promise<AvatarProjectItem>;
