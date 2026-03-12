import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 60000,
});

api.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);

export const getApiErrorMessage = (error, fallbackMessage = 'Request failed.') => {
    const detail = error?.response?.data?.detail;

    if (typeof detail === 'string' && detail.trim()) {
        return detail;
    }

    return fallbackMessage;
};

export const uploadDocuments = (formData, onProgress) =>
    api.post('/upload-documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
            if (!onProgress || !event?.total) {
                return;
            }

            const pct = Math.round((event.loaded * 100) / event.total);
            onProgress(pct);
        },
    });

export const getDocuments = () => api.get('/documents');

export const deleteDocument = (documentName) =>
    api.delete(`/documents/${encodeURIComponent(documentName)}`);

export const analyzeRisk = (query) =>
    api.post('/analyze-risk', { query });

export const sendChatMessage = (question, history = []) =>
    api.post('/chat', { question, history });

export const generateReport = (query) =>
    api.post('/generate-report', query ? { query } : {});

export default api;
