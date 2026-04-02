import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Loader2, CheckCircle2, User2, CalendarDays, Users, Package,
    ArrowRight, Shield, Wrench, Truck, IndianRupee, CreditCard,
    RefreshCw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/axios';
import { motion } from 'motion/react';

import { Badge } from '@/components/ui/badge';
import { StaffMultiSelect } from '../shared/StaffMultiSelect';
import { DatePicker } from '@/components/ui/date-picker';

interface TeamAssignment {
    production: string[];
    qc: string[];
    dispatch: string[];
    accounts: string[];
}

interface JobCardConfig {
    itemId: string;
    srNo: number;
    description: string;
    salesperson: { id: string; name: string };
    contactPerson: { id: string; name: string };
    expectedDelivery: string;
    assignedTo: TeamAssignment;
}

interface ApproveQuotationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (jobCardConfigs: any[], advancePayment: any) => void;
    quotation: any;
    isSubmitting: boolean;
}

export default function ApproveQuotationModal({
    open,
    onOpenChange,
    onConfirm,
    quotation,
    isSubmitting,
}: ApproveQuotationModalProps) {
    const [configs, setConfigs] = useState<JobCardConfig[]>([]);
    const [globalConfig, setGlobalConfig] = useState({
        salesperson: { id: '', name: '' },
        contactPerson: { id: '', name: '' },
        expectedDelivery: '',
        assignedTo: { production: [], qc: [], dispatch: [], accounts: [] } as TeamAssignment,
    });
    const [advancePayment, setAdvancePayment] = useState({
        amount: 0,
        mode: 'cash' as 'cash' | 'upi' | 'cheque' | 'neft' | 'card',
        reference: '',
    });

    const { data: usersRaw } = useQuery({
        queryKey: ['users', 'all'],
        queryFn: () => apiGet('/users'),
        enabled: open,
    });
    const allUsers: any[] = (usersRaw as any)?.data ?? [];

    useEffect(() => {
        if (open && quotation?.items) {
            const defaultStaffIds = (quotation.assignedStaff || []).map((s: any) => s._id || s);
            setConfigs(quotation.items.map((item: any) => ({
                itemId: item._id,
                srNo: item.srNo,
                description: item.description,
                salesperson: { id: '', name: '' },
                contactPerson: { id: '', name: '' },
                expectedDelivery: '',
                assignedTo: {
                    production: [...defaultStaffIds],
                    qc: [],
                    dispatch: [],
                    accounts: []
                },
            })));
            setGlobalConfig({
                salesperson: { id: '', name: '' },
                contactPerson: { id: '', name: '' },
                expectedDelivery: '',
                assignedTo: {
                    production: [...defaultStaffIds],
                    qc: [],
                    dispatch: [],
                    accounts: []
                },
            });
            // Reset advance payment fields
            setAdvancePayment({ amount: 0, mode: 'cash', reference: '' });
        }
    }, [open, quotation]);

    const handleUpdateItem = (index: number, field: string, value: any) => {
        setConfigs(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
    };

    const applyGlobal = () => {
        setConfigs(prev => prev.map(c => ({
            ...c,
            salesperson: globalConfig.salesperson.id ? globalConfig.salesperson : c.salesperson,
            contactPerson: globalConfig.contactPerson.id ? globalConfig.contactPerson : c.contactPerson,
            expectedDelivery: globalConfig.expectedDelivery || c.expectedDelivery,
            assignedTo: {
                production: globalConfig.assignedTo.production.length ? globalConfig.assignedTo.production : c.assignedTo.production,
                qc: globalConfig.assignedTo.qc.length ? globalConfig.assignedTo.qc : c.assignedTo.qc,
                dispatch: globalConfig.assignedTo.dispatch.length ? globalConfig.assignedTo.dispatch : c.assignedTo.dispatch,
                accounts: globalConfig.assignedTo.accounts.length ? globalConfig.assignedTo.accounts : c.assignedTo.accounts,
            }
        })));
    };

    const handleConfirm = () => {
        onConfirm(
            configs.map(({ itemId, srNo, salesperson, contactPerson, expectedDelivery, assignedTo }) => ({
                itemId,
                srNo,
                salesperson: salesperson.id ? salesperson : undefined,
                contactPerson: contactPerson.name || undefined,
                expectedDelivery: expectedDelivery || undefined,
                assignedTo,
            })),
            advancePayment.amount > 0 ? advancePayment : undefined
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[90vw] sm:max-w-[85vw] w-full p-0 overflow-hidden border-none bg-background shadow-2xl rounded-[32px]">
                <div className="flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="p-8 pb-6 border-b border-border/10 bg-card/30">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                                    <CheckCircle2 size={20} />
                                </div>
                                <DialogTitle className="text-3xl font-black  text-foreground">
                                    Finalize Job Cards
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-muted-foreground text-sm font-semibold opacity-60">
                                Set specific details for each job card to be created from this quotation.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar bg-background/50 backdrop-blur-sm">
                        <div className="space-y-10">
                            {/* Global Bulk Action */}
                            <div className="bg-primary/3 border border-primary/10 rounded-[40px] p-10 space-y-8 relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/2 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl -z-10" />

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                                            <RefreshCw size={22} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Bulk Assignment</p>
                                            <p className="text-[11px] text-muted-foreground font-bold mt-0.5">Apply settings to all job cards in this quotation</p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={applyGlobal}
                                        className="h-12 px-10 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95 group"
                                    >
                                        Apply to All Items
                                        <ArrowRight size={14} className="ml-2 opacity-30 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-2.5">
                                        <label className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground/80 ml-1 flex items-center gap-2">
                                            <Users size={12} className="text-primary" /> Sales Person
                                        </label>
                                        <Select
                                            value={globalConfig.salesperson.id}
                                            onValueChange={(val) => {
                                                const user = allUsers.find(u => u._id === val);
                                                setGlobalConfig(prev => ({ ...prev, salesperson: { id: val, name: user?.name || '' } }));
                                            }}
                                        >
                                            <SelectTrigger className="h-12 rounded-2xl bg-background/50 border-border/60 text-sm font-bold shadow-sm focus:ring-primary/20 hover:border-primary/40 transition-colors">
                                                <SelectValue placeholder="Select staff..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                                                {allUsers.filter(u => ['sales', 'management'].includes(u.role)).map(user => (
                                                    <SelectItem key={user._id} value={user._id} className="text-sm font-bold rounded-xl py-3 focus:bg-primary/10">{user.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2.5">
                                        <label className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground/80 ml-1 flex items-center gap-2">
                                            <User2 size={12} className="text-primary" /> Contact Person
                                        </label>
                                        <Select
                                            value={globalConfig.contactPerson.id}
                                            onValueChange={(val) => {
                                                const user = allUsers.find(u => u._id === val);
                                                setGlobalConfig(prev => ({ ...prev, contactPerson: { id: val, name: user?.name || '' } }));
                                            }}
                                        >
                                            <SelectTrigger className="h-12 rounded-2xl bg-background/50 border-border/60 text-sm font-bold shadow-sm focus:ring-primary/20 hover:border-primary/40 transition-colors">
                                                <SelectValue placeholder="Select staff..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                                                {allUsers.map(user => (
                                                    <SelectItem key={user._id} value={user._id} className="text-sm font-bold rounded-xl py-3 focus:bg-primary/10">{user.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2.5">
                                        <label className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground/80 ml-1 flex items-center gap-2">
                                            <CalendarDays size={12} className="text-primary" /> Expected Delivery
                                        </label>
                                        <DatePicker
                                            date={globalConfig.expectedDelivery ? parseISO(globalConfig.expectedDelivery) : undefined}
                                            setDate={(date) => setGlobalConfig(prev => ({ ...prev, expectedDelivery: date ? format(date, 'yyyy-MM-dd') : '' }))}
                                            className="h-12 bg-background/50 border-border/60 text-sm font-bold shadow-sm focus:ring-primary/20 hover:border-primary/40 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-primary/10">
                                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/80 mb-6 ml-1 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Team Assignment (Set for All)
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <StaffMultiSelect
                                            label="Production"
                                            icon={Wrench}
                                            selectedIds={globalConfig.assignedTo.production}
                                            allUsers={allUsers}
                                            roleFilter="production"
                                            onToggle={(id) => setGlobalConfig(prev => ({
                                                ...prev,
                                                assignedTo: {
                                                    ...prev.assignedTo,
                                                    production: prev.assignedTo.production.includes(id)
                                                        ? prev.assignedTo.production.filter(x => x !== id)
                                                        : [...prev.assignedTo.production, id]
                                                }
                                            }))}
                                        />
                                        <StaffMultiSelect
                                            label="Quality Control"
                                            icon={Shield}
                                            selectedIds={globalConfig.assignedTo.qc}
                                            allUsers={allUsers}
                                            roleFilter="qc"
                                            onToggle={(id) => setGlobalConfig(prev => ({
                                                ...prev,
                                                assignedTo: {
                                                    ...prev.assignedTo,
                                                    qc: prev.assignedTo.qc.includes(id)
                                                        ? prev.assignedTo.qc.filter(x => x !== id)
                                                        : [...prev.assignedTo.qc, id]
                                                }
                                            }))}
                                        />
                                        <StaffMultiSelect
                                            label="Dispatch"
                                            icon={Truck}
                                            selectedIds={globalConfig.assignedTo.dispatch}
                                            allUsers={allUsers}
                                            roleFilter="dispatch"
                                            onToggle={(id) => setGlobalConfig(prev => ({
                                                ...prev,
                                                assignedTo: {
                                                    ...prev.assignedTo,
                                                    dispatch: prev.assignedTo.dispatch.includes(id)
                                                        ? prev.assignedTo.dispatch.filter(x => x !== id)
                                                        : [...prev.assignedTo.dispatch, id]
                                                }
                                            }))}
                                        />
                                        <StaffMultiSelect
                                            label="Accounts"
                                            icon={IndianRupee}
                                            selectedIds={globalConfig.assignedTo.accounts}
                                            allUsers={allUsers}
                                            roleFilter="accountant"
                                            onToggle={(id) => setGlobalConfig(prev => ({
                                                ...prev,
                                                assignedTo: {
                                                    ...prev.assignedTo,
                                                    accounts: prev.assignedTo.accounts.includes(id)
                                                        ? prev.assignedTo.accounts.filter(x => x !== id)
                                                        : [...prev.assignedTo.accounts, id]
                                                }
                                            }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Advance Payment Section */}
                            <div className="bg-emerald-500/3 border border-emerald-500/15 rounded-[40px] p-10 space-y-6 relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/2 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl -z-10" />
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-inner">
                                        <IndianRupee size={22} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Advance Payment Received</p>
                                        <p className="text-[11px] text-muted-foreground font-bold mt-0.5">Record any advance paid by the client at approval time</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-2.5">
                                        <label className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground/80 ml-1 flex items-center gap-2">
                                            <IndianRupee size={12} className="text-emerald-500" /> Amount (₹)
                                        </label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={advancePayment.amount || ''}
                                            onChange={e => setAdvancePayment(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                            placeholder="e.g. 50000"
                                            className="h-12 rounded-2xl bg-background/50 border-border/60 text-sm font-bold shadow-sm focus:ring-emerald-500/20 hover:border-emerald-500/40 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <label className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground/80 ml-1 flex items-center gap-2">
                                            <CreditCard size={12} className="text-emerald-500" /> Payment Mode
                                        </label>
                                        <Select value={advancePayment.mode} onValueChange={val => setAdvancePayment(prev => ({ ...prev, mode: val as any }))}>
                                            <SelectTrigger className="h-12 rounded-2xl bg-background/50 border-border/60 text-sm font-bold shadow-sm focus:ring-emerald-500/20 hover:border-emerald-500/40 transition-colors">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                                                {['cash', 'upi', 'cheque', 'neft', 'card'].map(m => (
                                                    <SelectItem key={m} value={m} className="text-sm font-bold rounded-xl py-3 focus:bg-emerald-500/10 capitalize">{m.toUpperCase()}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2.5">
                                        <label className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground/80 ml-1 flex items-center gap-2">
                                            Reference / Note (optional)
                                        </label>
                                        <Input
                                            value={advancePayment.reference}
                                            onChange={e => setAdvancePayment(prev => ({ ...prev, reference: e.target.value }))}
                                            placeholder="UPI ref, Cheque no, etc."
                                            className="h-12 rounded-2xl bg-background/50 border-border/60 text-sm font-bold shadow-sm focus:ring-emerald-500/20 hover:border-emerald-500/40 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Individual Item Configs */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 ml-2">
                                    <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500 shadow-inner">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-black uppercase tracking-[0.3em] text-foreground/40">
                                            Individual Item Configuration
                                        </p>
                                        <div className="h-1 w-12 bg-orange-500/20 rounded-full mt-1.5" />
                                    </div>
                                </div>
                                {configs.map((config, idx) => (
                                    <motion.div
                                        key={config.itemId}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1, duration: 0.5, ease: "circOut" }}
                                        className="p-10 bg-card/40 border border-border/30 rounded-[48px] space-y-10 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group/card"
                                    >
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/3 rounded-bl-[120px] -z-10 group-hover/card:scale-125 transition-transform duration-700" />

                                        <div className="flex items-start justify-between relative">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 rounded-[24px] bg-linear-to-br from-primary to-primary/80 text-white flex items-center justify-center text-2xl font-black shrink-0 shadow-2xl shadow-primary/30 ring-4 ring-primary/10">
                                                    {config.srNo}
                                                </div>
                                                <div>
                                                    <p className="font-black text-2xl text-foreground tracking-tight leading-tight mb-2 uppercase group-hover/card:text-primary transition-colors">{config.description}</p>
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-primary/10 text-primary border-none">
                                                            Job Card #{idx + 1}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest px-3 py-1 border-border/30 opacity-60">
                                                            #{config.itemId.slice(-6)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/70 ml-1 flex items-center gap-2">
                                                    <Users size={12} className="text-primary/60" /> Sales Person
                                                </label>
                                                <Select
                                                    value={config.salesperson.id}
                                                    onValueChange={(val) => {
                                                        const user = allUsers.find(u => u._id === val);
                                                        handleUpdateItem(idx, 'salesperson', { id: val, name: user?.name || '' });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-border/40 text-sm font-bold shadow-inner group-hover/card:bg-background transition-colors">
                                                        <SelectValue placeholder="Select staff..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                                                        {allUsers.filter(u => ['sales', 'management'].includes(u.role)).map(user => (
                                                            <SelectItem key={user._id} value={user._id} className="text-sm font-bold rounded-xl py-3 focus:bg-primary/10">{user.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/70 ml-1 flex items-center gap-2">
                                                    <User2 size={12} className="text-primary/60" /> Contact Person
                                                </label>
                                                <Select
                                                    value={config.contactPerson.id}
                                                    onValueChange={(val) => {
                                                        const user = allUsers.find(u => u._id === val);
                                                        handleUpdateItem(idx, 'contactPerson', { id: val, name: user?.name || '' });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-border/40 text-sm font-bold shadow-inner group-hover/card:bg-background transition-colors">
                                                        <SelectValue placeholder="Select staff..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                                                        {allUsers.map(user => (
                                                            <SelectItem key={user._id} value={user._id} className="text-sm font-bold rounded-xl py-3 focus:bg-primary/10">{user.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/70 ml-1 flex items-center gap-2">
                                                    <CalendarDays size={12} className="text-primary/60" /> Delivery Date
                                                </label>
                                                <DatePicker
                                                    date={config.expectedDelivery ? parseISO(config.expectedDelivery) : undefined}
                                                    setDate={(date) => handleUpdateItem(idx, 'expectedDelivery', date ? format(date, 'yyyy-MM-dd') : '')}
                                                    className="h-12 bg-muted/40 border-border/40 text-sm font-bold shadow-inner group-hover/card:bg-background transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-8 border-t border-border/10">
                                            <div className="flex items-center justify-between mb-6">
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40 ml-1 flex items-center gap-2">
                                                    Team Assignment
                                                </p>
                                                <div className="h-px flex-1 bg-border/10 ml-4 mr-0" />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                <StaffMultiSelect
                                                    label="Production"
                                                    icon={Wrench}
                                                    selectedIds={config.assignedTo.production}
                                                    allUsers={allUsers}
                                                    roleFilter="production"
                                                    onToggle={(id) => handleUpdateItem(idx, 'assignedTo', {
                                                        ...config.assignedTo,
                                                        production: config.assignedTo.production.includes(id)
                                                            ? config.assignedTo.production.filter(x => x !== id)
                                                            : [...config.assignedTo.production, id]
                                                    })}
                                                />
                                                <StaffMultiSelect
                                                    label="QC"
                                                    icon={Shield}
                                                    selectedIds={config.assignedTo.qc}
                                                    allUsers={allUsers}
                                                    roleFilter="qc"
                                                    onToggle={(id) => handleUpdateItem(idx, 'assignedTo', {
                                                        ...config.assignedTo,
                                                        qc: config.assignedTo.qc.includes(id)
                                                            ? config.assignedTo.qc.filter(x => x !== id)
                                                            : [...config.assignedTo.qc, id]
                                                    })}
                                                />
                                                <StaffMultiSelect
                                                    label="Dispatch"
                                                    icon={Truck}
                                                    selectedIds={config.assignedTo.dispatch}
                                                    allUsers={allUsers}
                                                    roleFilter="dispatch"
                                                    onToggle={(id) => handleUpdateItem(idx, 'assignedTo', {
                                                        ...config.assignedTo,
                                                        dispatch: config.assignedTo.dispatch.includes(id)
                                                            ? config.assignedTo.dispatch.filter(x => x !== id)
                                                            : [...config.assignedTo.dispatch, id]
                                                    })}
                                                />
                                                <StaffMultiSelect
                                                    label="Accounts"
                                                    icon={IndianRupee}
                                                    selectedIds={config.assignedTo.accounts}
                                                    allUsers={allUsers}
                                                    roleFilter="accountant"
                                                    onToggle={(id) => handleUpdateItem(idx, 'assignedTo', {
                                                        ...config.assignedTo,
                                                        accounts: config.assignedTo.accounts.includes(id)
                                                            ? config.assignedTo.accounts.filter(x => x !== id)
                                                            : [...config.assignedTo.accounts, id]
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>


                    </div>

                    {/* Footer */}
                    <div className="p-8 bg-card/80 backdrop-blur-md border-t border-border/10 flex items-center justify-between gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="h-12 px-8 rounded-2xl font-black text-xs uppercase tracking-widest text-muted-foreground hover:bg-muted/50"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isSubmitting}
                            className="h-14 px-12 rounded-[24px] font-black text-sm uppercase tracking-widest gap-3 bg-linear-to-r from-emerald-500 to-emerald-600 text-white hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-emerald-500/30 ring-4 ring-emerald-500/10"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                            Confirm & Approve Quotation
                            <ArrowRight size={20} className="ml-2 opacity-50" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}



