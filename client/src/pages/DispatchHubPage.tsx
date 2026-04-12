import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
    Truck, Package, Camera, Search, User, Lock,
    LogOut, Loader2, ChevronRight, CheckCheck,
    AlertCircle, Image as ImageIcon, X
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useDispatchTeam, useDeliveryTrips, useCompleteDelivery, useJobCard } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DeliveryTrip {
    _id: string;
    clientId: {
        name: string;
        phone: string;
        address?: string | {
            houseNumber?: string;
            line1?: string;
            line2?: string;
            city?: string;
            pincode?: string;
        };
    };
    jobCards: Array<{
        _id: string;
        jobCardNumber: string;
        title: string;
        status: string;
        photo?: string;
    }>;
    deliveryTeam: Array<{ user_id: string; name: string; phone?: string; role: string }>;
    status: string;
    scheduledDate: string;
    timeSlot: string;
    deliveredByName?: string;
    proofOfDelivery?: {
        photos: string[];
        capturedAt?: string;
    };
}

// ── Main Hub Page ─────────────────────────────────────────────────────────────

export default function DispatchHubPage() {
    const navigate = useNavigate();
    const { logout } = useAuthStore();
    const qc = useQueryClient();
    
    // Identity State
    const [selectedMember, setSelectedMember] = useState<{ id: string, name: string } | null>(null);
    const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
    const [viewingJobCard, setViewingJobCard] = useState<string | null>(null);
    
    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
    const [filterType, setFilterType] = useState<'all' | 'mine'>('mine');

    // API Data
    const dispatchTeamRes = useDispatchTeam() as any;
    const teamMembers = Array.isArray(dispatchTeamRes.data?.data) ? dispatchTeamRes.data.data : [];
    
    const { data: tripsRes, isLoading } = useDeliveryTrips({ 
        status: 'scheduled,in_transit,delivered', 
        limit: 100 
    }) as any;
    
    const deliveryTrips: DeliveryTrip[] = tripsRes?.data || [];

    // Persist Identity
    useEffect(() => {
        const saved = localStorage.getItem('dispatch_identity');
        if (saved) {
            try {
                setSelectedMember(JSON.parse(saved));
            } catch (e) {
                setIsIdentityModalOpen(true);
            }
        } else {
            setIsIdentityModalOpen(true);
        }
    }, []);

    const handleSelectMember = (member: any) => {
        const identity = { id: member._id, name: member.name };
        setSelectedMember(identity);
        localStorage.setItem('dispatch_identity', JSON.stringify(identity));
        setIsIdentityModalOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('dispatch_identity');
        logout();
        navigate('/login');
    };

    // Filter Logic
    const filteredTrips = deliveryTrips.filter(trip => {
        const searchTarget = trip.jobCards.map(jc => jc.jobCardNumber).join(' ') + ' ' + (trip.clientId?.name || '');
        const matchesSearch = searchTarget.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesTab = activeTab === 'pending' 
            ? ['scheduled', 'in_transit'].includes(trip.status)
            : trip.status === 'delivered';

        const isMine = (trip.deliveryTeam?.some(t => 
            t.name?.trim().toLowerCase() === selectedMember?.name?.trim().toLowerCase()
        )) || (trip.deliveredByName?.trim().toLowerCase() === selectedMember?.name?.trim().toLowerCase());
        const matchesFilter = filterType === 'all' || isMine;
            
        return matchesSearch && matchesTab && matchesFilter;
    });

    return (
        <div className="h-full w-full bg-[#0a0a0b] selection:bg-emerald-500/30 overflow-hidden flex flex-col font-sans text-white">
            {/* Header */}
            <header className="shrink-0 z-30 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/5 w-full flex justify-center">
                <div className="w-full max-w-7xl px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Truck className="size-4.5 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xs font-black uppercase tracking-widest text-emerald-400">Dispatch Portal</h1>
                            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                                {selectedMember ? `Active: ${selectedMember.name}` : 'Select Identity'} 
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white/60"
                            onClick={() => {
                                qc.invalidateQueries({ queryKey: ['jobcards'] });
                                qc.invalidateQueries({ queryKey: ['dispatch-team'] });
                            }}
                        >
                            <Loader2 className={cn("size-4", (dispatchTeamRes.isFetching || isLoading) && "animate-spin")} />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white/60"
                            onClick={() => setIsIdentityModalOpen(true)}
                        >
                            <User className="size-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 transition-all text-rose-500"
                            onClick={handleLogout}
                        >
                            <LogOut className="size-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-0 w-full max-w-7xl mx-auto">
                {/* Search & Tabs */}
                <div className="shrink-0 p-4 pb-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative group w-full md:w-96">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-white/30 group-focus-within:text-emerald-500 transition-colors" />
                        <Input 
                            placeholder="Search Job #, Client..." 
                            className="w-full h-10 pl-10 rounded-xl bg-white/5 border-white/5 focus:border-emerald-500/50 focus:ring-0 transition-all text-xs font-medium"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-row gap-3 w-full md:w-auto md:ml-auto">
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full md:w-64">
                            <button 
                                onClick={() => setActiveTab('pending')}
                                className={cn(
                                    "flex-1 h-9 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                    activeTab === 'pending' ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-white/40 hover:text-white/60"
                                )}
                            >
                                Upcoming
                            </button>
                            <button 
                                onClick={() => setActiveTab('completed')}
                                className={cn(
                                    "flex-1 h-9 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                    activeTab === 'completed' ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-white/40 hover:text-white/60"
                                )}
                            >
                                Completed
                            </button>
                        </div>
                        
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full md:w-48 overflow-hidden">
                            <button 
                                onClick={() => setFilterType('all')}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all",
                                    filterType === 'all' ? "bg-white/15 text-white shadow-md shadow-black/20" : "text-white/30 hover:text-white/50"
                                )}
                            >
                                All
                            </button>
                            <button 
                                onClick={() => setFilterType('mine')}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all",
                                    filterType === 'mine' ? "bg-emerald-500/20 text-emerald-400 shadow-md shadow-emerald-500/10" : "text-white/30 hover:text-white/50"
                                )}
                            >
                                My Jobs
                            </button>
                        </div>
                    </div>
                </div>

                {/* Job List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-24">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="size-8 text-emerald-500 animate-spin" />
                            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Loading deliveries...</p>
                        </div>
                    ) : filteredTrips.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-6 grayscale opacity-30">
                            <div className="size-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                                <Package className="size-10" />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em]">No deliveries found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredTrips.map((trip) => (
                                <TripDeliveryCard 
                                    key={trip._id} 
                                    trip={trip} 
                                    activeTab={activeTab} 
                                    currentDispatcher={selectedMember?.name || ''} 
                                    onViewJobCard={setViewingJobCard}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Identity Selection Overlay */}
            <AnimatePresence>
                {isIdentityModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-[#0a0a0b]/95 backdrop-blur-md flex flex-col"
                    >
                        <div className="p-8 space-y-8 flex-1 flex flex-col justify-center">
                            <div className="space-y-2 text-center">
                                <h2 className="text-2xl font-black uppercase">Who is logged in?</h2>
                                <p className="text-sm text-white/40 font-medium">Select your name to start tracking deliveries</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto w-full">
                                {dispatchTeamRes.isLoading ? (
                                    <Loader2 className="size-6 text-emerald-500 animate-spin mx-auto" />
                                ) : teamMembers.length === 0 ? (
                                    <div className="text-center p-12 space-y-4 bg-white/5 rounded-[2.5rem] border border-white/5">
                                        <AlertCircle className="size-10 text-amber-500 mx-auto opacity-50" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-black uppercase tracking-widest text-white/80">No Team Found</p>
                                            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] leading-relaxed">Please ask your administrator to add you to the Dispatch Team list.</p>
                                        </div>
                                    </div>
                                ) : teamMembers.map((m: any) => (
                                    <button 
                                        key={m._id}
                                        onClick={() => handleSelectMember(m)}
                                        className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-sm font-bold flex items-center px-6 gap-4 transition-all group active:scale-[0.98]"
                                    >
                                        <div className="size-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:text-emerald-500">
                                            <User className="size-4" />
                                        </div>
                                        {m.name}
                                        <ChevronRight className="ml-auto size-4 text-white/20 group-hover:text-emerald-500" />
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {selectedMember && (
                            <div className="p-6 border-t border-white/5">
                                <Button 
                                    variant="ghost" 
                                    className="w-full h-12 rounded-2xl text-white/40 font-bold uppercase tracking-widest text-xs"
                                    onClick={() => setIsIdentityModalOpen(false)}
                                >
                                    Dismiss
                                </Button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Job Card Detailed View */}
            <AnimatePresence>
                {viewingJobCard && (
                    <JobCardDetailModal 
                        id={viewingJobCard} 
                        onClose={() => setViewingJobCard(null)} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Trip Delivery Card Component ───────────────────────────────────────────────

function TripDeliveryCard({ trip, activeTab, currentDispatcher, onViewJobCard }: { 
    trip: DeliveryTrip, 
    activeTab: string, 
    currentDispatcher: string,
    onViewJobCard: (id: string) => void
}) {
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const completeMutation = useCompleteDelivery(trip._id);

    const isAssignedToMe = trip.deliveryTeam?.some(t => t.name === currentDispatcher);

    const handleMarkDelivered = async (files: File[]) => {
        completeMutation.mutate({
            podPhotos: files,
            deliveredByName: currentDispatcher
        }, {
            onSuccess: () => setIsPhotoModalOpen(false)
        });
    };

    return (
        <Card className="bg-white/5 border-white/5 rounded-[2rem] overflow-hidden group hover:bg-white/[0.07] transition-all">
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1 w-full">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-500/60 bg-emerald-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                Trip • {trip.jobCards.length} Items
                            </span>
                            {activeTab === 'completed' && (
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 bg-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCheck className="size-2.5" /> Delivered
                                </span>
                            )}
                            {isAssignedToMe && activeTab === 'pending' && (
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <User className="size-2.5" /> Mine
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-black leading-tight text-white/90 mt-2">{trip.clientId.name}</h3>
                        <p className="text-xs text-white/60 line-clamp-2">
                            {typeof trip.clientId.address === 'object' 
                                ? [trip.clientId.address.houseNumber, trip.clientId.address.line1, trip.clientId.address.line2, trip.clientId.address.city, trip.clientId.address.pincode].filter(Boolean).join(', ')
                                : (trip.clientId.address || 'Address Unspecified')}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Item List Summary */}
                    <div className="p-3 bg-black/20 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">Package Contents</p>
                        <ul className="space-y-2 custom-scrollbar max-h-40 overflow-y-auto pr-2">
                            {trip.jobCards.map(jc => (
                                <li 
                                    key={jc._id} 
                                    className="flex gap-3 items-center group/item cursor-pointer"
                                    onClick={() => onViewJobCard(jc._id)}
                                >
                                    <div className="size-8 rounded-lg bg-black overflow-hidden shrink-0 border border-white/10 group-hover/item:border-emerald-500/50 transition-colors">
                                        {jc.photo ? (
                                            <img src={jc.photo} className="size-full object-cover" alt={jc.title} />
                                        ) : (
                                            <div className="size-full flex items-center justify-center bg-white/5">
                                                <Package className="size-3 text-white/20" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[11px] font-bold text-white/80 group-hover/item:text-emerald-400 transition-colors truncate">
                                                {jc.title}
                                            </p>
                                            <ChevronRight className="size-3 text-white/20 group-hover/item:text-emerald-500 transition-transform group-hover/item:translate-x-1" />
                                        </div>
                                        <p className="text-[9px] font-mono text-emerald-500/60 leading-none">
                                            {jc.jobCardNumber}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-2xl bg-white/5 flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Scheduled</span>
                            <span className="text-[11px] font-bold">
                                {trip.scheduledDate ? format(new Date(trip.scheduledDate), 'dd MMM yyyy') : 'Not Set'}
                            </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Time</span>
                            <span className="text-[11px] font-bold">{trip.timeSlot || 'Any time'}</span>
                        </div>
                    </div>

                    {/* Action Section */}
                    {activeTab === 'pending' ? (
                        isAssignedToMe ? (
                            <Button 
                                className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                                onClick={() => setIsPhotoModalOpen(true)}
                                disabled={completeMutation.isPending}
                            >
                                {completeMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-5" strokeWidth={2.5} />}
                                Capture Proof & Deliver
                            </Button>
                        ) : (
                            <div className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 font-black uppercase tracking-widest text-[10px] gap-2">
                                <Lock className="size-3.5 opacity-50" />
                                Assigned to {trip.deliveryTeam?.[0]?.name || 'Another Team'}
                            </div>
                        )
                    ) : (
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 overflow-x-auto custom-scrollbar flex-nowrap">
                            {trip.proofOfDelivery?.photos?.length ? (
                                trip.proofOfDelivery.photos.map((photoUrl, idx) => (
                                    <img 
                                        key={idx}
                                        src={photoUrl} 
                                        className="size-10 rounded-xl object-cover bg-black shrink-0" 
                                        alt={`POD ${idx + 1}`}
                                    />
                                ))
                            ) : (
                                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                    <ImageIcon className="size-4 text-white/20" />
                                </div>
                            )}
                            <div className="flex-1 min-w-[100px]">
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Delivered on</p>
                                <p className="text-xs font-bold text-white/60">
                                    {trip.proofOfDelivery?.capturedAt 
                                        ? format(new Date(trip.proofOfDelivery.capturedAt), 'dd MMM, hh:mm a')
                                        : 'Unknown Date'
                                    }
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">By</p>
                                <p className="text-xs font-bold text-white/60 truncate max-w-[80px]">
                                    {trip.deliveredByName || 'Driver'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>

            {/* POD Photo Upload Modal */}
            <AnimatePresence>
                {isPhotoModalOpen && (
                    <PODUploadModal 
                        onClose={() => setIsPhotoModalOpen(false)}
                        onComplete={handleMarkDelivered}
                        title={`Deliver ${trip.jobCards.length} Items to ${trip.clientId.name}`}
                        isUploading={completeMutation.isPending}
                        jobCards={trip.jobCards}
                    />
                )}
            </AnimatePresence>
        </Card>
    );
}

// ── Job Card Detail Modal ───────────────────────────────────────────────────

function JobCardDetailModal({ id, onClose }: { id: string, onClose: () => void }) {
    const { data: jobCardRes, isLoading } = useJobCard(id) as any;
    const jc = jobCardRes?.data;

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-110 bg-[#0a0a0b]/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-lg bg-[#1a1a1c] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {isLoading ? (
                    <div className="h-96 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="size-10 text-emerald-500 animate-spin" />
                        <p className="text-sm font-bold text-white/40 uppercase tracking-widest">Loading Specs...</p>
                    </div>
                ) : !jc ? (
                    <div className="h-96 flex flex-col items-center justify-center gap-4">
                        <AlertCircle className="size-10 text-red-500" />
                        <p className="text-sm font-bold text-white/40 uppercase tracking-widest">Job Card Not Found</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 flex items-center justify-between border-b border-white/5">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">{jc.jobCardNumber}</h4>
                                <h2 className="text-xl font-black text-white">{jc.title}</h2>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-xl bg-white/5" onClick={onClose}>
                                <X className="size-5" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                            {/* Main Image */}
                            <div className="aspect-video w-full rounded-3xl bg-black overflow-hidden border border-white/5 shadow-2xl relative group">
                                {jc.items?.[0]?.photo ? (
                                    <img src={jc.items[0].photo} className="size-full object-cover" alt={jc.title} />
                                ) : (
                                    <div className="size-full flex flex-col items-center justify-center gap-4">
                                        <ImageIcon className="size-12 text-white/5" />
                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">No Design Image</p>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                            </div>

                            {/* Specifications Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Size', value: jc.items?.[0]?.specifications?.size },
                                    { label: 'Polish', value: jc.items?.[0]?.specifications?.polish },
                                    { label: 'Fabric', value: jc.items?.[0]?.specifications?.fabric || jc.items?.[0]?.specifications?.fabrics?.[0] },
                                    { label: 'Material', value: jc.items?.[0]?.specifications?.material },
                                    { label: 'Finish', value: jc.items?.[0]?.specifications?.finish },
                                    { label: 'Hardware', value: jc.items?.[0]?.specifications?.hardware },
                                ].map((spec, i) => spec.value && (
                                    <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">{spec.label}</p>
                                        <p className="text-sm font-bold text-white/80">{spec.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Production Notes */}
                            {jc.items?.[0]?.specifications?.notes && (
                                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-2">Special Instructions</p>
                                    <p className="text-xs font-medium text-white/60 leading-relaxed italic">
                                        "{jc.items[0].specifications.notes}"
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white/5 border-t border-white/5 mt-auto">
                            <Button 
                                className="w-full h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-xs transition-all"
                                onClick={onClose}
                            >
                                Close Details
                            </Button>
                        </div>
                    </div>
                ) }
            </motion.div>
        </motion.div>
    );
}

// ── POD Upload Modal ──────────────────────────────────────────────────────────

function PODUploadModal({ onClose, onComplete, title, isUploading, jobCards }: { 
    onClose: () => void, 
    onComplete: (files: File[]) => void, 
    title: string, 
    isUploading: boolean,
    jobCards: Array<{ _id: string; title: string; jobCardNumber: string; photo?: string }>
}) {
    const [itemPhotos, setItemPhotos] = useState<Record<string, { file: File, preview: string }>>({});
    const [activeItemId, setActiveItemId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!activeItemId) return;

        const file = e.target.files?.[0];
        if (file) {
            // Revoke old preview if exists
            if (itemPhotos[activeItemId]) {
                URL.revokeObjectURL(itemPhotos[activeItemId].preview);
            }

            const preview = URL.createObjectURL(file);
            setItemPhotos(prev => ({
                ...prev,
                [activeItemId]: { file, preview }
            }));
        }
        setActiveItemId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const triggerCapture = (id: string) => {
        setActiveItemId(id);
        fileInputRef.current?.click();
    };

    const removePhoto = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (itemPhotos[id]) {
            URL.revokeObjectURL(itemPhotos[id].preview);
            const next = { ...itemPhotos };
            delete next[id];
            setItemPhotos(next);
        }
    };

    useEffect(() => {
        return () => {
            Object.values(itemPhotos).forEach(p => URL.revokeObjectURL(p.preview));
        };
    }, [itemPhotos]);

    const handleConfirm = async () => {
        const files = Object.values(itemPhotos).map(p => p.file);
        if (files.length !== jobCards.length) {
            toast.error(`Please capture photos for all ${jobCards.length} items`);
            return;
        }
        onComplete(files);
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-[#0a0a0b] flex flex-col md:p-12 items-center justify-center p-0"
        >
            <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-lg bg-[#0a0a0b] md:bg-[#1a1a1c] md:border md:border-white/10 md:rounded-[3rem] flex flex-col md:shadow-2xl overflow-hidden relative">
                <div className="p-6 shrink-0 flex items-center justify-between border-b border-white/5">
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Capture Proof</h4>
                        <p className="text-sm font-bold text-white max-w-[280px] truncate">{title}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-xl bg-white/5" onClick={onClose} disabled={isUploading}>
                        <X className="size-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-3 mb-2">
                        <AlertCircle className="size-5 text-emerald-500 shrink-0" />
                        <p className="text-[11px] font-bold text-white/60 leading-relaxed uppercase tracking-wide">
                            One photo per product required. <span className="text-emerald-400">Capture {jobCards.length} unique proofs.</span>
                        </p>
                    </div>

                    {jobCards.map((jc) => {
                        const hasPhoto = !!itemPhotos[jc._id];
                        return (
                            <div key={jc._id} className={cn(
                                "p-4 rounded-[2rem] border transition-all flex items-center gap-4",
                                hasPhoto ? "bg-emerald-500/10 border-emerald-500/50" : "bg-white/5 border-white/5"
                            )}>
                                {/* Design Reference */}
                                <div className="size-14 rounded-2xl bg-black border border-white/10 overflow-hidden shrink-0">
                                    {jc.photo ? (
                                        <img src={jc.photo} className="size-full object-cover opacity-50" alt={jc.title} />
                                    ) : (
                                        <div className="size-full flex items-center justify-center opacity-20">
                                            <Package className="size-5" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-white/90 truncate">{jc.title}</p>
                                    <p className="text-[10px] font-mono text-white/30 truncate">{jc.jobCardNumber}</p>
                                </div>

                                {/* Capture Action */}
                                <div className="shrink-0">
                                    {hasPhoto ? (
                                        <div className="relative group">
                                            <div className="size-14 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg shadow-emerald-500/20">
                                                <img src={itemPhotos[jc._id].preview} className="size-full object-cover" alt="POD" />
                                            </div>
                                            <button 
                                                onClick={(e) => removePhoto(jc._id, e)}
                                                className="absolute -top-2 -right-2 size-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <Button 
                                            size="icon" 
                                            className="size-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/10 active:scale-95 transition-all"
                                            onClick={() => triggerCapture(jc._id)}
                                            disabled={isUploading}
                                        >
                                            <Camera className="size-6" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-6 border-t border-white/5 bg-white/2px">
                    <Button 
                        className="w-full h-16 rounded-[2rem] bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-20 translate-z-0"
                        onClick={handleConfirm}
                        disabled={Object.keys(itemPhotos).length !== jobCards.length || isUploading}
                    >
                        {isUploading ? (
                            <div className="flex items-center gap-3">
                                <Loader2 className="size-5 animate-spin" />
                                <span>Uploading Proofs...</span>
                            </div>
                        ) : (
                            `Complete Delivery (${Object.keys(itemPhotos).length}/${jobCards.length})`
                        )}
                    </Button>
                </div>
            </div>

            <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                capture="environment"
                className="hidden" 
                onChange={handleFileChange}
            />
        </motion.div>
    );
}

// ── POD Upload Modal Legacy (REMOVE) ──────────────────────────────────────────────────────────
