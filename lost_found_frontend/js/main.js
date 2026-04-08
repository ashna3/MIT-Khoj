/**
 * MIT KHOJ — Main Utilities Module
 * Shared utilities for toasts, spinners, and common functions
 */

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - 'success', 'error', or 'warning'
 * @param {number} duration - Duration in ms (default 3000)
 */
function showToast(message, type = 'success', duration = 3000) {
  // Create container if it doesn't exist
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Close">×</button>
  `;
  
  // Add to container
  container.appendChild(toast);
  
  // Close button handler
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    removeToast(toast);
  });
  
  // Auto-dismiss
  setTimeout(() => {
    removeToast(toast);
  }, duration);
}

/**
 * Remove toast with animation
 * @param {HTMLElement} toast
 */
function removeToast(toast) {
  toast.style.animation = 'toastSlide 0.2s ease reverse';
  setTimeout(() => {
    toast.remove();
  }, 200);
}

/**
 * Show loading spinner
 * @returns {HTMLElement} - Spinner element
 */
function showSpinner() {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'spinner-overlay';
  overlay.id = 'spinner-overlay';
  
  overlay.innerHTML = '<div class="spinner"></div>';
  
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * Hide loading spinner
 */
function hideSpinner() {
  const overlay = document.getElementById('spinner-overlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format date to readable format
 * @param {string|Date} date
 * @returns {string}
 */
function formatDate(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date and time
 * @param {string|Date} date
 * @returns {string}
 */
function formatDateTime(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format time to readable format
 * @param {string|Date} date
 * @returns {string}
 */
function formatTime(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate days difference
 * @param {Date} date1
 * @param {Date} date2
 * @returns {number}
 */
function daysDifference(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1 - date2) / oneDay));
}

/**
 * Debounce function
 * @param {Function} func
 * @param {number} wait
 * @returns {Function}
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func
 * @param {number} limit
 * @returns {Function}
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Show confirmation dialog
 * @param {string} message
 * @returns {Promise<boolean>}
 */
function showConfirmation(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const card = document.createElement('div');
    card.className = 'modal-card';
    
    card.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">Confirm</h2>
      </div>
      <div class="modal-body">
        <p>${escapeHtml(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
        <button class="btn btn-danger" id="confirm-btn">Confirm</button>
      </div>
    `;
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    const confirmBtn = card.querySelector('#confirm-btn');
    const cancelBtn = card.querySelector('#cancel-btn');
    
    const cleanup = () => {
      overlay.style.animation = 'modalFadeIn 0.2s ease reverse';
      card.style.animation = 'modalSlideIn 0.2s ease reverse';
      setTimeout(() => overlay.remove(), 200);
    };
    
    confirmBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
    
    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
  });
}

/**
 * Sort array of objects by property
 * @param {Array} array
 * @param {string} property
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array}
 */
function sortBy(array, property, order = 'asc') {
  const sorted = [...array].sort((a, b) => {
    const aVal = a[property];
    const bVal = b[property];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}

/**
 * Filter array by multiple criteria
 * @param {Array} array
 * @param {object} criteria
 * @returns {Array}
 */
function filterBy(array, criteria) {
  return array.filter((item) => {
    return Object.keys(criteria).every((key) => {
      return item[key] === criteria[key];
    });
  });
}

/**
 * Get query parameter from URL
 * @param {string} param
 * @returns {string|null}
 */
function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

/**
 * Build query string from object
 * @param {object} params
 * @returns {string}
 */
function buildQueryString(params) {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );
  
  return new URLSearchParams(filtered).toString();
}

/**
 * Validate form fields
 * @param {object} fields - Object with field names and validation rules
 * @returns {object} - Errors object
 */
function validateForm(fields) {
  const errors = {};
  
  Object.keys(fields).forEach((fieldName) => {
    const value = fields[fieldName].value;
    const rules = fields[fieldName].rules || [];
    
    rules.forEach((rule) => {
      if (!rule.validate(value)) {
        errors[fieldName] = rule.message;
      }
    });
  });
  
  return errors;
}

/**
 * Display form errors
 * @param {object} errors - Errors object
 * @param {HTMLElement} formElement - Form element
 */
function displayFormErrors(errors, formElement) {
  // Clear previous errors
  formElement.querySelectorAll('.error-message').forEach((el) => el.remove());
  
  // Display new errors
  Object.keys(errors).forEach((fieldName) => {
    const field = formElement.querySelector(`[name="${fieldName}"]`);
    if (field) {
      const errorEl = document.createElement('span');
      errorEl.className = 'error-message';
      errorEl.textContent = errors[fieldName];
      field.parentElement.appendChild(errorEl);
    }
  });
}

/**
 * Clear form errors
 * @param {HTMLElement} formElement - Form element
 */
function clearFormErrors(formElement) {
  formElement.querySelectorAll('.error-message').forEach((el) => el.remove());
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showToast,
    removeToast,
    showSpinner,
    hideSpinner,
    escapeHtml,
    formatDate,
    formatDateTime,
    formatTime,
    daysDifference,
    debounce,
    throttle,
    showConfirmation,
    sortBy,
    filterBy,
    getQueryParam,
    buildQueryString,
    validateForm,
    displayFormErrors,
    clearFormErrors,
  };
}
