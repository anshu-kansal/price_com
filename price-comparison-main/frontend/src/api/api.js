import axios from 'axios';

/**
 * Standardized Database API Proxy Instance.
 * Overrides native browser CORS blocking by establishing an absolute base endpoint bound strictly to Django.
 */
const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    timeout: 60000, // 60-Second explicit memory safeguard aligning with Celery limits
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    // Required to seamlessly pass CSRF tokens or cookies across Origins if utilized
    withCredentials: true
});

/**
 * Global Response Interceptor.
 * Destroys 'Silent Fails'. This strictly parses and logs precise Network exceptions locally 
 * defining exactly WHY an axios call dropped before destroying the React UI.
 */
api.interceptors.response.use(
    (response) => {
        // Transparent passthrough on Success
        return response;
    },
    (error) => {
        // Rigid Debugging Interceptor
        console.error("\n[API CONNECTION FAILURE]");
        if (error.response) {
            // The server responded with a status code that falls out of the '2xx' range
            console.error(`=> HTTP Status: ${error.response.status}`);
            console.error(`=> Endpoint: ${error.response.config.url}`);
            console.error(`=> Payload Dump:`, error.response.data);

            if (error.response.status === 403) {
                console.error("Diagnosis: CORS Rejected or CSRF Denied. Check Django settings `CORS_ALLOWED_ORIGINS`.");
            } else if (error.response.status === 404) {
                console.error("Diagnosis: Bad Request/Not Found. Did you include trailing slashes ('/') in your Axios URL?");
            } else if (error.response.status >= 500) {
                console.error("Diagnosis: Django Backend crashed internally. Check celery logs or running server console.");
            }
        } else if (error.request) {
            // The request was cleanly made but absolutely zero response was received (Django is offline)
            console.error("=> State: No Response Received. Is the Django `runserver` actively spinning?");
            console.error("=> Headers Trace: ", error.request);
        } else {
            // Something catastrophic happened rendering the actual request configuration locally
            console.error("=> State: Axios Initialization Failure:", error.message);
        }

        // Pass the error back down the UI chain for visual User ingestion
        return Promise.reject(error);
    }
);

export default api;
