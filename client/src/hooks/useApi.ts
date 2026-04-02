/**
 * API Query Hooks — TanStack Query
 * ─────────────────────────────────
 * All data-fetching logic lives here. Components just call hooks.
 * Uses central axios instance — auth token injected automatically.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from '../lib/axios';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';

// ─── Query Key Factory ────────────────────────────────────────────────────────
// Every key starts with [resource, companyId] to ensure cache isolation.

export const QK = {
    clients: (cid: string, params?: object) => ['clients', cid, params],
    client: (cid: string, id: string) => ['clients', cid, id],
    quotations: (cid: string, params?: object) => ['quotations', cid, params],
    quotation: (cid: string, id: string) => ['quotations', cid, id],
    projects: (cid: string, params?: object) => ['projects', cid, params],
    project: (cid: string, id: string) => ['projects', cid, id],
    jobCards: (cid: string, params?: object) => ['jobcards', cid, params],
    jobCard: (cid: string, id: string) => ['jobcards', cid, id],
    invoices: (cid: string, params?: object) => ['invoices', cid, params],
    invoice: (cid: string, id: string) => ['invoices', cid, id],
    inventory: (cid: string, params?: object) => ['inventory', cid, params],
    notifications: (cid: string, params?: object) => ['notifications', cid, params],
    me: () => ['auth', 'me'],
    dashboard: (cid: string) => ['dashboard', cid, 'stats'],
    reports: (cid: string, type: string, params?: object) => ['reports', cid, type, params],
    users: (cid: string, params?: object) => ['users', cid, params],
    user: (cid: string, id: string) => ['user', cid, id],
    // Architect portal — cross-company, keyed by userId not companyId
    architectDashboard: (uid: string) => ['architect', uid, 'dashboard'],
    architectQuotations: (uid: string, params?: object) => ['architect', uid, 'quotations', params],
    architectClients: (uid: string) => ['architect', uid, 'clients'],
    architectQuotation: (uid: string, id: string) => ['architect', uid, 'quotations', id],
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const useMe = () =>
    useQuery({ queryKey: QK.me(), queryFn: () => apiGet('/auth/me') });

// ─── Clients ─────────────────────────────────────────────────────────────────

export const useClients = (params: object = {}) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.clients(company?.id || '', params), 
        queryFn: () => apiGet('/clients', params),
        enabled: !!company?.id 
    });
};

export const useClient = (id: string) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.client(company?.id || '', id), 
        queryFn: () => apiGet(`/clients/${id}`), 
        enabled: !!id && !!company?.id 
    });
};

export const useCreateClient = () => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: object) => apiPost('/clients', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clients', cid] }),
    });
};

export const useUpdateClient = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: object) => apiPut(`/clients/${id}`, data),
        onSuccess: () => { 
            qc.invalidateQueries({ queryKey: ['clients', cid] }); 
            qc.invalidateQueries({ queryKey: QK.client(cid, id) }); 
        },
    });
};

export const useDeactivateClient = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: () => apiPatch(`/clients/${id}/deactivate`),
        onSuccess: () => { 
            qc.invalidateQueries({ queryKey: ['clients', cid] }); 
            qc.invalidateQueries({ queryKey: QK.client(cid, id) }); 
        },
    });
};

export const useDeleteClientPermanent = () => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (id: string) => apiDelete(`/clients/${id}/permanent`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['clients', cid] });
        },
    });
};

export const useVerifyGST = () =>
    useMutation({ mutationFn: (data: { gstin: string; clientId?: string }) => apiPost('/gst/verify', data) });

// ─── Quotations ───────────────────────────────────────────────────────────────

export const useQuotations = (params: object = {}) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.quotations(company?.id || '', params), 
        queryFn: () => apiGet('/quotations', params),
        enabled: !!company?.id
    });
};

export const useQuotation = (id: string) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.quotation(company?.id || '', id), 
        queryFn: () => apiGet(`/quotations/${id}`), 
        enabled: !!id && !!company?.id
    });
};

export const useCreateQuotation = () => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: object) => apiPost('/quotations', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations', cid] }),
    });
};

export const useUpdateQuotation = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: object) => apiPut(`/quotations/${id}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['quotations', cid] });
            qc.invalidateQueries({ queryKey: QK.quotation(cid, id) });
            toast.success('Quotation updated successfully');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update quotation'),
    });
};

export const useSendQuotation = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: () => apiPatch(`/quotations/${id}/send`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['quotations', cid] });
            qc.invalidateQueries({ queryKey: QK.quotation(cid, id) });
            qc.invalidateQueries({ queryKey: ['dashboard', cid] });
            toast.success('Quotation sent to client');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to send quotation'),
    });
};

export const useApproveQuotation = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data?: any) => apiPatch(`/quotations/${id}/approve`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['quotations', cid] });
            qc.invalidateQueries({ queryKey: QK.quotation(cid, id) });
            qc.invalidateQueries({ queryKey: ['projects', cid] });
            qc.invalidateQueries({ queryKey: ['jobcards', cid] });
            qc.invalidateQueries({ queryKey: ['invoices', cid] });
            qc.invalidateQueries({ queryKey: ['dashboard', cid] });
            toast.success('Quotation approved! Project & Job Cards created.');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to approve quotation'),
    });
};


export const useRejectQuotation = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (reason?: string) => apiPatch(`/quotations/${id}/reject`, { reason }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['quotations', cid] });
            qc.invalidateQueries({ queryKey: QK.quotation(cid, id) });
            qc.invalidateQueries({ queryKey: ['dashboard', cid] });
            toast.success('Quotation marked as rejected');
        },
        onError: (err: any) => {
            console.error('Reject mutation failed:', err?.response?.data || err.message);
            toast.error(err?.response?.data?.message || 'Failed to reject quotation');
        },
    });
};

export const useReviseQuotation = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: object) => apiPost(`/quotations/${id}/revise`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['quotations', cid] });
            qc.invalidateQueries({ queryKey: QK.quotation(cid, id) });
            qc.invalidateQueries({ queryKey: ['dashboard', cid] });
            toast.success('Revision created successfully');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create revision'),
    });
};

export const useDeleteQuotation = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: () => apiDelete(`/quotations/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['quotations', cid] });
            qc.invalidateQueries({ queryKey: ['projects', cid] });
            qc.invalidateQueries({ queryKey: ['jobcards', cid] });
            qc.invalidateQueries({ queryKey: ['invoices', cid] });
            qc.invalidateQueries({ queryKey: ['dashboard', cid] });
            toast.success('Quotation deleted successfully');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete quotation'),
    });
};

export const useAssignQuotationStaff = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (staffIds: string[]) => apiPatch(`/quotations/${id}/assign-staff`, { staffIds }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QK.quotation(cid, id) });
            qc.invalidateQueries({ queryKey: ['jobcards', cid] });
        },
    });
};

export const useUpdateCommissionPaid = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (paid: boolean) => apiPatch(`/quotations/${id}/commission-paid`, { paid }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QK.quotation(cid, id) });
            // Invalidate architect dashboard to reflect paid status
            qc.invalidateQueries({ queryKey: ['architect-dashboard'] });
        },
    });
};


// ─── Projects ─────────────────────────────────────────────────────────────────

export const useProjects = (params: object = {}) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.projects(company?.id || '', params), 
        queryFn: () => apiGet('/projects', params),
        enabled: !!company?.id
    });
};

export const useProject = (id: string) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.project(company?.id || '', id), 
        queryFn: () => apiGet(`/projects/${id}`), 
        enabled: !!id && !!company?.id
    });
};

export const useCreateProject = () => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: object) => apiPost('/projects', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', cid] }),
    });
};

export const useUpdateProject = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: object) => apiPut(`/projects/${id}`, data),
        onSuccess: () => { 
            qc.invalidateQueries({ queryKey: ['projects', cid] }); 
            qc.invalidateQueries({ queryKey: QK.project(cid, id) }); 
        },
    });
};

export const useUpdateProjectStatus = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: { status: string }) => apiPatch(`/projects/${id}/status`, data),
        onSuccess: () => { 
            qc.invalidateQueries({ queryKey: ['projects', cid] }); 
            qc.invalidateQueries({ queryKey: QK.project(cid, id) }); 
        },
    });
};

export const useUpdateWhatsApp = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: { whatsappGroupId: string; whatsappInviteLink: string }) =>
            apiPatch(`/projects/${id}/whatsapp`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: QK.project(cid, id) }),
    });
};

export const useDeleteProject = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: () => apiDelete(`/projects/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['projects', cid] });
            qc.invalidateQueries({ queryKey: ['quotations', cid] });
            qc.invalidateQueries({ queryKey: ['jobcards', cid] });
            qc.invalidateQueries({ queryKey: ['invoices', cid] });
            qc.invalidateQueries({ queryKey: ['dashboard', cid] });
            toast.success('Project and associated records deleted');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete project'),
    });
};

// ─── Job Cards ────────────────────────────────────────────────────────────────

export const useJobCards = (params: object = {}) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.jobCards(company?.id || '', params), 
        queryFn: () => apiGet('/jobcards', params),
        enabled: !!company?.id
    });
};

export const useJobCard = (id: string) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.jobCard(company?.id || '', id), 
        queryFn: () => apiGet(`/jobcards/${id}`), 
        enabled: !!id && !!company?.id
    });
};

export const useCreateJobCard = () => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: object) => apiPost('/jobcards', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['jobcards', cid] }),
    });
};

export const useHoldJobCard = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: { reason: string }) => apiPatch(`/jobcards/${id}/hold`, data),
        onSuccess: () => { 
            qc.invalidateQueries({ queryKey: ['jobcards', cid] }); 
            qc.invalidateQueries({ queryKey: QK.jobCard(cid, id) }); 
        },
    });
};

export const useCancelJobCard = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: { reason: string }) => apiPatch(`/jobcards/${id}/cancel`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['jobcards', cid] }),
    });
};


// ─── Production Stage ────────────────────────────────────────────────────────

export const useProductionStage = (jobCardId: string) =>
    useQuery({ queryKey: ['productionStage', jobCardId], queryFn: () => apiGet(`/jobcards/${jobCardId}/production`), enabled: !!jobCardId });

export const useUpdateSubstage = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { substage: string; status: string; workerName?: string }) =>
            apiPatch(`/jobcards/${jobCardId}/production/substage`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['productionStage', jobCardId] }),
    });
};

export const useAddProductionNote = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { note: string; workerName?: string }) =>
            apiPost(`/jobcards/${jobCardId}/production/note`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['productionStage', jobCardId] }),
    });
};

export const useFlagShortage = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { reason: string }) =>
            apiPatch(`/jobcards/${jobCardId}/production/shortage`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['productionStage', jobCardId] }),
    });
};

export const useMarkProductionDone = (jobCardId: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: () => apiPatch(`/jobcards/${jobCardId}/production/done`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QK.jobCard(cid, jobCardId) });
            qc.invalidateQueries({ queryKey: ['productionStage', cid, jobCardId] });
        },
    });
};

// ─── QC Stage ────────────────────────────────────────────────────────────────

export const useQCStage = (jobCardId: string) =>
    useQuery({ queryKey: ['qcStage', jobCardId], queryFn: () => apiGet(`/jobcards/${jobCardId}/qc`), enabled: !!jobCardId });

export const useUpdateChecklist = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { checklist: any[] }) =>
            apiPut(`/jobcards/${jobCardId}/qc/checklist`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['qcStage', jobCardId] }),
    });
};

export const usePassQC = (jobCardId: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: () => apiPatch(`/jobcards/${jobCardId}/qc/pass`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QK.jobCard(cid, jobCardId) });
            qc.invalidateQueries({ queryKey: ['qcStage', cid, jobCardId] });
        },
    });
};

export const useFailQC = (jobCardId: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data?: any) => apiPatch(`/jobcards/${jobCardId}/qc/fail`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QK.jobCard(cid, jobCardId) });
            qc.invalidateQueries({ queryKey: ['qcStage', cid, jobCardId] });
        },
    });
};

// ─── Dispatch Stage ──────────────────────────────────────────────────────────

export const useDispatchStage = (jobCardId: string) =>
    useQuery({ queryKey: ['dispatchStage', jobCardId], queryFn: () => apiGet(`/jobcards/${jobCardId}/dispatch`), enabled: !!jobCardId });

export const useScheduleDispatch = (jobCardId: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: object) => apiPost(`/jobcards/${jobCardId}/dispatch`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QK.jobCard(cid, jobCardId) });
            qc.invalidateQueries({ queryKey: ['dispatchStage', cid, jobCardId] });
        },
    });
};

export const useConfirmDelivery = (jobCardId: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: FormData) => apiPost(`/jobcards/${jobCardId}/dispatch/deliver`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QK.jobCard(cid, jobCardId) });
            qc.invalidateQueries({ queryKey: ['dispatchStage', cid, jobCardId] });
        },
    });
};

// ─── Invoices ────────────────────────────────────────────────────────────────

export const useInvoices = (params: object = {}) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.invoices(company?.id || '', params), 
        queryFn: () => apiGet('/invoices', params),
        enabled: !!company?.id
    });
};

export const useInvoice = (id: string) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.invoice(company?.id || '', id), 
        queryFn: () => apiGet(`/invoices/${id}`), 
        enabled: !!id && !!company?.id
    });
};

export const useCreateInvoice = () => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: object) => apiPost('/invoices', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices', cid] }),
    });
};

export const useUpdateInvoice = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: object) => apiPatch(`/invoices/${id}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['invoices', cid] });
            qc.invalidateQueries({ queryKey: QK.invoice(cid, id) });
        },
    });
};

export const useSendInvoice = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: () => apiPatch(`/invoices/${id}/send`),
        onSuccess: () => qc.invalidateQueries({ queryKey: QK.invoice(cid, id) }),
    });
};

export const useRecordPayment = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: { amount: number; mode: string; reference: string }) => apiPost(`/invoices/${id}/payment`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: QK.invoice(cid, id) }),
    });
};

export const useUpdatePayment = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: ({ paymentId, ...data }: { paymentId: string; amount?: number; mode?: string; reference?: string; paidAt?: string }) => 
            apiPatch(`/invoices/${id}/payment/${paymentId}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: QK.invoice(cid, id) }),
    });
};

export const useDeletePayment = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (paymentId: string) => apiDelete(`/invoices/${id}/payment/${paymentId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: QK.invoice(cid, id) }),
    });
};

// ─── Inventory ────────────────────────────────────────────────────────────────

export const useInventory = (params: object = {}) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.inventory(company?.id || '', params), 
        queryFn: () => apiGet('/inventory', params),
        enabled: !!company?.id
    });
};

export const useCreateItem = () => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: object) => apiPost('/inventory', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', cid] }),
    });
};

export const useUpdateItem = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: object) => apiPut(`/inventory/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', cid] }),
    });
};

export const useRestockItem = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: { qty: number }) => apiPatch(`/inventory/${id}/restock`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', cid] }),
    });
};

// ─── Purchase Orders ──────────────────────────────────────────────────────────

const PO_KEYS = {
    list: (cid: string, params?: object) => ['purchaseOrders', cid, params],
    one: (cid: string, id: string) => ['purchaseOrders', cid, id],
};

export const usePurchaseOrders = (params: object = {}) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: PO_KEYS.list(company?.id || '', params), 
        queryFn: () => apiGet('/purchase-orders', params),
        enabled: !!company?.id
    });
};

export const usePurchaseOrder = (id: string) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: PO_KEYS.one(company?.id || '', id), 
        queryFn: () => apiGet(`/purchase-orders/${id}`), 
        enabled: !!id && !!company?.id
    });
};

export const useCreatePO = () => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: object) => apiPost('/purchase-orders', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['purchaseOrders', cid] }),
    });
};

export const useApprovePO = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: () => apiPatch(`/purchase-orders/${id}/approve`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['purchaseOrders', cid] });
            qc.invalidateQueries({ queryKey: PO_KEYS.one(cid, id) });
        },
    });
};

export const useReceivePO = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: () => apiPatch(`/purchase-orders/${id}/receive`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['purchaseOrders', cid] });
            qc.invalidateQueries({ queryKey: PO_KEYS.one(cid, id) });
        },
    });
};

export const useCancelPO = (id: string) => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (data: { reason: string }) => apiPatch(`/purchase-orders/${id}/cancel`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['purchaseOrders', cid] });
            qc.invalidateQueries({ queryKey: PO_KEYS.one(cid, id) });
        },
    });
};

// ─── Users & Roles ────────────────────────────────────────────────────────────

export const useDeleteUser = () => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (id: string) => apiDelete(`/users/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['users', cid] });
            toast.success('User permanently deleted');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete user'),
    });
};

// ─── Reports & Dashboard ──────────────────────────────────────────────────────

export const useDashboardStats = () => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.dashboard(company?.id || ''), 
        queryFn: () => apiGet('/reports/dashboard-stats'),
        enabled: !!company?.id
    });
};

export const useFinancialReport = (params: object = {}) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.reports(company?.id || '', 'financial', params), 
        queryFn: () => apiGet('/reports/financial', params),
        enabled: !!company?.id
    });
};

export const useOutstandingReport = (params: object = {}) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.reports(company?.id || '', 'outstanding', params), 
        queryFn: () => apiGet('/reports/outstanding', params),
        enabled: !!company?.id
    });
};

export const useProductionReport = (params: object = {}) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.reports(company?.id || '', 'production', params), 
        queryFn: () => apiGet('/reports/production', params),
        enabled: !!company?.id
    });
};

export const useDeliveryReport = (params: object = {}) => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: QK.reports(company?.id || '', 'delivery', params), 
        queryFn: () => apiGet('/reports/delivery', params),
        enabled: !!company?.id
    });
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const useNotificationsApi = () => {
    const { company } = useAuthStore();
    return useQuery({ 
        queryKey: ['notifications', company?.id || ''], 
        queryFn: () => apiGet('/notifications'), 
        staleTime: 30_000,
        enabled: !!company?.id
    });
};

export const useMarkNotificationRead = () => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: (id: string) => apiPatch(`/notifications/${id}/read`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', cid] }),
    });
};

export const useMarkAllNotificationsRead = () => {
    const qc = useQueryClient();
    const { company } = useAuthStore();
    const cid = company?.id || '';
    return useMutation({
        mutationFn: () => apiPatch('/notifications/read-all'),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', cid] }),
    });
};

// ─── Architect Portal ─────────────────────────────────────────────────────────
// Cross-company: keyed by userId. No company scope needed.

export const useArchitectDashboard = () => {
    const { user } = useAuthStore();
    const uid = (user as any)?._id || (user as any)?.id || '';
    return useQuery({
        queryKey: QK.architectDashboard(uid),
        queryFn: () => apiGet('/architect/dashboard'),
        enabled: !!uid,
    });
};

export const useArchitectQuotations = (params: object = {}) => {
    const { user } = useAuthStore();
    const uid = (user as any)?._id || (user as any)?.id || '';
    return useQuery({
        queryKey: QK.architectQuotations(uid, params),
        queryFn: () => apiGet('/architect/quotations', params),
        enabled: !!uid,
    });
};

export const useArchitectClients = () => {
    const { user } = useAuthStore();
    const uid = (user as any)?._id || (user as any)?.id || '';
    return useQuery({
        queryKey: QK.architectClients(uid),
        queryFn: () => apiGet('/architect/clients'),
        enabled: !!uid,
    });
};

export const useArchitectQuotationById = (id: string) => {
    const { user } = useAuthStore();
    const uid = (user as any)?._id || (user as any)?.id || '';
    return useQuery({
        queryKey: QK.architectQuotation(uid, id),
        queryFn: () => apiGet(`/architect/quotations/${id}`),
        enabled: !!uid && !!id,
    });
};
