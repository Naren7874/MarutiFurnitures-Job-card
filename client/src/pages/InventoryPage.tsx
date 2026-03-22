import { useState } from 'react';
import { Plus, Search, Package, AlertTriangle, RotateCcw, Boxes, TrendingDown, Layers, MoreHorizontal, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useInventory, useRestockItem, useCreateItem } from '../hooks/useApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const StatCard = ({ icon: Icon, label, value, sub, colorClass, delay = 0 }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        whileHover={{ y: -4, scale: 1.02 }}
        className="bg-card border border-border/60 rounded-[24px] p-6 flex flex-col gap-4 hover:shadow-2xl hover:shadow-primary/5 transition-all group relative overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-primary/5 to-transparent rounded-bl-[100px] opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-6", colorClass)}>
            <Icon size={22} strokeWidth={2.5} />
        </div>
        <div>
            <p className="text-muted-foreground/50 text-[11px] font-black uppercase tracking-[0.15em] mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <p className="text-foreground text-4xl font-black tracking-tighter leading-none">{value ?? '0'}</p>
                {sub && <span className="text-muted-foreground/40 text-[11px] font-black uppercase tracking-widest">{sub}</span>}
            </div>
        </div>
    </motion.div>
);

export default function InventoryPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [restockItem, setRestockItem] = useState<any>(null);
    const [qty, setQty] = useState('');
    const [showAddItem, setShowAddItem] = useState(false);
    const [newItem, setNewItem] = useState({ itemName: '', sku: '', category: '', unit: 'pcs', currentStock: '', minStockLevel: '', unitRate: '' });
    const { hasPermission } = useAuthStore();
    const canCreate = hasPermission('inventory.create');
    const canEdit   = hasPermission('inventory.edit');

    const { data: raw, isLoading, refetch } = useInventory({ search, page, limit: 30 });
    const resp: any = raw;
    const items: any[] = resp?.data ?? [];
    const pagination: any = resp?.pagination ?? {};

    const lowStockCount = items.filter(i => i.currentStock <= i.minStockLevel).length;
    const restock = useRestockItem(restockItem?._id ?? '');
    const createItem = useCreateItem();

    const handleRestock = async () => {
        if (!qty) return;
        await restock.mutateAsync({ qty: Number(qty) });
        setRestockItem(null);
        setQty('');
        refetch();
    };

    const handleAddItem = async () => {
        if (!newItem.itemName || !newItem.sku) return;
        await createItem.mutateAsync({
            ...newItem,
            currentStock: Number(newItem.currentStock) || 0,
            minStockLevel: Number(newItem.minStockLevel) || 0,
            unitRate: Number(newItem.unitRate) || 0,
        });
        setShowAddItem(false);
        setNewItem({ itemName: '', sku: '', category: '', unit: 'pcs', currentStock: '', minStockLevel: '', unitRate: '' });
        refetch();
    };

    return (
        <div className="p-8 space-y-10 max-w-[1600px] mx-auto">
            {/* Header Area */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-foreground mb-3 leading-none">Inventory Management</h1>
                    <div className="flex items-center gap-3.5">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(var(--primary),0.4)]" />
                        <p className="text-muted-foreground/60 text-[13px] font-black uppercase tracking-[0.15em]">
                            Central Warehouse & Stock Control
                        </p>
                    </div>
                </div>
                {canCreate && (
                    <Button
                        onClick={() => setShowAddItem(true)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 gap-3 font-black text-[13px] uppercase tracking-[0.2em] h-12 px-8 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 group"
                    >
                        <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform" /> Add Stock Item
                    </Button>
                )}
            </motion.div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    icon={Boxes}
                    label="Total SKUs"
                    value={pagination.total ?? 0}
                    sub="Items"
                    colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    delay={0.1}
                />
                <StatCard
                    icon={TrendingDown}
                    label="Low Stock Alert"
                    value={lowStockCount}
                    sub="Critical"
                    colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    delay={0.2}
                />
                <StatCard
                    icon={Layers}
                    label="Categories"
                    value={new Set(items.map(i => i.category)).size}
                    sub="Sectors"
                    colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    delay={0.3}
                />
            </div>

            {/* Search and Filters */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="relative group max-w-2xl"
            >
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                <Input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search by SKU, item name or Category..."
                    className="pl-12 bg-card border-border/80 text-foreground h-14 rounded-2xl focus:ring-2 focus:ring-primary/10 transition-all font-medium placeholder:text-muted-foreground/40 shadow-sm backdrop-blur-md"
                />
            </motion.div>

            {/* Main Content Table Area */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-card border border-border focus-within:border-primary/50 rounded-[32px] overflow-hidden shadow-2xl shadow-black/5"
            >
                {isLoading ? (
                    <div className="p-8 space-y-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-16 bg-muted/40 rounded-2xl animate-pulse border border-border/30" />
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border/40 bg-muted/20">
                                    <th className="text-left px-8 py-5 text-muted-foreground/60 text-[11px] font-black uppercase tracking-[0.15em]">Asset Detail</th>
                                    <th className="text-left px-8 py-5 text-muted-foreground/60 text-[11px] font-black uppercase tracking-[0.15em] hidden sm:table-cell">Inventory Category</th>
                                    <th className="text-center px-8 py-5 text-muted-foreground/60 text-[11px] font-black uppercase tracking-[0.15em]">Available Stock</th>
                                    <th className="text-center px-8 py-5 text-muted-foreground/60 text-[11px] font-black uppercase tracking-[0.15em] hidden md:table-cell">Buffer (Min)</th>
                                    <th className="text-right px-8 py-5 text-muted-foreground/60 text-[11px] font-black uppercase tracking-[0.15em]">Unit Price</th>
                                    <th className="w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                <AnimatePresence mode="popLayout">
                                    {items.map((item, idx) => {
                                        const isLow = item.currentStock <= item.minStockLevel;
                                        return (
                                            <motion.tr
                                                key={item._id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="group hover:bg-muted/30 transition-all cursor-pointer"
                                            >
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform",
                                                            isLow ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"
                                                        )}>
                                                            {isLow ? <AlertTriangle size={18} /> : <Package size={18} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-foreground font-black text-sm tracking-tight">{item.itemName}</p>
                                                            <p className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-tighter">{item.sku}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 hidden sm:table-cell">
                                                    <span className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest bg-muted/50 px-2 py-1 rounded-lg">
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className={cn(
                                                            "text-lg font-black tracking-tighter",
                                                            isLow ? "text-rose-600" : "text-foreground"
                                                        )}>
                                                            {item.currentStock}
                                                        </span>
                                                        <span className="text-muted-foreground/40 text-[9px] font-black uppercase tracking-widest">{item.unit}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center hidden md:table-cell">
                                                    <p className="text-muted-foreground/40 text-[11px] font-bold">{item.minStockLevel}</p>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <p className="text-foreground font-black text-sm">₹{item.unitRate?.toLocaleString('en-IN')}</p>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {canEdit && (
                                                            <button
                                                                onClick={(e) => { e.preventDefault(); setRestockItem(item); setQty(''); }}
                                                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all"
                                                                title="Restock Item"
                                                            >
                                                                <RotateCcw size={16} />
                                                            </button>
                                                        )}
                                                        <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-primary transition-all">
                                                            <MoreHorizontal size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground/20">
                                                <Package size={64} />
                                                <p className="text-sm font-black uppercase tracking-widest italic">Inventory Vault Empty</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-8 py-6 border-t border-border/20 bg-muted/10">
                        <span className="text-muted-foreground/40 text-[11px] font-black uppercase tracking-[0.2em]">
                            Vault Page {page} of {pagination.pages}
                        </span>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="h-10 px-8 rounded-xl border-border/60 text-muted-foreground hover:text-primary transition-all font-black text-[11px] uppercase tracking-widest"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= pagination.pages}
                                onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="h-10 px-8 rounded-xl border-border/60 text-muted-foreground hover:text-primary transition-all font-black text-[11px] uppercase tracking-widest"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* High-End Restock Dialog */}
            <Dialog open={!!restockItem} onOpenChange={() => setRestockItem(null)}>
                <DialogContent className="max-w-md p-0 overflow-hidden bg-card border-none rounded-[32px] shadow-2xl">
                    <div className="bg-linear-to-br from-primary to-indigo-700 p-8 text-white relative">
                        <div className="relative z-10">
                            <DialogTitle className="text-2xl font-black tracking-tight mb-2">Restock Asset</DialogTitle>
                            <DialogDescription className="text-white/60 font-medium">Update stock levels for {restockItem?.itemName}</DialogDescription>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full blur-2xl" />
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex gap-4">
                            <div className="flex-1 p-4 rounded-2xl bg-muted/50 border border-border/40">
                                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Current Stock</p>
                                <p className="text-foreground font-black text-2xl">{restockItem?.currentStock} <span className="text-[10px] font-medium text-muted-foreground uppercase">{restockItem?.unit}</span></p>
                            </div>
                            <div className="flex-1 p-4 rounded-2xl bg-muted/50 border border-border/40">
                                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Min required</p>
                                <p className="text-foreground font-black text-2xl">{restockItem?.minStockLevel} <span className="text-[10px] font-medium text-muted-foreground uppercase">{restockItem?.unit}</span></p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">Quantity to Ingest</label>
                            <div className="relative group">
                                <Input
                                    type="number"
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value)}
                                    placeholder="Enter units to add..."
                                    className="bg-muted/30 border-border/60 text-foreground h-14 rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-xl px-6 placeholder:text-muted-foreground/20"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-primary/10 text-primary px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                    {restockItem?.unit}
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex flex-col gap-3">
                            <Button
                                onClick={handleRestock}
                                disabled={!qty || restock.isPending}
                                className="w-full bg-primary text-primary-foreground h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all group overflow-hidden relative"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {restock.isPending ? 'Verifying...' : 'Commit Inventory Change'}
                                </span>
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setRestockItem(null)}
                                className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-muted"
                            >
                                Discard Operation
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Add New Inventory Item Dialog ── */}
            <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
                <DialogContent className="max-w-lg p-0 overflow-hidden bg-card border-none rounded-[32px] shadow-2xl">
                    <div className="bg-linear-to-br from-emerald-600 to-teal-700 p-8 text-white relative">
                        <div className="relative z-10">
                            <DialogTitle className="text-2xl font-black tracking-tight mb-1">Add Stock Item</DialogTitle>
                            <DialogDescription className="text-white/60 font-medium">Register a new item in your inventory vault</DialogDescription>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full blur-2xl" />
                    </div>

                    <div className="p-8 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Item Name *</Label>
                                <Input
                                    value={newItem.itemName}
                                    onChange={e => setNewItem(f => ({ ...f, itemName: e.target.value }))}
                                    placeholder="e.g. Teak Wood Plank"
                                    className="rounded-2xl h-11 font-medium"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">SKU *</Label>
                                <Input
                                    value={newItem.sku}
                                    onChange={e => setNewItem(f => ({ ...f, sku: e.target.value }))}
                                    placeholder="e.g. TWP-001"
                                    className="rounded-2xl h-11 font-medium"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Category</Label>
                                <Input
                                    value={newItem.category}
                                    onChange={e => setNewItem(f => ({ ...f, category: e.target.value }))}
                                    placeholder="e.g. Timber"
                                    className="rounded-2xl h-11 font-medium"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Unit</Label>
                                <Select value={newItem.unit} onValueChange={v => setNewItem(f => ({ ...f, unit: v }))}>
                                    <SelectTrigger className="rounded-2xl h-11 font-bold text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        {['pcs', 'sqft', 'ltr', 'kg', 'mtr', 'nos', 'set', 'pair', 'box'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Initial Stock</Label>
                                <Input
                                    type="number" min="0"
                                    value={newItem.currentStock}
                                    onChange={e => setNewItem(f => ({ ...f, currentStock: e.target.value }))}
                                    className="rounded-2xl h-11 font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Min Stock Level</Label>
                                <Input
                                    type="number" min="0"
                                    value={newItem.minStockLevel}
                                    onChange={e => setNewItem(f => ({ ...f, minStockLevel: e.target.value }))}
                                    className="rounded-2xl h-11 font-bold"
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Unit Rate (₹)</Label>
                                <Input
                                    type="number" min="0"
                                    value={newItem.unitRate}
                                    onChange={e => setNewItem(f => ({ ...f, unitRate: e.target.value }))}
                                    className="rounded-2xl h-11 font-bold"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            <Button
                                onClick={handleAddItem}
                                disabled={!newItem.itemName || !newItem.sku || createItem.isPending}
                                className="w-full h-12 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                            >
                                {createItem.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                Add to Inventory
                            </Button>
                            <Button variant="ghost" onClick={() => setShowAddItem(false)} className="w-full h-10 rounded-2xl font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-muted">
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
