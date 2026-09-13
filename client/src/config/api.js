const normalizeBaseUrl = (value, fallback) => {
  // Use value only if it is a non-empty string; otherwise fall back to the default.
  // This ensures VITE_AI_SERVICE_URL='' still uses the '/python-api' fallback,
  // preventing requests from being misrouted through the Express /api proxy.
  const candidate = (value && value.trim()) || (fallback ?? '');
  return candidate.trim().replace(/\/+$/, '');
};

const buildUrl = (baseUrl, path) => {
  if (!path) {
    return baseUrl;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
};

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL, '');
export const AI_SERVICE_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_AI_SERVICE_URL, '/python-api');

export const getApiUrl = (path) => buildUrl(API_BASE_URL, path);
export const getAiServiceUrl = (path) => buildUrl(AI_SERVICE_BASE_URL, path);
