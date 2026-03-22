import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Loader2, CheckCircle2, User2, CalendarDays, Users, Package,
    ArrowRight, Shield, Wrench, Truck, PencilLine, Settings2,
    RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '../../lib/axios';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { StaffMultiSelect } from '../shared/StaffMultiSelect';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';

interface TeamAssignment {
    design: string[];
    production: string[];
    qc: string[];
    dispatch: string[];
}

interface JobCardConfig {
    itemId?: string;
    srNo: number;
    description: string;
    salesPerson: { id: string; name: string };
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

export default function ManageTeamsModal({
    open,
    onOpenChange,
    quotation,
    jobCards,
}: ManageTeamsModalProps) {
    const queryClient = useQueryClient();
    const [configs, setConfigs] = useState<JobCardConfig[]>([]);
    const [globalConfig, setGlobalConfig] = useState<Partial<JobCardConfig>>({
        salesPerson: { id: '', name: '' },
        contactPerson: '',
        expectedDelivery: '',
        assignedTo: { design: [], production: [], qc: [], dispatch: [] },
    });

    const { data: usersRaw } = useQuery({
        queryKey: ['users', 'all'],
        queryFn: () => apiGet('/users'),
        enabled: open,
    });
    const allUsers: any[] = (usersRaw as any)?.data ?? [];

    useEffect(() => {
        if (open && jobCards?.length) {
            setConfigs(jobCards.map((jc: any) => ({
                itemId: jc._id,
                srNo: jc.items?.[0]?.srNo || 1,
                description: jc.title || 'Item',
                salesPerson: jc.salesperson || { id: '', name: '' },
                contactPerson: jc.contactPerson || '',
                expectedDelivery: jc.expectedDelivery ? new Date(jc.expectedDelivery).toISOString().slice(0, 10) : '',
                assignedTo: {
                    design: jc.assignedTo?.design || [],
                    production: jc.assignedTo?.production || [],
                    qc: jc.assignedTo?.qc || [],
                    dispatch: jc.assignedTo?.dispatch || [],
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
            salesPerson: globalConfig.salesPerson?.id ? globalConfig.salesPerson : c.salesPerson,
            contactPerson: globalConfig.contactPerson || c.contactPerson,
            expectedDelivery: globalConfig.expectedDelivery || c.expectedDelivery,
            assignedTo: {
                design: globalConfig.assignedTo?.design?.length ? globalConfig.assignedTo.design : c.assignedTo.design,
                production: globalConfig.assignedTo?.production?.length ? globalConfig.assignedTo.production : c.assignedTo.production,
                qc: globalConfig.assignedTo?.qc?.length ? globalConfig.assignedTo.qc : c.assignedTo.qc,
                dispatch: globalConfig.assignedTo?.dispatch?.length ? globalConfig.assignedTo.dispatch : c.assignedTo.dispatch,
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
            <DialogContent className="max-w-[95vw]! w-[1600px]! h-[92vh] p-0 overflow-hidden flex flex-col border-none bg-background shadow-2xl rounded-[32px] scale-100! translate-x-[-50%]! translate-y-[-50%]!">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-10 pb-8 border-b border-border/10 bg-card/30 shrink-0">
                        <DialogHeader>
                            <div className="flex items-center gap-5 mb-2">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                                    <Settings2 size={28} />
                                </div>
                                <div>
                                    <DialogTitle className="text-4xl font-black tracking-tighter text-foreground">
                                        Manage Project Teams
                                    </DialogTitle>
                                    <p className="text-muted-foreground text-sm font-semibold opacity-60 mt-1">
                                        Update team assignments and delivery dates for <span className="text-primary font-black">{quotation?.quotationNumber}</span> — {quotation?.projectName}
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-10 pt-8 custom-scrollbar bg-background/50 backdrop-blur-sm">
                        <div className="space-y-12 max-w-7xl mx-auto">
                            
                            {/* Global Bulk Action Section */}
                            <div className="bg-primary/3 border border-primary/10 rounded-[40px] p-10 space-y-10 relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/2 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl -z-10" />
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 rounded-[24px] bg-primary/10 text-primary shadow-inner">
                                            <RefreshCw size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">Bulk Assignment</p>
                                            <p className="text-xs text-muted-foreground font-bold mt-1">Apply settings to all job cards in this quotation</p>
                                        </div>
                                    </div>
                                    <Button 
                                        type="button" 
                                        onClick={applyGlobal}
                                        className="h-14 px-12 rounded-[24px] text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 shadow-2xl shadow-primary/30 transition-all active:scale-95 group"
                                    >
                                        Apply to All Items
                                        <ArrowRight size={16} className="ml-3 opacity-50 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-[0.2em] text-foreground/80 ml-1 flex items-center gap-2">
                                            <Users size={14} className="text-primary" /> Sales Person
                                        </label>
                                        <Select 
                                            value={globalConfig.salesPerson?.id} 
                                            onValueChange={(val) => {
                                                const user = allUsers.find(u => u._id === val);
                                                setGlobalConfig(prev => ({ ...prev, salesPerson: { id: val, name: user?.name || '' } }));
                                            }}
                                        >
                                            <SelectTrigger className="h-14 rounded-[20px] bg-background/50 border-border/60 text-sm font-bold shadow-sm focus:ring-primary/20 hover:border-primary/40 transition-colors">
                                                <SelectValue placeholder="Select staff..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                                                {allUsers.map(user => (
                                                    <SelectItem key={user._id} value={user._id} className="text-sm font-bold rounded-xl py-4 focus:bg-primary/10">{user.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-[0.2em] text-foreground/80 ml-1 flex items-center gap-2">
                                            <User2 size={14} className="text-primary" /> Contact Person
                                        </label>
                                        <Input 
                                            value={globalConfig.contactPerson} 
                                            onChange={e => setGlobalConfig(prev => ({ ...prev, contactPerson: e.target.value }))}
                                            placeholder="Name of client contact"
                                            className="h-14 rounded-[20px] bg-background/50 border-border/60 text-sm font-bold shadow-sm focus:ring-primary/20 hover:border-primary/40 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-[0.2em] text-foreground/80 ml-1 flex items-center gap-2">
                                            <CalendarDays size={14} className="text-primary" /> Expected Delivery
                                        </label>
                                        <DatePicker 
                                            date={globalConfig.expectedDelivery ? parseISO(globalConfig.expectedDelivery) : undefined} 
                                            setDate={(date) => setGlobalConfig(prev => ({ ...prev, expectedDelivery: date ? format(date, 'yyyy-MM-dd') : '' }))}
                                            className="h-14 rounded-[20px] bg-background/50 border-border/60 text-sm font-bold shadow-sm focus:ring-primary/20 hover:border-primary/40 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="pt-10 border-t border-primary/10">
                                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary/80 mb-8 ml-1 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" /> Team Assignment (Set for All)
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                        <StaffMultiSelect 
                                            label="Design Team" icon={PencilLine} 
                                            selectedIds={globalConfig.assignedTo?.design || []} 
                                            allUsers={allUsers}
                                            onToggle={id => {
                                                const next = globalConfig.assignedTo!.design!.includes(id) ? globalConfig.assignedTo!.design!.filter(x=>x!==id) : [...globalConfig.assignedTo!.design!, id];
                                                setGlobalConfig(prev => ({ ...prev, assignedTo: { ...prev.assignedTo!, design: next } }));
                                            }}
                                        />
                                        <StaffMultiSelect 
                                            label="Production" icon={Wrench} 
                                            selectedIds={globalConfig.assignedTo?.production || []} 
                                            allUsers={allUsers}
                                            onToggle={id => {
                                                const next = globalConfig.assignedTo!.production!.includes(id) ? globalConfig.assignedTo!.production!.filter(x=>x!==id) : [...globalConfig.assignedTo!.production!, id];
                                                setGlobalConfig(prev => ({ ...prev, assignedTo: { ...prev.assignedTo!, production: next } }));
                                            }}
                                        />
                                        <StaffMultiSelect 
                                            label="Quality Control" icon={Shield} 
                                            selectedIds={globalConfig.assignedTo?.qc || []} 
                                            allUsers={allUsers}
                                            onToggle={id => {
                                                const next = globalConfig.assignedTo!.qc!.includes(id) ? globalConfig.assignedTo!.qc!.filter(x=>x!==id) : [...globalConfig.assignedTo!.qc!, id];
                                                setGlobalConfig(prev => ({ ...prev, assignedTo: { ...prev.assignedTo!, qc: next } }));
                                            }}
                                        />
                                        <StaffMultiSelect 
                                            label="Dispatch" icon={Truck} 
                                            selectedIds={globalConfig.assignedTo?.dispatch || []} 
                                            allUsers={allUsers}
                                            onToggle={id => {
                                                const next = globalConfig.assignedTo!.dispatch!.includes(id) ? globalConfig.assignedTo!.dispatch!.filter(x=>x!==id) : [...globalConfig.assignedTo!.dispatch!, id];
                                                setGlobalConfig(prev => ({ ...prev, assignedTo: { ...prev.assignedTo!, dispatch: next } }));
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Individual Job Card Items */}
                            <div className="space-y-8">
                                <div className="flex items-center gap-5 ml-4">
                                    <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 shadow-inner">
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-[0.3em] text-foreground/40">
                                            Job Card Specific Assignment
                                        </p>
                                        <div className="h-1.5 w-16 bg-orange-500/20 rounded-full mt-2" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-10">
                                    <AnimatePresence>
                                        {configs.map((config, idx) => (
                                            <motion.div 
                                                key={config.itemId || idx}
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                                className="p-10 bg-card/40 border border-border/30 rounded-[48px] space-y-12 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group/card"
                                            >
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/2 rounded-bl-[160px] -z-10 group-hover/card:scale-110 transition-transform duration-1000" />
                                                
                                                <div className="flex items-center gap-8">
                                                    <div className="w-20 h-20 rounded-[28px] bg-linear-to-br from-primary to-primary/80 text-white flex items-center justify-center text-3xl font-black shrink-0 shadow-2xl shadow-primary/30 ring-8 ring-primary/5">
                                                        {config.srNo}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-3xl text-foreground tracking-tight leading-tight mb-3 uppercase group-hover/card:text-primary transition-colors truncate">{config.description}</p>
                                                        <div className="flex items-center gap-4">
                                                            <Badge className="text-[11px] font-black uppercase tracking-widest px-4 py-1.5 bg-primary/10 text-primary border-none rounded-lg">
                                                                Job Card #{idx + 1}
                                                            </Badge>
                                                            {config.itemId && (
                                                                <Badge variant="outline" className="text-[11px] font-black uppercase tracking-widest px-4 py-1.5 border-border/30 opacity-60 rounded-lg">
                                                                    ID: {config.itemId.slice(-8)}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                                    <div className="space-y-4">
                                                        <label className="text-xs font-black uppercase tracking-wider text-foreground/50 ml-2 flex items-center gap-2">
                                                            <Users size={14} className="text-primary/70" /> Sales Person
                                                        </label>
                                                        <Select 
                                                            value={config.salesPerson.id} 
                                                            onValueChange={(val) => {
                                                                const user = allUsers.find(u => u._id === val);
                                                                updateSingle(idx, 'salesPerson', { id: val, name: user?.name || '' });
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-14 rounded-[20px] bg-muted/30 border-border/30 text-sm font-bold shadow-inner group-hover/card:bg-background transition-colors">
                                                                <SelectValue placeholder="Select staff..." />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                                                                {allUsers.map(user => (
                                                                    <SelectItem key={user._id} value={user._id} className="text-sm font-bold rounded-xl py-4 focus:bg-primary/10">{user.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <label className="text-xs font-black uppercase tracking-wider text-foreground/50 ml-2 flex items-center gap-2">
                                                            <User2 size={14} className="text-primary/70" /> Contact Person
                                                        </label>
                                                        <Input 
                                                            value={config.contactPerson} 
                                                            onChange={e => updateSingle(idx, 'contactPerson', e.target.value)}
                                                            placeholder="Assign a lead..."
                                                            className="h-14 rounded-[20px] bg-muted/30 border-border/30 text-sm font-bold shadow-inner group-hover/card:bg-background transition-colors"
                                                        />
                                                    </div>
                                                    <div className="space-y-4">
                                                        <label className="text-xs font-black uppercase tracking-wider text-foreground/50 ml-2 flex items-center gap-2">
                                                            <CalendarDays size={14} className="text-primary/70" /> Delivery Date
                                                        </label>
                                                        <DatePicker 
                                                            date={config.expectedDelivery ? parseISO(config.expectedDelivery) : undefined} 
                                                            setDate={(date) => updateSingle(idx, 'expectedDelivery', date ? format(date, 'yyyy-MM-dd') : '')}
                                                            className="h-14 bg-muted/30 border-border/30 text-sm font-bold shadow-inner group-hover/card:bg-background transition-colors"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="pt-10 border-t border-border/15">
                                                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-foreground/30 mb-8 ml-2">Team Assignment</p>
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                                        <StaffMultiSelect 
                                                            label="Design" icon={PencilLine} 
                                                            selectedIds={config.assignedTo.design}
                                                            allUsers={allUsers}
                                                            onToggle={id => {
                                                                const next = config.assignedTo.design.includes(id) ? config.assignedTo.design.filter(x=>x!==id) : [...config.assignedTo.design, id];
                                                                updateSingle(idx, 'assignedTo', { design: next });
                                                            }}
                                                        />
                                                        <StaffMultiSelect 
                                                            label="Production" icon={Wrench} 
                                                            selectedIds={config.assignedTo.production}
                                                            allUsers={allUsers}
                                                            onToggle={id => {
                                                                const next = config.assignedTo.production.includes(id) ? config.assignedTo.production.filter(x=>x!==id) : [...config.assignedTo.production, id];
                                                                updateSingle(idx, 'assignedTo', { production: next });
                                                            }}
                                                        />
                                                        <StaffMultiSelect 
                                                            label="QC" icon={Shield} 
                                                            selectedIds={config.assignedTo.qc}
                                                            allUsers={allUsers}
                                                            onToggle={id => {
                                                                const next = config.assignedTo.qc.includes(id) ? config.assignedTo.qc.filter(x=>x!==id) : [...config.assignedTo.qc, id];
                                                                updateSingle(idx, 'assignedTo', { qc: next });
                                                            }}
                                                        />
                                                        <StaffMultiSelect 
                                                            label="Dispatch" icon={Truck} 
                                                            selectedIds={config.assignedTo.dispatch}
                                                            allUsers={allUsers}
                                                            onToggle={id => {
                                                                const next = config.assignedTo.dispatch.includes(id) ? config.assignedTo.dispatch.filter(x=>x!==id) : [...config.assignedTo.dispatch, id];
                                                                updateSingle(idx, 'assignedTo', { dispatch: next });
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
                    <div className="p-10 bg-card border-t border-border/10 flex items-center justify-between shrink-0 shadow-[0_-20px_40px_-10px_rgba(0,0,0,0.4)] relative z-20">
                        <Button 
                            variant="ghost" 
                            onClick={() => onOpenChange(false)} 
                            className="h-14 px-10 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted/50 transition-all"
                        >
                            Cancel & Exit
                        </Button>
                        <Button 
                            onClick={handleConfirm} 
                            disabled={mutation.isPending}
                            className="h-16 px-16 rounded-[28px] font-black text-sm uppercase tracking-[0.2em] bg-linear-to-r from-emerald-500 to-emerald-600 text-white shadow-2xl shadow-emerald-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 ring-8 ring-emerald-500/5 group"
                        >
                            {mutation.isPending ? <Loader2 size={24} className="animate-spin mr-3" /> : <CheckCircle2 size={24} className="mr-3 group-hover:scale-110 transition-transform" />}
                            Deploy All Updates
                            <ArrowRight size={24} className="ml-4 opacity-30 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
