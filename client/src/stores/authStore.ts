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
import { apiPost, registerTokenGetter, registerCompanyGetter } from '../lib/axios';

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
    logo?: string;
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
    switchCompany: (company: CompanyInfo) => Promise<boolean>;
    setToken: (token: string) => void;
    logout: () => void;
    hasPermission: (permission: string | string[]) => boolean;
    updateUser: (user: AuthUser) => void;
    updateCompanies: (companies: CompanyInfo[]) => void;
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
             * Switch active company — calls backend to get a new token 
             * scoped to the new company.
             */
            switchCompany: async (company) => {
                try {
                    const res: any = await apiPost('/auth/switch-company', { companySlug: company.slug });
                    if (res.success) {
                        set({ 
                            token: res.token, 
                            user: res.user, 
                            company: res.company || company 
                        });
                        return true;
                    }
                } catch (err) {
                    console.error('Failed to switch company:', err);
                }
                return false;
            },

            setToken: (token) => {
                set({ token });
            },

            logout: () => {
                set({ token: null, user: null, company: null, allCompanies: [], isLoggedIn: false });
            },

            hasPermission: (required: string | string[]) => {
                const { user } = get();
                if (!user) return false;
                if (user.isSuperAdmin) return true;

                const check = (req: string) => {
                    const [resource, action] = req.split('.');
                    return user.effectivePermissions.some((p) => {
                        if (p === '*.*') return true;
                        const [r, a] = p.split('.');
                        return r === resource && (a === '*' || a === action);
                    });
                };

                return Array.isArray(required) ? required.some(check) : check(required);
            },

            updateUser: (user) => {
                set({ user });
            },

            updateCompanies: (companies) => {
                set({ allCompanies: companies });
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
