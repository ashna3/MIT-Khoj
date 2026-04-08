/**
 * MIT KHOJ - Authentication Module
 * Handles login, register, token storage, and redirect logic
 */

const APP_VERSION = '20260406e';

function buildAppUrl(page) {
  const separator = page.includes('?') ? '&' : '?';
  return `${page}${separator}v=${APP_VERSION}`;
}

function normalizeInternalLinks() {
  document.querySelectorAll('a[href$=".html"], a[href*=".html?"]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http')) return;
    const base = href.split('?')[0];
    link.setAttribute('href', buildAppUrl(base));
  });
}

function isAuthenticated() {
  return !!localStorage.getItem('token');
}

function getCurrentUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  return {
    token,
    role: localStorage.getItem('role'),
    name: localStorage.getItem('name'),
    reg_no: localStorage.getItem('reg_no'),
    admin_no: localStorage.getItem('admin_no'),
  };
}

function getUserIdentifier(user = getCurrentUser()) {
  if (!user) return '';
  return user.admin_no || user.reg_no || '';
}

function storeUserSession(user) {
  localStorage.setItem('token', user.token);
  localStorage.setItem('role', user.role);
  localStorage.setItem('name', user.name);
  localStorage.setItem('reg_no', user.reg_no);
  localStorage.setItem('admin_no', user.admin_no || '');
}

function clearUserSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('name');
  localStorage.removeItem('reg_no');
  localStorage.removeItem('admin_no');
}

function logout() {
  clearUserSession();
  window.location.href = buildAppUrl('index.html');
}

function hasRole(requiredRole) {
  const user = getCurrentUser();
  if (!user) return false;

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }

  return user.role === requiredRole;
}

function protectPage(requiredRole) {
  normalizeInternalLinks();
  if (!isAuthenticated()) {
    window.location.href = buildAppUrl('index.html');
    return;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    window.location.href = buildAppUrl('index.html');
    return;
  }
}

function redirectIfAuthenticated() {
  normalizeInternalLinks();
  const user = getCurrentUser();
  if (!user) return;

  if (user.role === 'student') {
    window.location.href = buildAppUrl('student_dashboard.html');
  } else if (user.role === 'admin') {
    window.location.href = buildAppUrl('admin_dashboard.html');
  }
}

function validateRegNo(regNo) {
  return /^[A-Za-z0-9]+$/.test(regNo);
}

function validateName(name) {
  return /^[a-zA-Z\s]+$/.test(name);
}

function validatePhone(phone) {
  return /^\d{10}$/.test(phone);
}

function validatePassword(password) {
  return password.length >= 8;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    APP_VERSION,
    buildAppUrl,
    normalizeInternalLinks,
    isAuthenticated,
    getCurrentUser,
    getUserIdentifier,
    storeUserSession,
    clearUserSession,
    logout,
    hasRole,
    protectPage,
    redirectIfAuthenticated,
    validateRegNo,
    validateName,
    validatePhone,
    validatePassword,
    validateEmail,
  };
}
