import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Loader2, CheckCircle2, User2, CalendarDays, Users, Package,
    ArrowRight, Shield, Wrench, Truck, Settings2,
    RefreshCw, IndianRupee
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '../../lib/axios';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { StaffMultiSelect } from '../shared/StaffMultiSelect';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface TeamAssignment {
    production: string[];
    qc: string[];
    dispatch: string[];
    accounts: string[];
}

interface JobCardConfig {
    itemId?: string;
    srNo: number;
    description: string;
    salesperson: { id: string; name: string };
    contactPerson: string;
    expectedDelivery: string;
    assignedTo: TeamAssignment;
}

interface ManageTeamsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    quotation: any;
    jobCards: any[];
}

const EXCLUDED_ROLES = ['Project Designer', 'Architecture', 'project_designer', 'architect', 'client'];

export default function ManageTeamsModal({
    open,
    onOpenChange,
    quotation,
    jobCards,
}: ManageTeamsModalProps) {
    const queryClient = useQueryClient();
    const [configs, setConfigs] = useState<JobCardConfig[]>([]);
    const [globalConfig, setGlobalConfig] = useState<Partial<JobCardConfig>>({
        salesperson: { id: '', name: '' },
        contactPerson: '',
        expectedDelivery: '',
        assignedTo: { production: [], qc: [], dispatch: [], accounts: [] },
    });

    const { data: usersRaw } = useQuery({
        queryKey: ['users', 'all'],
        queryFn: () => apiGet('/users'),
        enabled: open,
    });
    const allUsers: any[] = (usersRaw as any)?.data ?? [];

    const staffOptions = useMemo(() => {
        return allUsers
            .filter(u => !EXCLUDED_ROLES.includes(u.role))
            .map(u => ({
                value: u._id,
                label: u.name,
            }));
    }, [allUsers]);

    useEffect(() => {
        if (open && jobCards?.length) {
            setConfigs(jobCards.map((jc: any) => ({
                itemId: jc._id,
                srNo: jc.items?.[0]?.srNo || 1,
                description: jc.title || 'Item',
                salesperson: jc.salesperson || { id: '', name: '' },
                contactPerson: jc.contactPerson || '',
                expectedDelivery: jc.expectedDelivery ? new Date(jc.expectedDelivery).toISOString().slice(0, 10) : '',
                assignedTo: {
                    production: (jc.assignedTo?.production || []).map((s: any) => s._id || s),
                    qc: (jc.assignedTo?.qc || []).map((s: any) => s._id || s),
                    dispatch: (jc.assignedTo?.dispatch || []).map((s: any) => s._id || s),
                    accounts: (jc.assignedTo?.accounts || []).map((s: any) => s._id || s),
                },
            })));
        }
    }, [open, jobCards]);

    const mutation = useMutation({
        mutationFn: (payload: any) => apiPatch(`/quotations/${quotation._id}/jobcard-teams`, payload),
        onSuccess: () => {
            toast.success('Teams updated successfully');
            queryClient.invalidateQueries({ queryKey: ['quotation', quotation._id] });
            queryClient.invalidateQueries({ queryKey: ['jobcards'] });
            onOpenChange(false);
        },
        onError: () => {
            toast.error('Failed to update teams');
        }
    });

    const handleConfirm = () => {
        mutation.mutate({ jobCardConfigs: configs });
    };

    const applyGlobal = () => {
        setConfigs(prev => prev.map(c => ({
            ...c,
            salesperson: globalConfig.salesperson?.id ? globalConfig.salesperson : c.salesperson,
            contactPerson: globalConfig.contactPerson || c.contactPerson,
            expectedDelivery: globalConfig.expectedDelivery || c.expectedDelivery,
            assignedTo: {
                production: globalConfig.assignedTo?.production?.length ? globalConfig.assignedTo.production : c.assignedTo.production,
                qc: globalConfig.assignedTo?.qc?.length ? globalConfig.assignedTo.qc : c.assignedTo.qc,
                dispatch: globalConfig.assignedTo?.dispatch?.length ? globalConfig.assignedTo.dispatch : c.assignedTo.dispatch,
                accounts: globalConfig.assignedTo?.accounts?.length ? globalConfig.assignedTo.accounts : c.assignedTo.accounts,
            }
        })));
        toast.info('Applied global settings to all items');
    };

    const updateSingle = (idx: number, field: string, value: any) => {
        setConfigs(prev => prev.map((c, i) => {
            if (i !== idx) return c;
            if (field === 'assignedTo') {
                return { ...c, assignedTo: { ...c.assignedTo, ...value } };
            }
            return { ...c, [field]: value };
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[1200px]! w-[95vw] max-h-[90vh] p-0 overflow-hidden flex flex-col border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl rounded-3xl scale-100! translate-x-[-50%]! translate-y-[-50%]!">
                {/* Header */}
                <div className="px-6 py-5 border-b border-border/40 bg-card/50 shrink-0">
                        <DialogHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
                                    <Settings2 size={24} />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black text-foreground">
                                        Manage Project Teams
                                    </DialogTitle>
                                    <p className="text-muted-foreground text-[13px] font-medium mt-0.5">
                                        Update team assignments and delivery dates for <span className="text-primary font-black">{quotation?.quotationNumber}</span> — {quotation?.projectName}
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto min-h-0 p-6 md:p-8 custom-scrollbar relative z-10">
                        <div className="space-y-8 max-w-full mx-auto">
                            
                            {/* Global Bulk Action Section */}
                            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl -z-10" />
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                            <RefreshCw size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-widest text-primary">Bulk Assignment</p>
                                            <p className="text-xs text-muted-foreground font-medium mt-0.5">Apply settings to all job cards below</p>
                                        </div>
                                    </div>
                                    <Button 
                                        type="button" 
                                        onClick={applyGlobal}
                                        className="h-10 px-6 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 group"
                                    >
                                        Apply to All
                                        <ArrowRight size={14} className="ml-2 opacity-60 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2.5">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-foreground/70 ml-1 flex items-center gap-2">
                                            <Users size={12} className="text-primary" /> Sales Person
                                        </label>
                                        <SearchableSelect
                                            options={staffOptions}
                                            value={globalConfig.salesperson?.id}
                                            onChange={(val) => {
                                                const user = allUsers.find(u => u._id === val);
                                                setGlobalConfig(prev => ({ ...prev, salesperson: { id: val, name: user?.name || '' } }));
                                            }}
                                            placeholder="Select salesperson..."
                                            className="h-11 bg-background border-border/60"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-foreground/70 ml-1 flex items-center gap-2">
                                            <User2 size={12} className="text-primary" /> Contact Person
                                        </label>
                                        <SearchableSelect
                                            options={staffOptions}
                                            value={allUsers.find(u => u.name === globalConfig.contactPerson)?._id || ''}
                                            onChange={(val) => {
                                                const user = allUsers.find(u => u._id === val);
                                                setGlobalConfig(prev => ({ ...prev, contactPerson: user?.name || '' }));
                                            }}
                                            placeholder="Select contact..."
                                            className="h-11 bg-background border-border/60"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-foreground/70 ml-1 flex items-center gap-2">
                                            <CalendarDays size={12} className="text-primary" /> Expected Delivery
                                        </label>
                                        <DatePicker 
                                            date={globalConfig.expectedDelivery ? parseISO(globalConfig.expectedDelivery) : undefined} 
                                            setDate={(date) => setGlobalConfig(prev => ({ ...prev, expectedDelivery: date ? format(date, 'yyyy-MM-dd') : '' }))}
                                            className="h-11 rounded-xl bg-background border-border/60 text-sm font-semibold focus:ring-primary/20 hover:border-primary/40 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-primary/20">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 mb-5 ml-1 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Team Assignment (All)
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                                        <StaffMultiSelect 
                                            label="Production" icon={Wrench} 
                                            selectedIds={globalConfig.assignedTo?.production || []} 
                                            allUsers={allUsers}
                                            roleFilter="production"
                                            onToggle={id => {
                                                const next = globalConfig.assignedTo!.production!.includes(id) ? globalConfig.assignedTo!.production!.filter(x=>x!==id) : [...globalConfig.assignedTo!.production!, id];
                                                setGlobalConfig(prev => ({ ...prev, assignedTo: { ...prev.assignedTo!, production: next } }));
                                            }}
                                        />
                                        <StaffMultiSelect 
                                            label="Quality Control" icon={Shield} 
                                            selectedIds={globalConfig.assignedTo?.qc || []} 
                                            allUsers={allUsers}
                                            roleFilter="qc"
                                            onToggle={id => {
                                                const next = globalConfig.assignedTo!.qc!.includes(id) ? globalConfig.assignedTo!.qc!.filter(x=>x!==id) : [...globalConfig.assignedTo!.qc!, id];
                                                setGlobalConfig(prev => ({ ...prev, assignedTo: { ...prev.assignedTo!, qc: next } }));
                                            }}
                                        />
                                        <StaffMultiSelect 
                                            label="Dispatch" icon={Truck} 
                                            selectedIds={globalConfig.assignedTo?.dispatch || []} 
                                            allUsers={allUsers}
                                            roleFilter="dispatch"
                                            onToggle={id => {
                                                const next = globalConfig.assignedTo!.dispatch!.includes(id) ? globalConfig.assignedTo!.dispatch!.filter(x=>x!==id) : [...globalConfig.assignedTo!.dispatch!, id];
                                                setGlobalConfig(prev => ({ ...prev, assignedTo: { ...prev.assignedTo!, dispatch: next } }));
                                            }}
                                        />
                                        <StaffMultiSelect 
                                            label="Accounts" icon={IndianRupee} 
                                            selectedIds={globalConfig.assignedTo?.accounts || []} 
                                            allUsers={allUsers}
                                            roleFilter="accountant"
                                            onToggle={id => {
                                                const next = globalConfig.assignedTo!.accounts!.includes(id) ? globalConfig.assignedTo!.accounts!.filter(x=>x!==id) : [...globalConfig.assignedTo!.accounts!, id];
                                                setGlobalConfig(prev => ({ ...prev, assignedTo: { ...prev.assignedTo!, accounts: next } }));
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Individual Job Card Items */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 ml-2">
                                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                                        <Package size={18} />
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-foreground/50">
                                        Individual Item Configuration
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <AnimatePresence>
                                        {configs.map((config, idx) => (
                                            <motion.div 
                                                key={config.itemId || idx}
                                                initial={{ opacity: 0, y: 15 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: Math.min(idx * 0.05, 0.3), duration: 0.4 }}
                                                className="p-6 bg-card border border-border/40 rounded-3xl space-y-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group/card"
                                            >
                                                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-bl-[100px] -z-10 group-hover/card:scale-110 transition-transform duration-700" />
                                                
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-black shrink-0">
                                                        {config.srNo}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-lg text-foreground truncate mb-1.5 group-hover/card:text-primary transition-colors">{config.description}</p>
                                                        <div className="flex items-center gap-2">
                                                            <Badge className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-primary/10 text-primary border-none rounded-md">
                                                                #{idx + 1}
                                                            </Badge>
                                                            {config.itemId && (
                                                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 border-border/40 opacity-70 rounded-md">
                                                                    ID: {config.itemId.slice(-6)}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="space-y-2.5">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/60 ml-1 flex items-center gap-2">
                                                            <Users size={12} className="text-primary/70" /> Sales Person
                                                        </label>
                                                        <SearchableSelect
                                                            options={staffOptions}
                                                            value={config.salesperson.id}
                                                            onChange={(val) => {
                                                                const user = allUsers.find(u => u._id === val);
                                                                updateSingle(idx, 'salesperson', { id: val, name: user?.name || '' });
                                                            }}
                                                            placeholder="Select salesperson..."
                                                            className="h-11 bg-background border-border/40"
                                                        />
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/60 ml-1 flex items-center gap-2">
                                                            <User2 size={12} className="text-primary/70" /> Contact Person
                                                        </label>
                                                        <SearchableSelect
                                                            options={staffOptions}
                                                            value={allUsers.find(u => u.name === config.contactPerson)?._id || ''}
                                                            onChange={(val) => {
                                                                const user = allUsers.find(u => u._id === val);
                                                                updateSingle(idx, 'contactPerson', user?.name || '');
                                                            }}
                                                            placeholder="Select contact..."
                                                            className="h-11 bg-background border-border/40"
                                                        />
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/60 ml-1 flex items-center gap-2">
                                                            <CalendarDays size={12} className="text-primary/70" /> Delivery Date
                                                        </label>
                                                        <DatePicker 
                                                            date={config.expectedDelivery ? parseISO(config.expectedDelivery) : undefined} 
                                                            setDate={(date) => updateSingle(idx, 'expectedDelivery', date ? format(date, 'yyyy-MM-dd') : '')}
                                                            className="h-11 bg-background border-border/40 text-sm font-medium transition-colors"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="pt-6 border-t border-border/20">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-4 ml-1">Team Assignment</p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                                                        <StaffMultiSelect 
                                                            label="Production" icon={Wrench} 
                                                            selectedIds={config.assignedTo.production}
                                                            allUsers={allUsers}
                                                            roleFilter="production"
                                                            onToggle={id => {
                                                                const next = config.assignedTo.production.includes(id) ? config.assignedTo.production.filter(x=>x!==id) : [...config.assignedTo.production, id];
                                                                updateSingle(idx, 'assignedTo', { production: next });
                                                            }}
                                                        />
                                                        <StaffMultiSelect 
                                                            label="QC" icon={Shield} 
                                                            selectedIds={config.assignedTo.qc}
                                                            allUsers={allUsers}
                                                            roleFilter="qc"
                                                            onToggle={id => {
                                                                const next = config.assignedTo.qc.includes(id) ? config.assignedTo.qc.filter(x=>x!==id) : [...config.assignedTo.qc, id];
                                                                updateSingle(idx, 'assignedTo', { qc: next });
                                                            }}
                                                        />
                                                        <StaffMultiSelect 
                                                            label="Dispatch" icon={Truck} 
                                                            selectedIds={config.assignedTo.dispatch}
                                                            allUsers={allUsers}
                                                            roleFilter="dispatch"
                                                            onToggle={id => {
                                                                const next = config.assignedTo.dispatch.includes(id) ? config.assignedTo.dispatch.filter(x=>x!==id) : [...config.assignedTo.dispatch, id];
                                                                updateSingle(idx, 'assignedTo', { dispatch: next });
                                                            }}
                                                        />
                                                        <StaffMultiSelect 
                                                            label="Accounts" icon={IndianRupee} 
                                                            selectedIds={config.assignedTo.accounts}
                                                            allUsers={allUsers}
                                                            roleFilter="accountant"
                                                            onToggle={id => {
                                                                const next = config.assignedTo.accounts.includes(id) ? config.assignedTo.accounts.filter(x=>x!==id) : [...config.assignedTo.accounts, id];
                                                                updateSingle(idx, 'assignedTo', { accounts: next });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-background border-t border-border/40 flex items-center justify-between shrink-0 shadow-lg relative z-20">
                        <Button 
                            variant="ghost" 
                            onClick={() => onOpenChange(false)} 
                            className="h-11 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest text-muted-foreground hover:bg-muted/50 transition-all"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleConfirm} 
                            disabled={mutation.isPending}
                            className="h-11 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {mutation.isPending ? <Loader2 size={18} className="animate-spin mr-2" /> : <CheckCircle2 size={18} className="mr-2" />}
                            Deploy Updates
                        </Button>
                    </div>
            </DialogContent>
        </Dialog>
    );
}
