import axios from 'axios';

// Central API Source of Truth
export const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Standardized Direct API Mapping Instance.
 * Explicitly allows credentials for Cross-Origin resource sharing (CORS).
 */
const apiConfig = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

export default apiConfig;
