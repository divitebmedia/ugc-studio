"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollForCompletion = void 0;
async function pollForCompletion(axiosInstance, projectId, onProgress, interval = 5000, maxAttempts = 60) {
    let attempts = 0;
    while (attempts < maxAttempts) {
        const response = await axiosInstance.get(`/v1/projects/${projectId}`);
        const project = response.data;
        if (onProgress) {
            onProgress(project.status || 'In Progress');
        }
        if (project.status === 'Completed') {
            return project;
        }
        if (project.status === 'Failed') {
            throw new Error(`Project failed: ${project.errorMessage}`);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
    }
    throw new Error('Polling timed out');
}
exports.pollForCompletion = pollForCompletion;
//# sourceMappingURL=api.js.map