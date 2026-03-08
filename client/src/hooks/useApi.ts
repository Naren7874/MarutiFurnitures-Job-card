/**
 * API Query Hooks — TanStack Query
 * ─────────────────────────────────
 * All data-fetching logic lives here. Components just call hooks.
 * Uses central axios instance — auth token injected automatically.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiPut } from '../lib/axios';

// ─── Query Key Factory ────────────────────────────────────────────────────────

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

export const useDeactivateClient = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiPatch(`/clients/${id}/deactivate`),
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

export const useUpdateProject = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPut(`/projects/${id}`, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); qc.invalidateQueries({ queryKey: QK.project(id) }); },
    });
};

export const useUpdateProjectStatus = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { status: string }) => apiPatch(`/projects/${id}/status`, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); qc.invalidateQueries({ queryKey: QK.project(id) }); },
    });
};

export const useUpdateWhatsApp = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { whatsappGroupId: string; whatsappInviteLink: string }) =>
            apiPatch(`/projects/${id}/whatsapp`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: QK.project(id) }),
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

// ─── Design Stage ────────────────────────────────────────────────────────────

export const useDesignStage = (jobCardId: string) =>
    useQuery({ queryKey: ['designStage', jobCardId], queryFn: () => apiGet(`/jobcards/${jobCardId}/design`), enabled: !!jobCardId });

export const useInitiateDesign = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiPost(`/jobcards/${jobCardId}/design`, {}),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['designStage', jobCardId] }),
    });
};

export const useUpdateDesign = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPut(`/jobcards/${jobCardId}/design`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['designStage', jobCardId] }),
    });
};

export const useSendSignoffLink = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiPost(`/jobcards/${jobCardId}/design/signoff`, {}),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['designStage', jobCardId] }),
    });
};

export const useMarkDesignReady = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiPatch(`/jobcards/${jobCardId}/design/ready`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QK.jobCard(jobCardId) });
            qc.invalidateQueries({ queryKey: ['designStage', jobCardId] });
        },
    });
};

// ─── Store Stage ─────────────────────────────────────────────────────────────

export const useStoreStage = (jobCardId: string) =>
    useQuery({ queryKey: ['storeStage', jobCardId], queryFn: () => apiGet(`/jobcards/${jobCardId}/store`), enabled: !!jobCardId });

export const useIssueAllMaterials = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiPatch(`/jobcards/${jobCardId}/store/issue-all`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['storeStage', jobCardId] });
            qc.invalidateQueries({ queryKey: QK.jobCard(jobCardId) });
        },
    });
};

export const useIssueOneMaterial = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ bomId, issuedQty }: { bomId: string; issuedQty: number }) =>
            apiPatch(`/jobcards/${jobCardId}/store/issue/${bomId}`, { issuedQty }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['storeStage', jobCardId] }),
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
    return useMutation({
        mutationFn: () => apiPatch(`/jobcards/${jobCardId}/production/done`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QK.jobCard(jobCardId) });
            qc.invalidateQueries({ queryKey: ['productionStage', jobCardId] });
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
    return useMutation({
        mutationFn: () => apiPatch(`/jobcards/${jobCardId}/qc/pass`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QK.jobCard(jobCardId) });
            qc.invalidateQueries({ queryKey: ['qcStage', jobCardId] });
        },
    });
};

export const useFailQC = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data?: any) => apiPatch(`/jobcards/${jobCardId}/qc/fail`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QK.jobCard(jobCardId) });
            qc.invalidateQueries({ queryKey: ['qcStage', jobCardId] });
        },
    });
};

// ─── Dispatch Stage ──────────────────────────────────────────────────────────

export const useDispatchStage = (jobCardId: string) =>
    useQuery({ queryKey: ['dispatchStage', jobCardId], queryFn: () => apiGet(`/jobcards/${jobCardId}/dispatch`), enabled: !!jobCardId });

export const useScheduleDispatch = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPost(`/jobcards/${jobCardId}/dispatch`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QK.jobCard(jobCardId) });
            qc.invalidateQueries({ queryKey: ['dispatchStage', jobCardId] });
        },
    });
};

export const useConfirmDelivery = (jobCardId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: FormData) => apiPost(`/jobcards/${jobCardId}/dispatch/deliver`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QK.jobCard(jobCardId) });
            qc.invalidateQueries({ queryKey: ['dispatchStage', jobCardId] });
        },
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

export const useSendInvoice = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiPatch(`/invoices/${id}/send`),
        onSuccess: () => qc.invalidateQueries({ queryKey: QK.invoice(id) }),
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

export const useCreateItem = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPost('/inventory', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
};

export const useUpdateItem = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPut(`/inventory/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
};

export const useRestockItem = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { qty: number }) => apiPatch(`/inventory/${id}/restock`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
};

// ─── Purchase Orders ──────────────────────────────────────────────────────────

const PO_KEYS = {
    list: (params?: object) => ['purchaseOrders', params],
    one: (id: string) => ['purchaseOrders', id],
};

export const usePurchaseOrders = (params: object = {}) =>
    useQuery({ queryKey: PO_KEYS.list(params), queryFn: () => apiGet('/purchase-orders', params) });

export const usePurchaseOrder = (id: string) =>
    useQuery({ queryKey: PO_KEYS.one(id), queryFn: () => apiGet(`/purchase-orders/${id}`), enabled: !!id });

export const useCreatePO = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiPost('/purchase-orders', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['purchaseOrders'] }),
    });
};

export const useApprovePO = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiPatch(`/purchase-orders/${id}/approve`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
            qc.invalidateQueries({ queryKey: PO_KEYS.one(id) });
        },
    });
};

export const useReceivePO = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiPatch(`/purchase-orders/${id}/receive`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
            qc.invalidateQueries({ queryKey: PO_KEYS.one(id) });
        },
    });
};

export const useCancelPO = (id: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { reason: string }) => apiPatch(`/purchase-orders/${id}/cancel`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
            qc.invalidateQueries({ queryKey: PO_KEYS.one(id) });
        },
    });
};

// ─── Reports & Dashboard ──────────────────────────────────────────────────────

export const useDashboardStats = () =>
    useQuery({ queryKey: ['dashboard', 'stats'], queryFn: () => apiGet('/reports/dashboard-stats') });

export const useFinancialReport = (params: object = {}) =>
    useQuery({ queryKey: ['reports', 'financial', params], queryFn: () => apiGet('/reports/financial', params) });

export const useOutstandingReport = (params: object = {}) =>
    useQuery({ queryKey: ['reports', 'outstanding', params], queryFn: () => apiGet('/reports/outstanding', params) });

export const useProductionReport = (params: object = {}) =>
    useQuery({ queryKey: ['reports', 'production', params], queryFn: () => apiGet('/reports/production', params) });

export const useDeliveryReport = (params: object = {}) =>
    useQuery({ queryKey: ['reports', 'delivery', params], queryFn: () => apiGet('/reports/delivery', params) });

// ─── Notifications ────────────────────────────────────────────────────────────

export const useNotificationsApi = () =>
    useQuery({ queryKey: ['notifications'], queryFn: () => apiGet('/notifications'), staleTime: 30_000 });

export const useMarkNotificationRead = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiPatch(`/notifications/${id}/read`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    });
};

export const useMarkAllNotificationsRead = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiPatch('/notifications/read-all'),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    });
};
