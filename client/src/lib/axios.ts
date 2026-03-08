/**
 * Central Axios Instance
 * ─────────────────────
 * Features:
 *  - Attaches Bearer JWT from Zustand auth store on every request
 *  - Attaches X-Company-Id header for super admin company switching
 *  - Auto-handles 401 (token expired) → logs user out
 *  - Consistent base URL from env
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

// ── Token / Company getters (registered by authStore at startup) ─────────────

let _getToken: (() => string | null) | null = null;
let _getCompany: (() => string | null) | null = null;

export const registerTokenGetter = (getter: () => string | null) => { _getToken = getter; };
export const registerCompanyGetter = (getter: () => string | null) => { _getCompany = getter; };

const getAuthToken = () => (_getToken ? _getToken() : null);
const getActiveCompany = () => (_getCompany ? _getCompany() : null);

// ── Request Interceptor — Attach Bearer token + X-Company-Id ────────────────

api.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        const companyId = getActiveCompany();

        if (token) config.headers.Authorization = `Bearer ${token}`;
        if (companyId) config.headers['X-Company-Id'] = companyId;

        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor — Handle 401 globally ──────────────────────────────

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            const { logoutUser } = await import('../stores/authStore');
            logoutUser();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ── Convenience helpers ──────────────────────────────────────────────────────

export const apiGet = <T>(url: string, params?: object) => api.get<T>(url, { params }).then(r => r.data);
export const apiPost = <T>(url: string, data?: object) => api.post<T>(url, data).then(r => r.data);
export const apiPut = <T>(url: string, data?: object) => api.put<T>(url, data).then(r => r.data);
export const apiPatch = <T>(url: string, data?: object) => api.patch<T>(url, data).then(r => r.data);
export const apiDelete = <T>(url: string) => api.delete<T>(url).then(r => r.data);

/** Upload multipart form data */
export const apiUpload = <T>(url: string, formData: FormData) =>
    api.post<T>(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);

/** Download PDF — fetches from backend with auth and triggers browser download */
export const downloadPdf = async (apiPath: string, filename: string = 'document.pdf') => {
    const res = await api.get(apiPath, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    // Ensure filename always has .pdf extension
    let finalName = filename || 'document.pdf';
    if (!finalName.endsWith('.pdf')) finalName += '.pdf';

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();

    // Cleanup safely
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
};

export default api;
