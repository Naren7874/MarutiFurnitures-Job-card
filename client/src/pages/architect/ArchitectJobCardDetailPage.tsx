import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, Maximize2, Fingerprint, Wind, Camera } from 'lucide-react';
import { useArchitectJobCardById } from '../../hooks/useApi';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { ImagePreview } from '@/components/ui/image-preview';

export default function ArchitectJobCardDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: raw, isLoading } = useArchitectJobCardById(id!);
    const jc: any = (raw as any)?.data ?? {};

    if (isLoading) {
        return (
            <div className="p-8 max-w-6xl mx-auto space-y-6">
                <Skeleton className="h-40 w-full rounded-[2.5rem]" />
                <Skeleton className="h-[500px] w-full rounded-[2.5rem]" />
            </div>
        );
    }

    if (!jc._id) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <Package size={48} className="text-muted-foreground/20 mb-4" />
                <h3 className="text-foreground text-xl font-black mb-2 tracking-tight">Job Card Not Found</h3>
                <Link to="/architect/jobcards">
                    <button className="text-primary text-sm font-bold mt-4 hover:underline">← Back to Job Cards</button>
                </Link>
            </div>
        );
    }

    const item = jc.items?.[0];

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/architect/jobcards')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-primary/10 hover:border-primary/30 transition text-muted-foreground hover:text-primary">
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <p className="text-primary text-xs md:text-sm font-black tracking-[0.2em] uppercase mb-1.5 opacity-80">{jc.jobCardNumber}</p>
                    <h1 className="text-foreground text-3xl md:text-4xl font-black tracking-tighter leading-none">
                        {jc.title}
                    </h1>
                    <p className="text-muted-foreground/70 text-sm md:text-base font-bold mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                         <span className="flex items-center gap-1.5">Project: <span className="text-foreground/80">{jc.projectId?.projectName || '—'}</span></span>
                         <span className="opacity-30 hidden sm:inline">/</span> 
                         <span className="flex items-center gap-1.5">Client: <span className="text-foreground/80">{jc.clientId?.name || '—'}</span></span>
                         {jc.quotationId && (
                             <>
                                 <span className="opacity-30 hidden sm:inline">/</span>
                                 <Link to={`/architect/quotations/${jc.quotationId._id || jc.quotationId}`} className="text-primary hover:underline flex items-center gap-1.5 font-black uppercase tracking-tight text-xs md:text-sm">
                                     Quotation: {jc.quotationId.quotationNumber || 'View Detail'}
                                 </Link>
                             </>
                         )}
                    </p>
                </div>
            </div>

            {/* Product Hero Block */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="bg-card dark:bg-card/20 backdrop-blur-xl border border-border/20 dark:border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col lg:flex-row shadow-xl min-h-[500px]"
            >
                {/* Visual Anchor (Left) */}
                <div className="lg:w-[40%] relative min-h-[400px] lg:h-auto overflow-hidden bg-muted/20 border-r border-border/10">
                    {item?.photo ? (
                        <div className="w-full h-full">
                            <ImagePreview src={item.photo} alt="Item Preview" />
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/10">
                            <Package size={100} strokeWidth={0.5} />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-3">No Main Photo</p>
                        </div>
                    )}
                </div>

                {/* Content Section (Right) */}
                <div className="lg:w-[60%] p-8 lg:p-12 flex flex-col">
                    <div className="mb-12">
                        <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-black uppercase tracking-widest mb-5 border border-primary/20 shadow-sm">
                            {item?.category || 'General Item'}
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter leading-tight mb-6 uppercase max-w-3xl">
                            {item?.description || jc.title}
                        </h2>
                        {item?.specifications?.notes && (
                            <div className="p-6 rounded-3xl bg-muted/10 border border-border/10 max-w-2xl shadow-inner">
                                <p className="text-muted-foreground text-sm font-bold leading-relaxed italic opacity-70">
                                    "{item.specifications.notes}"
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Technical Grid */}
                    <div className="mt-auto pt-8 border-t border-border/10 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Specs Column */}
                        <div className="grid grid-cols-2 gap-5 md:gap-6">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] pl-1">Dimensions</p>
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 shadow-sm">
                                    <Maximize2 size={16} className="text-blue-500" />
                                    <p className="text-base font-black text-foreground tracking-tight italic">{item?.specifications?.size || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] pl-1">Quantity</p>
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10 shadow-sm">
                                    <Package size={16} className="text-primary" />
                                    <p className="text-base font-black text-foreground uppercase tracking-tight">{item?.qty} {item?.unit || 'PCS'}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] pl-1">Material</p>
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 shadow-sm">
                                    <Fingerprint size={16} className="text-amber-600" />
                                    <p className="text-sm font-black text-foreground/80 uppercase tracking-tight leading-tight line-clamp-2">{item?.specifications?.material || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] pl-1">Finish</p>
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 shadow-sm">
                                    <Wind size={16} className="text-emerald-600" />
                                    <p className="text-sm font-black text-foreground/80 uppercase tracking-tight leading-tight line-clamp-2">{item?.specifications?.polish || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Fabric Column */}
                        <div className="space-y-5">
                            <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] pl-1 border-b border-border/10 pb-3">Technical Specification (Fabrics)</p>
                            <div className="flex flex-wrap gap-2.5">
                                {(item?.specifications?.fabrics?.length > 0) ? (
                                    item.specifications.fabrics.map((f: string, fi: number) => (
                                        <div key={fi} className="inline-flex items-center gap-2.5 bg-violet-500/5 border border-violet-500/20 px-4 py-2.5 rounded-xl text-xs font-black text-foreground/70 uppercase shadow-sm">
                                            <span className="text-violet-500/50">#{fi + 1}</span> {f}
                                        </div>
                                    ))
                                ) : item?.specifications?.fabric ? (
                                    <div className="inline-flex items-center bg-violet-500/5 border border-violet-500/20 px-4 py-2.5 rounded-xl text-xs font-black text-foreground/70 uppercase shadow-sm">
                                        {item.specifications.fabric}
                                    </div>
                                ) : (
                                    <p className="text-xs font-bold text-muted-foreground/30 italic uppercase py-3 pl-1">No fabric specifications defined</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Visual Archive Block */}
            {(item?.fabricPhoto || (item?.photos?.length > 0)) && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card dark:bg-card/20 backdrop-blur-xl border border-border/10 rounded-[2.5rem] p-8 md:p-12 shadow-sm"
                >
                    <div className="flex items-center gap-5 mb-12">
                        <div className="size-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-sm">
                            <Camera size={26} />
                        </div>
                        <div>
                            <h4 className="font-black text-lg uppercase tracking-widest text-foreground leading-none">Visual Archive</h4>
                            <p className="text-xs text-muted-foreground/60 font-bold uppercase tracking-widest mt-1.5">Technical Project References</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
                        {item.fabricPhoto && (
                            <div className="space-y-4">
                                <div className="aspect-4/5 rounded-[2.5rem] overflow-hidden border border-border/20 bg-muted/20 hover:border-primary/50 transition-all cursor-zoom-in shadow-2xl">
                                    <ImagePreview src={item.fabricPhoto} alt="Fabric Reference" />
                                </div>
                                <p className="text-center text-xs font-black uppercase tracking-widest text-muted-foreground/60">Fabric Selection</p>
                            </div>
                        )}
                        {item.photos?.map((url: string, i: number) => (
                            <div key={i} className="space-y-4">
                                <div className="aspect-4/5 rounded-[2.5rem] overflow-hidden border border-border/20 bg-muted/20 hover:border-primary/50 transition-all cursor-zoom-in shadow-2xl">
                                    <ImagePreview src={url} alt={`Reference ${i+1}`} />
                                </div>
                                <p className="text-center text-xs font-black uppercase tracking-widest text-muted-foreground/60">Reference Photo #{i+1}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
