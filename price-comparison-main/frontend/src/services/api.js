import axios from 'axios';

// Task 1: API Centralization
const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    // Required to ensure the Django backend accepts the request
    withCredentials: true
});

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        console.error("\n[API CONNECTION FAILURE]");
        if (error.response) {
            console.error(`=> HTTP Status: ${error.response.status}`);
            console.error(`=> Endpoint: ${error.response.config.url}`);
            console.error(`=> Payload Dump:`, error.response.data);
        } else if (error.request) {
            console.error("=> State: No Response Received. Is the Django `runserver` actively spinning?");
        } else {
            console.error("=> State: Axios Initialization Failure:", error.message);
        }
        return Promise.reject(error);
    }
);

export default api;