/**
 * Auth Store (Zustand)
 * ─────────────────────
 * Single source of truth for authentication state.
 * Persisted to localStorage via zustand/middleware/persist.
 * Token getter is registered with axios to avoid circular imports.
 *
 * Super Admin: can hold multiple companies and switch between them without re-login.
 * Switching sets activeCompanyId; axios sends X-Company-Id header; backend honours it.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { registerTokenGetter, registerCompanyGetter } from '../lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    companyId: string;
    isSuperAdmin: boolean;
    profilePhoto?: string;
    effectivePermissions: string[];
}

export interface CompanyInfo {
    id: string;
    name: string;
    slug: string;
    gstin?: string;
    plan?: string;
}

interface AuthState {
    token: string | null;
    user: AuthUser | null;
    company: CompanyInfo | null;          // Currently active company
    allCompanies: CompanyInfo[];           // Super admin sees all companies
    isLoggedIn: boolean;

    // Actions
    setAuth: (token: string, user: AuthUser, companies?: CompanyInfo[]) => void;
    setCompany: (company: CompanyInfo) => void;
    switchCompany: (company: CompanyInfo) => void;
    setToken: (token: string) => void;
    logout: () => void;
    hasPermission: (permission: string) => boolean;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            company: null,
            allCompanies: [],
            isLoggedIn: false,

            setAuth: (token, user, companies = []) => {
                set({ token, user, isLoggedIn: true, allCompanies: companies });
            },

            setCompany: (company) => {
                set({ company });
            },

            /**
             * Switch active company — no re-login required.
             * Axios interceptor will pick up the new activeCompanyId and
             * send it as X-Company-Id header on every subsequent request.
             */
            switchCompany: (company) => {
                set({ company });
            },

            setToken: (token) => {
                set({ token });
            },

            logout: () => {
                set({ token: null, user: null, company: null, allCompanies: [], isLoggedIn: false });
            },

            /**
             * Check if current user has a specific permission.
             * Super admins always have all permissions ('*.*').
             * Supports wildcards: 'inventory.*' matches 'inventory.view', etc.
             */
            hasPermission: (required: string) => {
                const { user } = get();
                if (!user) return false;
                if (user.isSuperAdmin) return true;

                const [resource, action] = required.split('.');
                return user.effectivePermissions.some((p) => {
                    if (p === '*.*') return true;
                    const [r, a] = p.split('.');
                    return r === resource && (a === '*' || a === action);
                });
            },
        }),
        {
            name: 'maruti-auth',
            partialize: (state) => ({
                token: state.token,
                user: state.user,
                company: state.company,
                allCompanies: state.allCompanies,
                isLoggedIn: state.isLoggedIn,
            }),
        }
    )
);

// ── Global helpers (called by axios interceptor on module load) ───────────────

export const logoutUser = () => useAuthStore.getState().logout();
export const setToken = (token: string) => useAuthStore.getState().setToken(token);

registerTokenGetter(() => useAuthStore.getState().token);
registerCompanyGetter(() => useAuthStore.getState().company?.id ?? null);
