const normalizeBaseUrl = (value, fallback) => {
  const candidate = (value ?? fallback ?? '').trim();
  return candidate.replace(/\/+$/, '');
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
