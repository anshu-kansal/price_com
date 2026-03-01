import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/api';

/**
 * Custom React Hook: useTaskPolling
 * 
 * Production-ready UX hook managing asynchronous Celery task tracking.
 * Provides a 'Real-Time' bridge between frontend dashboards and backend Python workers.
 * Features strict memory-leak safeguards, overlapping request protection, and hard timeouts.
 */
export const useTaskPolling = () => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(''); // Text representation of backend Celery state
    const [productData, setProductData] = useState(null); // Final JSON Payload
    const [error, setError] = useState(null); // String representation of errors or timeouts

    const pollingIntervalRef = useRef(null);
    const inFlightRequestRef = useRef(false);
    const pollingStartTimeRef = useRef(null);

    // Hard Memory/Timeout Shielding: Stop hanging processes after 60 seconds
    const MAX_POLLING_DURATION_MS = 60000;
    const POLLING_RATE_MS = 2000;

    const cleanupPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        inFlightRequestRef.current = false;
        pollingStartTimeRef.current = null;
    }, []);

    // Ensure strict cleanup when the Component utilizing this hook unmounts completely
    useEffect(() => {
        return cleanupPolling;
    }, [cleanupPolling]);

    /**
     * Internal recursive polling engine interacting with Django's TaskStatusView.
     */
    const startPolling = useCallback((taskId) => {
        pollingStartTimeRef.current = Date.now();

        pollingIntervalRef.current = setInterval(async () => {
            // Anti-Slam protection: Do not send the next request if the previous hasn't returned yet
            if (inFlightRequestRef.current) return;

            // Timeout Check Policy: Prevent infinite 'Zombie' UX Spinners
            if (Date.now() - pollingStartTimeRef.current > MAX_POLLING_DURATION_MS) {
                cleanupPolling();
                setLoading(false);
                setError('Request Timeout: The scraping operation exceeded 60 seconds. Please try again.');
                return;
            }

            try {
                inFlightRequestRef.current = true;
                const response = await api.get(`/api/tasks/status/${taskId}/`);
                const data = response.data;

                // Dynamically update the visual Progress Text based on worker state
                setStatus(data.message || data.state);

                if (data.state === 'SUCCESS') {
                    // Task finalized cleanly! Drop the loader and ingest the result JSON
                    cleanupPolling();
                    setProductData(data.result);
                    setLoading(false);
                    setStatus('Complete!');
                } else if (data.state === 'FAILURE' || data.state === 'REVOKED') {
                    // Task encountered a crash (e.g., CAPTCHA block or TimeoutException)
                    cleanupPolling();
                    setLoading(false);
                    setError('Scraping Error: Our workers failed to retrieve prices for this item.');
                }
            } catch (err) {
                // Network drops or internal 500 errors tracking the status endpoint
                cleanupPolling();
                setLoading(false);
                setError('Network Error: Failed to check task status.');
                console.error("Polling Network Failure:", err);
            } finally {
                inFlightRequestRef.current = false;
            }
        }, POLLING_RATE_MS);
    }, [cleanupPolling]);


    /**
     * Primary exported Trigger Function. Call this immediately when users submit a Search query.
     * Expects the Django backend to return HTTP 202 Accepted alongside { "task_id": "uuid..." }
     */
    const handleSearch = async (searchQuery) => {
        try {
            cleanupPolling(); // Cancel any existing/overlapping searches automatically
            setLoading(true);
            setError(null);
            setStatus('Initializing connection...');
            setProductData(null);

            // Trigger the initial background worker handoff router
            const response = await api.get(`/api/products/search/?q=${encodeURIComponent(searchQuery)}`);

            if (response.data && response.data.task_id) {
                setStatus('Background worker dispatched. Connecting...');
                startPolling(response.data.task_id);
            } else if (response.data && response.data.length > 0) {
                // If it satisfied the "2-Hour Freshness Policy", backend returns direct DB array
                setProductData(response.data);
                setLoading(false);
                setStatus('Data pulled from Cache.');
            } else {
                setLoading(false);
                setError('Unexpected response from server.');
            }
        } catch (err) {
            setLoading(false);
            setError('Failed to initiate search pipeline.');
            console.error("Initiation Network Failure:", err);
        }
    };

    return {
        handleSearch,
        loading,
        status,
        productData,
        error,
        cancelTask: cleanupPolling // allow users to manually hit an 'X' button to stop searching
    };
};
