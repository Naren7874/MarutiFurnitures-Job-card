import { useState, useEffect } from 'react';
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
    ArrowRight, Shield, Wrench, Truck, PencilLine, Plus, X
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/axios';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface TeamAssignment {
    design: string[];
    production: string[];
    qc: string[];
    dispatch: string[];
}

interface JobCardConfig {
    itemId: string;
    srNo: number;
    description: string;
    salesPerson: { id: string; name: string };
    contactPerson: { id: string; name: string };
    expectedDelivery: string;
    assignedTo: TeamAssignment;
}

interface ApproveQuotationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (jobCardConfigs: any[]) => void;
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
        salesPerson: { id: '', name: '' },
        contactPerson: { id: '', name: '' },
        expectedDelivery: '',
        assignedTo: { design: [], production: [], qc: [], dispatch: [] } as TeamAssignment,
    });

    const { data: usersRaw } = useQuery({
        queryKey: ['users', 'all'],
        queryFn: () => apiGet('/users'),
        enabled: open,
    });
    const allUsers: any[] = (usersRaw as any)?.data ?? [];

    useEffect(() => {
        if (open && quotation?.items) {
            // Pre-fill from quotation's general assigned staff if available
            const defaultStaffIds = (quotation.assignedStaff || []).map((s: any) => s._id || s);

            setConfigs(quotation.items.map((item: any) => ({
                itemId: item._id,
                srNo: item.srNo,
                description: item.description,
                salesPerson: { id: '', name: '' },
                contactPerson: { id: '', name: '' },
                expectedDelivery: '',
                assignedTo: { 
                    design: [...defaultStaffIds], 
                    production: [...defaultStaffIds], 
                    qc: [], 
                    dispatch: [] 
                },
            })));
            setGlobalConfig({
                salesPerson: { id: '', name: '' },
                contactPerson: { id: '', name: '' },
                expectedDelivery: '',
                assignedTo: { 
                    design: [...defaultStaffIds], 
                    production: [...defaultStaffIds], 
                    qc: [], 
                    dispatch: [] 
                },
            });
        }
    }, [open, quotation]);

    const handleUpdateItem = (index: number, field: string, value: any) => {
        setConfigs(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
    };

    const applyGlobal = () => {
        setConfigs(prev => prev.map(c => ({
            ...c,
            salesPerson: globalConfig.salesPerson.id ? globalConfig.salesPerson : c.salesPerson,
            contactPerson: globalConfig.contactPerson.id ? globalConfig.contactPerson : c.contactPerson,
            expectedDelivery: globalConfig.expectedDelivery || c.expectedDelivery,
            assignedTo: {
                design: globalConfig.assignedTo.design.length ? globalConfig.assignedTo.design : c.assignedTo.design,
                production: globalConfig.assignedTo.production.length ? globalConfig.assignedTo.production : c.assignedTo.production,
                qc: globalConfig.assignedTo.qc.length ? globalConfig.assignedTo.qc : c.assignedTo.qc,
                dispatch: globalConfig.assignedTo.dispatch.length ? globalConfig.assignedTo.dispatch : c.assignedTo.dispatch,
            }
        })));
    };

    const handleConfirm = () => {
        onConfirm(configs.map(({ itemId, srNo, salesPerson, contactPerson, expectedDelivery, assignedTo }) => ({
            itemId,
            srNo,
            salesPerson: salesPerson.id ? salesPerson : undefined,
            contactPerson: contactPerson.name || undefined, 
            expectedDelivery: expectedDelivery || undefined,
            assignedTo,
        })));
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
                                <DialogTitle className="text-3xl font-black tracking-tighter text-foreground">
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
                            <div className="bg-primary/[0.03] border border-primary/10 rounded-[40px] p-10 space-y-8 relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.02] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl -z-10" />
                                
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
                                            value={globalConfig.salesPerson.id} 
                                            onValueChange={(val) => {
                                                const user = allUsers.find(u => u._id === val);
                                                setGlobalConfig(prev => ({ ...prev, salesPerson: { id: val, name: user?.name || '' } }));
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
                                        <Input 
                                            type="date"
                                            value={globalConfig.expectedDelivery} 
                                            onChange={e => setGlobalConfig(prev => ({ ...prev, expectedDelivery: e.target.value }))}
                                            className="h-12 rounded-2xl bg-background/50 border-border/60 text-sm font-bold shadow-sm focus:ring-primary/20 hover:border-primary/40 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-primary/10">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/80 mb-6 ml-1 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Team Assignment (Set for All)
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <StaffMultiSelect 
                                            label="Design Team" 
                                            icon={PencilLine} 
                                            selectedIds={globalConfig.assignedTo.design}
                                            allUsers={allUsers}
                                            onToggle={(id) => setGlobalConfig(prev => ({
                                                ...prev,
                                                assignedTo: {
                                                    ...prev.assignedTo,
                                                    design: prev.assignedTo.design.includes(id) 
                                                        ? prev.assignedTo.design.filter(x => x !== id)
                                                        : [...prev.assignedTo.design, id]
                                                }
                                            }))}
                                        />
                                        <StaffMultiSelect 
                                            label="Production" 
                                            icon={Wrench} 
                                            selectedIds={globalConfig.assignedTo.production}
                                            allUsers={allUsers}
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
                                            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/[0.03] rounded-bl-[120px] -z-10 group-hover/card:scale-125 transition-transform duration-700" />
                                            
                                            <div className="flex items-start justify-between relative">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center text-2xl font-black shrink-0 shadow-2xl shadow-primary/30 ring-4 ring-primary/10">
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
                                                        value={config.salesPerson.id} 
                                                        onValueChange={(val) => {
                                                            const user = allUsers.find(u => u._id === val);
                                                            handleUpdateItem(idx, 'salesPerson', { id: val, name: user?.name || '' });
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
                                                    <Input 
                                                        type="date"
                                                        value={config.expectedDelivery} 
                                                        onChange={e => handleUpdateItem(idx, 'expectedDelivery', e.target.value)}
                                                        className="h-12 rounded-2xl bg-muted/40 border-border/40 text-sm font-bold shadow-inner group-hover/card:bg-background transition-colors"
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
                                                    label="Design" 
                                                    icon={PencilLine} 
                                                    selectedIds={config.assignedTo.design}
                                                    allUsers={allUsers}
                                                    onToggle={(id) => handleUpdateItem(idx, 'assignedTo', {
                                                        ...config.assignedTo,
                                                        design: config.assignedTo.design.includes(id) 
                                                            ? config.assignedTo.design.filter(x => x !== id)
                                                            : [...config.assignedTo.design, id]
                                                    })}
                                                />
                                                <StaffMultiSelect 
                                                    label="Production" 
                                                    icon={Wrench} 
                                                    selectedIds={config.assignedTo.production}
                                                    allUsers={allUsers}
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
                                                    onToggle={(id) => handleUpdateItem(idx, 'assignedTo', {
                                                        ...config.assignedTo,
                                                        dispatch: config.assignedTo.dispatch.includes(id) 
                                                            ? config.assignedTo.dispatch.filter(x => x !== id)
                                                            : [...config.assignedTo.dispatch, id]
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

const StaffMultiSelect = ({ 
    label, 
    icon: Icon, 
    selectedIds, 
    onToggle, 
    allUsers 
}: { 
    label: string, 
    icon: any, 
    selectedIds: string[], 
    onToggle: (id: string) => void, 
    allUsers: any[] 
}) => {
    const selectedUsers = allUsers.filter(u => selectedIds.includes(u._id));

    return (
        <div className="space-y-2 flex-1">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/60 ml-1 flex items-center gap-2">
                <Icon size={12} className="text-primary/50" /> {label}
            </label>
            <Popover>
                <PopoverTrigger asChild>
                    <div className="min-h-12 p-2.5 rounded-2xl bg-muted/20 border border-border/30 flex flex-wrap gap-2 cursor-pointer hover:bg-muted/40 transition-all shadow-inner group-hover/card:bg-background">
                        {selectedUsers.length > 0 ? (
                            selectedUsers.map(u => (
                                <Badge key={u._id} variant="secondary" className="rounded-xl py-1 px-3 text-[11px] font-black gap-2 bg-primary/10 text-primary border border-primary/20 shadow-sm hover:bg-primary/20 transition-colors">
                                    {u.name}
                                    <X size={12} className="hover:text-rose-500 transition-colors" onClick={(e) => { e.stopPropagation(); onToggle(u._id); }} />
                                </Badge>
                            ))
                        ) : (
                            <span className="text-xs text-muted-foreground/30 font-bold ml-1.5 mt-1.5">Assign staff...</span>
                        )}
                        <div className="ml-auto flex items-center pr-1 opacity-20 group-hover/card:opacity-40 transition-opacity">
                            <Plus size={16} />
                        </div>
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0 rounded-3xl border-border/40 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] bg-card" align="start">
                    <Command className="bg-transparent">
                        <div className="p-3 pb-0">
                            <CommandInput placeholder={`Search ${label}...`} className="h-10 bg-muted/50 rounded-xl border-none text-sm font-bold placeholder:text-muted-foreground/30" />
                        </div>
                        <CommandList className="max-h-[250px] p-2 custom-scrollbar">
                            <CommandEmpty className="py-8 text-center text-xs font-black uppercase tracking-widest text-muted-foreground/40">No staff found.</CommandEmpty>
                            <CommandGroup>
                                {allUsers.map(user => {
                                    const isSelected = selectedIds.includes(user._id);
                                    return (
                                        <CommandItem
                                            key={user._id}
                                            onSelect={() => onToggle(user._id)}
                                            className="flex items-center gap-3 px-3 py-3 text-sm font-bold cursor-pointer rounded-xl mb-1 aria-selected:bg-primary/10 aria-selected:text-primary transition-all"
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                                isSelected ? "bg-primary border-primary scale-110 shadow-lg shadow-primary/20" : "border-border/60"
                                            )}>
                                                {isSelected && <CheckCircle2 size={12} className="text-white" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="leading-none">{user.name}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">{user.role}</span>
                                            </div>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
};

const RefreshCw = ({ className, size }: { className?: string, size?: number }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size || 24} 
        height={size || 24} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={cn("lucide lucide-refresh-cw", className)}
    >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M3 21v-5h5"/>
    </svg>
);
