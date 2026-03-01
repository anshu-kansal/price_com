import axios from 'axios';

// Standardized Core Instance
const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10s cutoff for safety
});

// Request Interceptor: Log outgoing traffic
api.interceptors.request.use(
    (config) => {
        // Log transmission
        console.log(`[API Transmit] ${config.method.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Global failure normalization
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Standardize 'Connection Error' payload matching backend configurations
        if (!error.response) {
            console.error('[API Failure] Network Down / CORS Rejected:', error.message);
            return Promise.reject(new Error('Connection Error: The backend server is currently unreachable.'));
        }

        console.error(`[API Reject v${error.response.status}]`, error.response.data);
        return Promise.reject(error);
    }
);

/**
 * Enterprise Polling Routine for Celery Task Synchronization
 * // Polling start karega yahan se, continuously matching backend UUIDs with a 2-second rate-limit.
 * @param {string} taskId - Celery Worker UUID 
 * @param {function} onStatusChange - Callback to sync UI Loading states
 * @returns {Promise<Object>} The resolved scraped product array
 */
export const pollTaskStatus = async (taskId, onStatusChange) => {
    const delay = ms => new Promise(res => setTimeout(res, ms));
    const maxAttempts = 30; // 60s hard timeout

    for (let attempts = 0; attempts < maxAttempts; attempts++) {
        const response = await api.get(`/tasks/status/${taskId}/`);
        const { status, data, error } = response.data;

        if (onStatusChange) {
            onStatusChange(`[Worker Phase ${attempts}] Status: ${status}`);
        }

        if (status === 'success') {
            return { products: data };
        }

        if (status === 'failure' || status === 'error' || status === 'no_results') {
            throw new Error(error || 'Worker task terminated unexpectedly.');
        }

        // 2-second interval lock to prevent server ping flooding
        await delay(2000);
    }

    throw new Error('Task Timeout: The scraper exceeded execution parameters.');
};

export default api;
