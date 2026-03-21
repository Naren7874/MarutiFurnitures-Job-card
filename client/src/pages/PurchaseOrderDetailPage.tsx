import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, ShoppingCart, Building2, Package, ShieldCheck,
    Truck, AlertCircle, Clock, Loader2, XCircle,
} from 'lucide-react';
import { useApprovePO, useReceivePO } from '../hooks/useApi';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/axios';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
    pending: { label: 'Pending Approval', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock },
    approved: { label: 'Approved', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: ShieldCheck },
    ordered: { label: 'Ordered', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Truck },
    received: { label: 'Received', color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: Package },
    rejected: { label: 'Rejected', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: XCircle },
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—';

export default function PurchaseOrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: raw, isLoading, refetch } = useQuery({
        queryKey: ['purchaseOrders', id],
        queryFn: () => apiGet(`/purchase-orders/${id}`),
        enabled: !!id,
    });
    const po: any = (raw as any)?.data;

    const approveMut = useApprovePO(id!);
    const receiveMut = useReceivePO(id!);

    const [confirm, setConfirm] = useState<'approve' | 'receive' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const handleAction = async (type: 'approve' | 'receive') => {
        setActionLoading(true);
        try {
            if (type === 'approve') await approveMut.mutateAsync();
            else await receiveMut.mutateAsync();
            refetch();
        } finally {
            setActionLoading(false);
            setConfirm(null);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 max-w-4xl mx-auto space-y-6">
                {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-muted/20 rounded-3xl animate-pulse border border-border/20" />)}
            </div>
        );
    }

    if (!po) {
        return (
            <div className="p-8 text-center">
                <AlertCircle size={48} className="mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground font-bold">Purchase Order not found</p>
                <Link to="/purchase-orders" className="text-primary text-sm font-bold mt-4 inline-block">← Back</Link>
            </div>
        );
    }

    const cfg = STATUS_CFG[po.status] || STATUS_CFG.pending;
    const StatusIcon = cfg.icon;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/purchase-orders')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-primary/10 hover:border-primary/30 transition text-muted-foreground hover:text-primary">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black tracking-tight text-foreground">{po.poNumber}</h1>
                            <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border', cfg.bg, cfg.color, cfg.border)}>
                                <StatusIcon size={11} /> {cfg.label}
                            </span>
                        </div>
                        <p className="text-muted-foreground/50 text-xs font-bold mt-1">Raised {fmtDate(po.createdAt)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {po.status === 'pending' && (
                        <Button onClick={() => setConfirm('approve')} className="h-10 px-5 rounded-xl text-xs font-black gap-2 bg-emerald-500 text-white hover:bg-emerald-600">
                            <ShieldCheck size={14} /> Approve
                        </Button>
                    )}
                    {po.status === 'approved' && (
                        <Button onClick={() => setConfirm('receive')} className="h-10 px-5 rounded-xl text-xs font-black gap-2 bg-indigo-500 text-white hover:bg-indigo-600">
                            <Package size={14} /> Mark Received
                        </Button>
                    )}
                </div>
            </div>

            {/* Confirm Banner */}
            <AnimatePresence>
                {confirm && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={cn('border rounded-2xl p-5 flex items-center justify-between gap-4',
                            confirm === 'approve' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-indigo-500/5 border-indigo-500/20')}>
                        <p className="text-sm font-bold text-foreground">
                            {confirm === 'approve'
                                ? `Approve this PO for ₹${po.totalAmount?.toLocaleString('en-IN')}? This will authorize the purchase.`
                                : 'Mark this PO as received? This will update inventory stock levels.'}
                        </p>
                        <div className="flex gap-3 shrink-0">
                            <Button variant="outline" size="sm" onClick={() => setConfirm(null)} disabled={actionLoading} className="rounded-xl font-bold text-xs">Cancel</Button>
                            <Button size="sm" onClick={() => handleAction(confirm)} disabled={actionLoading} className="rounded-xl font-black text-xs gap-2">
                                {actionLoading && <Loader2 size={12} className="animate-spin" />}
                                Confirm
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Left */}
                <div className="space-y-5">
                    <InfoCard title="Vendor" icon={Building2}>
                        <p className="font-black text-sm text-foreground">{po.vendorName}</p>
                        {po.vendorContact && <p className="text-xs text-muted-foreground/60 mt-1">{po.vendorContact}</p>}
                        {po.vendorPhone && <p className="text-xs text-muted-foreground/60">{po.vendorPhone}</p>}
                    </InfoCard>

                    <InfoCard title="Order Info" icon={ShoppingCart}>
                        <div className="space-y-2">
                            <InfoRow label="Created" value={fmtDate(po.createdAt)} />
                            {po.requiredBy && <InfoRow label="Required By" value={fmtDate(po.requiredBy)} />}
                            {po.approvedAt && <InfoRow label="Approved" value={fmtDate(po.approvedAt)} />}
                            {po.receivedAt && <InfoRow label="Received" value={fmtDate(po.receivedAt)} />}
                            {po.notes && <InfoRow label="Notes" value={po.notes} />}
                        </div>
                    </InfoCard>

                    {/* Total */}
                    <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5">
                        <div className="flex justify-between items-center">
                            <p className="font-black text-foreground">Total Value</p>
                            <p className="font-black text-primary text-xl">₹{po.totalAmount?.toLocaleString('en-IN')}</p>
                        </div>
                        {po.totalAmount >= 50000 && (
                            <p className="text-xs text-amber-500 font-bold mt-2 flex items-center gap-1">
                                <AlertCircle size={11} /> High-value order requires Super Admin approval
                            </p>
                        )}
                    </div>
                </div>

                {/* Right — Items */}
                <div className="md:col-span-2">
                    <div className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/20">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary"><Package size={14} /></div>
                            <p className="font-black text-sm uppercase tracking-wider text-foreground">Items ({po.items?.length || 0})</p>
                        </div>
                        {po.items?.length === 0 ? (
                            <div className="py-10 text-center">
                                <p className="text-muted-foreground/30 font-bold text-sm">No items in this PO</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-muted/20 text-muted-foreground/50">
                                            <th className="text-left px-5 py-3 font-black uppercase tracking-widest">Item</th>
                                            <th className="text-center px-4 py-3 font-black uppercase tracking-widest">Qty</th>
                                            <th className="text-right px-4 py-3 font-black uppercase tracking-widest">Rate (₹)</th>
                                            <th className="text-right px-5 py-3 font-black uppercase tracking-widest">Total (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20">
                                        {po.items?.map((item: any, i: number) => (
                                            <tr key={i} className="hover:bg-muted/10 transition-colors">
                                                <td className="px-5 py-3">
                                                    <p className="font-bold text-foreground">{item.itemName || item.description}</p>
                                                    {item.unit && <p className="text-muted-foreground/40 text-[10px] font-bold">per {item.unit}</p>}
                                                </td>
                                                <td className="px-4 py-3 text-center font-black text-foreground">{item.qty}</td>
                                                <td className="px-4 py-3 text-right font-bold text-muted-foreground/70">₹{item.unitRate?.toLocaleString('en-IN')}</td>
                                                <td className="px-5 py-3 text-right font-black text-foreground">₹{((item.qty || 0) * (item.unitRate || 0)).toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border/20">
                <Icon size={12} className="text-muted-foreground/40" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{title}</p>
            </div>
            {children}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center text-xs">
            <p className="text-muted-foreground/40 font-bold">{label}</p>
            <p className="font-bold text-foreground/80">{value}</p>
        </div>
    );
}
