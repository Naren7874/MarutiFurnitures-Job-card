/**
 * API Query Hooks — TanStack Query
 * ─────────────────────────────────
 * All data-fetching logic lives here. Components just call hooks.
 * Uses central axios instance — auth token injected automatically.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiPut } from '../lib/axios';

// ─── Query Key Factory ────────────────────────────────────────────────────────
// Centralized query keys prevent typos and make invalidation precise

export const QK = {
    clients: (params?: object) => ['clients', params],
    client: (id: string) => ['clients', id],
    quotations: (params?: object) => ['quotations', params],
    quotation: (id: string) => ['quotations', id],
    projects: (params?: object) => ['projects', params],
    project: (id: string) => ['projects', id],
    jobCards: (params?: object) => ['jobcards', params],
    jobCard: (id: string) => ['jobcards', id],
    invoices: (params?: object) => ['invoices', params],
    invoice: (id: string) => ['invoices', id],
    inventory: (params?: object) => ['inventory', params],
    notifications: (params?: object) => ['notifications', params],
    me: () => ['auth', 'me'],
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const useMe = () =>
    useQuery({ queryKey: QK.me(), queryFn: () => apiGet('/auth/me') });

// ─── Clients ─────────────────────────────────────────────────────────────────

export const useClients = (params: object = {}) =>
    useQuery({ queryKey: QK.clients(params), queryFn: () => apiGet('/clients', params) });

export const useClient = (id: string) =>
    useQuery({ queryKey: QK.client(id), queryFn: () => apiGet(`/clients/${id}`), enabled: !!id });

export const useCreateClient = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPost('/clients', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
    });
};

export const useUpdateClient = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPut(`/clients/${id}`, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); qc.invalidateQueries({ queryKey: QK.client(id) }); },
    });
};

export const useVerifyGST = () =>
    useMutation({ mutationFn: (data: { gstin: string; clientId?: string }) => apiPost('/gst/verify', data) });

// ─── Quotations ───────────────────────────────────────────────────────────────

export const useQuotations = (params: object = {}) =>
    useQuery({ queryKey: QK.quotations(params), queryFn: () => apiGet('/quotations', params) });

export const useQuotation = (id: string) =>
    useQuery({ queryKey: QK.quotation(id), queryFn: () => apiGet(`/quotations/${id}`), enabled: !!id });

export const useCreateQuotation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPost('/quotations', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
    });
};

export const useUpdateQuotation = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPut(`/quotations/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: QK.quotation(id) }),
    });
};

export const useSendQuotation = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiPatch(`/quotations/${id}/send`),
        onSuccess: () => qc.invalidateQueries({ queryKey: QK.quotation(id) }),
    });
};

export const useApproveQuotation = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiPatch(`/quotations/${id}/approve`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotations'] }); qc.invalidateQueries({ queryKey: QK.quotation(id) }); },
    });
};

export const useRejectQuotation = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiPatch(`/quotations/${id}/reject`),
        onSuccess: () => qc.invalidateQueries({ queryKey: QK.quotation(id) }),
    });
};

export const useReviseQuotation = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPost(`/quotations/${id}/revise`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
    });
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export const useProjects = (params: object = {}) =>
    useQuery({ queryKey: QK.projects(params), queryFn: () => apiGet('/projects', params) });

export const useProject = (id: string) =>
    useQuery({ queryKey: QK.project(id), queryFn: () => apiGet(`/projects/${id}`), enabled: !!id });

export const useCreateProject = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPost('/projects', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
    });
};

// ─── Job Cards ────────────────────────────────────────────────────────────────

export const useJobCards = (params: object = {}) =>
    useQuery({ queryKey: QK.jobCards(params), queryFn: () => apiGet('/jobcards', params) });

export const useJobCard = (id: string) =>
    useQuery({ queryKey: QK.jobCard(id), queryFn: () => apiGet(`/jobcards/${id}`), enabled: !!id });

export const useCreateJobCard = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPost('/jobcards', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['jobcards'] }),
    });
};

export const useHoldJobCard = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { reason: string }) => apiPatch(`/jobcards/${id}/hold`, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobcards'] }); qc.invalidateQueries({ queryKey: QK.jobCard(id) }); },
    });
};

export const useCancelJobCard = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { reason: string }) => apiPatch(`/jobcards/${id}/cancel`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['jobcards'] }),
    });
};

// ─── Store Stage ─────────────────────────────────────────────────────────────

export const useStoreStage = (jobCardId: string) =>
    useQuery({ queryKey: ['storeStage', jobCardId], queryFn: () => apiGet(`/jobcards/${jobCardId}/store`), enabled: !!jobCardId });

export const useIssueMaterial = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPatch(`/jobcards/${jobCardId}/store/issue-all`, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['storeStage', jobCardId] }); qc.invalidateQueries({ queryKey: QK.jobCard(jobCardId) }); },
    });
};

// ─── Production Stage ────────────────────────────────────────────────────────

export const useProductionStage = (jobCardId: string) =>
    useQuery({ queryKey: ['productionStage', jobCardId], queryFn: () => apiGet(`/jobcards/${jobCardId}/production`), enabled: !!jobCardId });

export const useUpdateSubstage = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; status: string; workerName?: string }) => apiPatch(`/jobcards/${jobCardId}/production/substage`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['productionStage', jobCardId] }),
    });
};

// ─── QC Stage ────────────────────────────────────────────────────────────────

export const useQCStage = (jobCardId: string) =>
    useQuery({ queryKey: ['qcStage', jobCardId], queryFn: () => apiGet(`/jobcards/${jobCardId}/qc`), enabled: !!jobCardId });

export const usePassQC = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiPatch(`/jobcards/${jobCardId}/qc/pass`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['qcStage', jobCardId] }); qc.invalidateQueries({ queryKey: QK.jobCard(jobCardId) }); },
    });
};

export const useFailQC = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { failReason: string; defectSummary: string }) => apiPatch(`/jobcards/${jobCardId}/qc/fail`, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['qcStage', jobCardId] }); qc.invalidateQueries({ queryKey: QK.jobCard(jobCardId) }); },
    });
};

// ─── Invoices ────────────────────────────────────────────────────────────────

export const useInvoices = (params: object = {}) =>
    useQuery({ queryKey: QK.invoices(params), queryFn: () => apiGet('/invoices', params) });

export const useInvoice = (id: string) =>
    useQuery({ queryKey: QK.invoice(id), queryFn: () => apiGet(`/invoices/${id}`), enabled: !!id });

export const useCreateInvoice = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPost('/invoices', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
    });
};

export const useRecordPayment = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { amount: number; mode: string; reference: string }) => apiPost(`/invoices/${id}/payment`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: QK.invoice(id) }),
    });
};

// ─── Inventory ────────────────────────────────────────────────────────────────

export const useInventory = (params: object = {}) =>
    useQuery({ queryKey: QK.inventory(params), queryFn: () => apiGet('/inventory', params) });

export const useRestockItem = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { qty: number }) => apiPatch(`/inventory/${id}/restock`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
};
