"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HedraClient = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const stream_1 = require("stream");
const fs_1 = __importDefault(require("fs"));
const api_1 = require("./utils/api");
const formUtils_1 = require("./utils/formUtils");
class HedraClient {
    constructor(apiKey, options) {
        this.apiKey = apiKey;
        this.baseUrl = (options === null || options === void 0 ? void 0 : options.baseUrl) || 'https://mercury.dev.dream-ai.com/api';
        this.axiosInstance = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                'X-API-KEY': this.apiKey,
                // 'Content-Type': 'application/json',
                ...options === null || options === void 0 ? void 0 : options.customHeaders,
            },
        });
    }
    async ping() {
        await this.axiosInstance.get('/ping');
    }
    async getVoices() {
        const response = await this.axiosInstance.get('/v1/voices');
        return response.data;
    }
    async uploadAudio(file, filename) {
        var _a;
        const form = new form_data_1.default();
        if (Buffer.isBuffer(file)) {
            form.append('file', file, { filename: filename });
        }
        else if (file instanceof stream_1.Readable) {
            form.append('file', file, { filename: filename });
        }
        else {
            throw new Error('Invalid file type. Expected Buffer or Readable.');
        }
        try {
            const contentLength = await (0, formUtils_1.getFormLength)(form);
            const response = await this.axiosInstance.post('/v1/audio', form, {
                headers: {
                    ...form.getHeaders(),
                    'Content-Length': contentLength,
                },
            });
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                if (((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status) === 422) {
                    console.error('Upload failed. Server response:', axiosError.response.data);
                }
            }
            throw error;
        }
    }
    async uploadImage(file, aspectRatio, filename) {
        var _a;
        const form = new form_data_1.default();
        if (Buffer.isBuffer(file)) {
            form.append('file', file, { filename: filename });
        }
        else if (file instanceof stream_1.Readable) {
            form.append('file', file, { filename: filename });
        }
        else {
            throw new Error('Invalid file type. Expected Buffer or Readable.');
        }
        try {
            const contentLength = await (0, formUtils_1.getFormLength)(form);
            const response = await this.axiosInstance.post('/v1/portrait', form, {
                headers: {
                    ...form.getHeaders(),
                    'Content-Length': contentLength,
                },
                params: { aspect_ratio: aspectRatio },
            });
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                if (((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status) === 422) {
                    console.error('Upload failed. Server response:', axiosError.response.data);
                }
            }
            throw error;
        }
    }
    async generateCharacter(payload) {
        var _a;
        try {
            const response = await this.axiosInstance.post('/v1/characters', payload);
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                if (((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status) === 402) {
                    throw new Error('You have reached your generation credit limit. Please upgrade your plan to continue generating characters.');
                }
            }
            throw error;
        }
    }
    async waitForProjectCompletion(projectId, onProgress, interval = 5000, maxAttempts = 60) {
        return (0, api_1.pollForCompletion)(this.axiosInstance, projectId, onProgress, interval, maxAttempts);
    }
    async getAllProjects() {
        const response = await this.axiosInstance.get('/v1/projects');
        return response.data;
    }
    async getProject(projectId) {
        const response = await this.axiosInstance.get(`/v1/projects/${projectId}`);
        return response.data;
    }
    async deleteProject(projectId) {
        await this.axiosInstance.delete(`/v1/projects/${projectId}`);
    }
    async shareProject(projectId, shared) {
        await this.axiosInstance.post(`/v1/projects/${projectId}/sharing`, null, {
            params: { shared },
        });
    }
    async downloadVideo(videoUrl, outputPath) {
        const response = await this.axiosInstance.get(videoUrl, { responseType: 'stream' });
        const writer = fs_1.default.createWriteStream(outputPath);
        return new Promise((resolve, reject) => {
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    }
}
exports.HedraClient = HedraClient;
//# sourceMappingURL=client.js.map