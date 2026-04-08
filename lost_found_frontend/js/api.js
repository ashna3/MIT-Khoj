/**
 * MIT KHOJ — API Utility Module
 * Centralized API configuration and fetch wrapper with auth headers
 */

// Configurable BASE_URL — change this to match your backend
const BASE_URL = 'http://localhost:5000';

function getApiMessage(payload, fallback = 'Something went wrong') {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  return payload.message || payload.error || fallback;
}

/**
 * Fetch wrapper with automatic auth header injection
 * @param {string} endpoint - API endpoint (e.g., '/api/auth/login')
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<object>} - Parsed JSON response
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  // Get token from localStorage
  const token = localStorage.getItem('token');
  
  // Set up headers
  const headers = { ...options.headers };
  
  // Set default Content-Type to application/json, except for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Merge with provided options
  const fetchOptions = {
    ...options,
    headers,
  };
  
  try {
    const response = await fetch(url, fetchOptions);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // If response is not OK, throw error
    if (!response.ok) {
      const isAuthRequest = endpoint.startsWith('/api/auth/');
      if (response.status === 401 && !isAuthRequest && localStorage.getItem('token')) {
        localStorage.clear();
        window.location.href = 'index.html';
      }
      const error = new Error(getApiMessage(data, `HTTP ${response.status}`));
      error.status = response.status;
      error.data = data;
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * GET request
 */
function apiGet(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;
  return apiFetch(url, { method: 'GET' });
}

/**
 * POST request
 */
function apiPost(endpoint, body = {}) {
  return apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PATCH request
 */
function apiPatch(endpoint, body = {}) {
  return apiFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request
 */
function apiDelete(endpoint) {
  return apiFetch(endpoint, { method: 'DELETE' });
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BASE_URL,
    apiFetch,
    apiGet,
    apiPost,
    apiPatch,
    apiDelete,
    getApiMessage,
  };
}
