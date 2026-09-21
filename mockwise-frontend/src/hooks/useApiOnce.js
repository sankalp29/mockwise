import { useRef, useCallback } from 'react';
import axios from 'axios';
import { logger } from '../utils/logger';

/**
 * Custom hook to prevent duplicate API requests when users switch tabs/windows
 * Uses sessionStorage to track requests per session and useRef to prevent duplicates within component lifecycle
 * 
 * @param {string} requestKey - Unique identifier for the API request (e.g., 'dashboard-metrics', 'interview-start')
 * @param {Object} options - Configuration options
 * @param {boolean} options.enableSessionStorage - Whether to use sessionStorage tracking (default: true)
 * @param {boolean} options.enableRefTracking - Whether to use ref tracking within component (default: true)
 * @returns {Object} - { makeRequest, isRequestInitiated, resetRequest }
 */
export const useApiOnce = (requestKey, options = {}) => {
  const {
    enableSessionStorage = true,
    enableRefTracking = true
  } = options;

  const requestInitiatedRef = useRef(false);
  const requestInProgressRef = useRef(false); // Track if request is currently in progress
  
  // Use more stable keys that survive React Strict Mode
  const sessionStorageKey = `api_request_${requestKey}`;
  const inProgressKey = `api_inprogress_${requestKey}`;
  const timestampKey = `api_timestamp_${requestKey}`;
  const responseKey = `api_response_${requestKey}`;

  const isRequestInitiated = useCallback(() => {
    // Check if request is currently in progress (highest priority)
    if (enableRefTracking && requestInProgressRef.current) {
      logger.log(`🔒 ${requestKey}: Blocked by requestInProgressRef`);
      return true;
    }
    
    // Check if sessionStorage request is recent (within last 60 seconds)
    if (enableSessionStorage) {
      const timestamp = sessionStorage.getItem(timestampKey);
      const isCompleted = sessionStorage.getItem(sessionStorageKey) === 'true';
      const isInProgress = sessionStorage.getItem(inProgressKey) === 'true';
      
      logger.log(`🔍 ${requestKey}: SessionStorage check:`, {
        timestamp,
        isCompleted,
        isInProgress,
        age: timestamp ? Date.now() - parseInt(timestamp) : null
      });
      
      if (timestamp && (isCompleted || isInProgress)) {
        const age = Date.now() - parseInt(timestamp);
        if (age < 60000) { // 60 seconds
          logger.log(`🔒 ${requestKey}: Blocked by sessionStorage (age: ${age}ms)`);
          return true;
        } else {
          // Request is stale, clear it
          logger.log(`🧹 ${requestKey}: Clearing stale request (age: ${age}ms)`);
          sessionStorage.removeItem(sessionStorageKey);
          sessionStorage.removeItem(inProgressKey);
          sessionStorage.removeItem(timestampKey);
        }
      }
    }
    
    // Check if request was already completed
    if (enableRefTracking && requestInitiatedRef.current) {
      logger.log(`🔒 ${requestKey}: Blocked by requestInitiatedRef`);
      return true;
    }
    
    logger.log(`✅ ${requestKey}: Request allowed to proceed`);
    return false;
  }, [requestKey, sessionStorageKey, inProgressKey, timestampKey, enableSessionStorage, enableRefTracking]);

  const makeRequest = useCallback(async (requestConfig) => {
    // Reduced logging for production readiness
    logger.log(`🔧 API request '${requestKey}' attempting...`);
    
    // ATOMIC CHECK AND SET: Immediately set in-progress flags to prevent race conditions
    if (enableRefTracking) {
      if (requestInProgressRef.current || requestInitiatedRef.current) {
        logger.log(`API request '${requestKey}' already initiated, skipping...`);
        return { skipped: true };
      }
      requestInProgressRef.current = true; // Set IMMEDIATELY
    }
    
    if (enableSessionStorage) {
      if (sessionStorage.getItem(sessionStorageKey) === 'true' || 
          sessionStorage.getItem(inProgressKey) === 'true') {
        logger.log(`API request '${requestKey}' already initiated, skipping...`);
        return { skipped: true };
      }
      const timestamp = Date.now().toString();
      sessionStorage.setItem(inProgressKey, 'true'); // Set IMMEDIATELY
      sessionStorage.setItem(timestampKey, timestamp); // Set timestamp
    }

    try {
      // Make the API request
      const response = await axios(requestConfig);
      
      // Mark as completed (move from in-progress to completed)
      if (enableRefTracking) {
        requestInitiatedRef.current = true;
        requestInProgressRef.current = false;
      }
      if (enableSessionStorage) {
        sessionStorage.setItem(sessionStorageKey, 'true');
        sessionStorage.removeItem(inProgressKey);
        try {
          sessionStorage.setItem(responseKey, JSON.stringify(response.data));
        } catch (_) {
          // ignore serialization errors
        }
      }
      
      return { data: response.data, response };
    } catch (error) {
      // Reset on error to allow retry
      if (enableRefTracking) {
        requestInProgressRef.current = false;
        requestInitiatedRef.current = false;
      }
      if (enableSessionStorage) {
        sessionStorage.removeItem(inProgressKey);
        sessionStorage.removeItem(sessionStorageKey);
      }
      throw error;
    }
  }, [requestKey, sessionStorageKey, inProgressKey, enableSessionStorage, enableRefTracking]);

  const resetRequest = useCallback(() => {
    if (enableRefTracking) {
      requestInitiatedRef.current = false;
      requestInProgressRef.current = false;
    }
    if (enableSessionStorage) {
      sessionStorage.removeItem(sessionStorageKey);
      sessionStorage.removeItem(inProgressKey);
      sessionStorage.removeItem(timestampKey);
      sessionStorage.removeItem(responseKey);
    }
  }, [sessionStorageKey, inProgressKey, timestampKey, enableSessionStorage, enableRefTracking]);

  const getExistingResult = useCallback(() => {
    if (!enableSessionStorage) return null;
    const data = sessionStorage.getItem(responseKey);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (_) {
      return null;
    }
  }, [responseKey, enableSessionStorage]);

  const waitForExistingResult = useCallback(async (timeoutMs = 60000, pollMs = 200) => {
    const start = Date.now();
    const immediate = getExistingResult();
    if (immediate) return immediate;
    while (true) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timed out waiting for existing result for ${requestKey}`);
      }
      const data = getExistingResult();
      if (data) return data;
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }, [getExistingResult, requestKey]);

  return {
    makeRequest,
    isRequestInitiated,
    resetRequest,
    getExistingResult,
    waitForExistingResult
  };
};

export default useApiOnce;
