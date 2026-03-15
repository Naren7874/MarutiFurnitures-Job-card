import { useAuthStore } from '../stores/authStore';
import {
    Building2, Globe, Phone, Mail, MapPin,
    Instagram, Youtube, Facebook, MessageSquare,
    CheckCircle2, Loader2, Landmark, Hash, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function CompanyProfilePage() {
    const { user, company, setCompany } = useAuthStore();
    const qc = useQueryClient();
    const companyId = company?.id || user?.companyId;

    const { data: fullCompany, isLoading } = useQuery({
        queryKey: ['company-detail', companyId],
        queryFn: () => api.get(`/companies/${companyId}`).then(r => r.data.data),
        enabled: !!companyId,
    });

    const updateCompanyMut = useMutation({
        mutationFn: (data: any) => api.put(`/companies/${companyId}`, data),
        onSuccess: (res) => {
            const raw = res.data.data;
            const mapped = { 
                ...raw, 
                id: raw._id || raw.id 
            };
            qc.invalidateQueries({ queryKey: ['company-detail', companyId] });
            setCompany(mapped); // This keeps auth store in sync
            toast.success('Company profile updated successfully');
        },
        onError: () => toast.error('Failed to update company profile'),
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const rawData = Object.fromEntries(formData.entries());

        const data: any = {
            name: rawData.name,
            email: rawData.email,
            phone: rawData.phone,
            website: rawData.website,
            gstin: rawData.gstin,
            quotationPrefix: rawData.quotationPrefix,
            jobCardPrefix: rawData.jobCardPrefix,
            invoicePrefix: rawData.invoicePrefix,
            projectPrefix: rawData.projectPrefix,
            address: {
                line1: rawData.addressLine1,
                line2: rawData.addressLine2,
                city: rawData.addressCity,
                state: rawData.addressState,
                pincode: rawData.addressPincode,
            },
            bankDetails: {
                bankName: rawData.bankName,
                accountName: rawData.accountName,
                accountNumber: rawData.accountNumber,
                ifsc: rawData.ifsc,
                branch: rawData.branch,
            },
            socialLinks: {
                instagram: rawData.instagram,
                facebook: rawData.facebook,
                youtube: rawData.youtube,
                whatsapp: rawData.whatsapp,
            }
        };

        updateCompanyMut.mutate(data);
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-10">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-foreground text-3xl font-black tracking-tight mb-2">Company Configuration</h1>
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                        <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase opacity-70">
                            Branding, Contact & Professional Identity
                        </p>
                    </div>
                </div>
            </motion.div>

            <form key={fullCompany?._id || 'loading'} onSubmit={handleSubmit} className="space-y-8">
                {/* Branding & Essentials */}
                <Card className="border-border bg-card shadow-xl rounded-3xl overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-6 border-b border-border/40">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Building2 className="text-primary size-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black tracking-tight">Core Branding</CardTitle>
                                <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Primary identity & logo</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-[0.2em] block">Company Name</label>
                                <input name="name" defaultValue={fullCompany?.name} required className="w-full bg-muted/20 border border-border/40 p-4 rounded-2xl text-foreground font-black tracking-tight focus:outline-none focus:ring-2 ring-primary/20" />
                            </div>
                            <div className="space-y-4 text-center md:text-left">
                                <label className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-[0.2em] block">Brand Logo</label>
                                <div className="flex items-center gap-6">
                                    <div className="size-20 rounded-2xl bg-white border border-border/60 flex items-center justify-center overflow-hidden p-2 shadow-inner">
                                        {fullCompany?.logo ? (
                                            <img src={fullCompany.logo} className="size-full object-contain" />
                                        ) : (
                                            <ImageIcon className="size-8 text-muted-foreground/20" />
                                        )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground/60 font-medium max-w-[150px]">
                                        Logo used in headers & reports. Currently supports <b>Cloudinary</b> updates.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact & Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="border-border bg-card shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-6 border-b border-border/40">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <Phone className="text-primary size-5" />
                                </div>
                                <CardTitle className="text-lg font-black tracking-tight">Contact Channels</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 ml-1">Official Email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                                    <input name="email" type="email" defaultValue={fullCompany?.email} className="w-full bg-muted/20 border border-border/40 p-4 pl-12 rounded-2xl text-foreground font-bold focus:outline-none focus:ring-2 ring-primary/20" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 ml-1">Contact Number</label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                                    <input name="phone" defaultValue={fullCompany?.phone} className="w-full bg-muted/20 border border-border/40 p-4 pl-12 rounded-2xl text-foreground font-bold focus:outline-none focus:ring-2 ring-primary/20" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 ml-1">Website URL</label>
                                <div className="relative">
                                    <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                                    <input name="website" defaultValue={fullCompany?.website} placeholder="https://..." className="w-full bg-muted/20 border border-border/40 p-4 pl-12 rounded-2xl text-foreground font-bold focus:outline-none focus:ring-2 ring-primary/20" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-6 border-b border-border/40">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <MapPin className="text-primary size-5" />
                                </div>
                                <CardTitle className="text-lg font-black tracking-tight">Physical Address</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-4">
                            <input name="addressLine1" placeholder="Address Line 1" defaultValue={fullCompany?.address?.line1} className="w-full bg-muted/20 border border-border/40 p-3 rounded-xl text-foreground font-medium focus:ring-2 ring-primary/20" />
                            <input name="addressLine2" placeholder="Address Line 2 (Optional)" defaultValue={fullCompany?.address?.line2} className="w-full bg-muted/20 border border-border/40 p-3 rounded-xl text-foreground font-medium focus:ring-2 ring-primary/20" />
                            <div className="grid grid-cols-2 gap-4">
                                <input name="addressCity" placeholder="City" defaultValue={fullCompany?.address?.city} className="w-full bg-muted/20 border border-border/40 p-3 rounded-xl text-foreground font-medium focus:ring-2 ring-primary/20" />
                                <input name="addressState" placeholder="State" defaultValue={fullCompany?.address?.state} className="w-full bg-muted/20 border border-border/40 p-3 rounded-xl text-foreground font-medium focus:ring-2 ring-primary/20" />
                            </div>
                            <input name="addressPincode" placeholder="Pincode" defaultValue={fullCompany?.address?.pincode} className="w-full bg-muted/20 border border-border/40 p-3 rounded-xl text-foreground font-medium focus:ring-2 ring-primary/20" />
                        </CardContent>
                    </Card>
                </div>

                {/* Social Links */}
                <Card className="border-border bg-card shadow-xl rounded-3xl overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-6 border-b border-border/40">
                        <div className="flex items-center gap-4">
                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <MessageSquare className="text-primary size-5" />
                            </div>
                            <CardTitle className="text-lg font-black tracking-tight">Social Presence</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-pink-500 tracking-widest ml-1"><Instagram size={12} /> Instagram</label>
                            <input name="instagram" defaultValue={fullCompany?.socialLinks?.instagram} placeholder="Username or Link" className="w-full bg-pink-500/5 border border-pink-500/10 p-4 rounded-2xl text-foreground font-bold focus:ring-2 ring-pink-500/20" />
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-red-500 tracking-widest ml-1"><Youtube size={12} /> YouTube</label>
                            <input name="youtube" defaultValue={fullCompany?.socialLinks?.youtube} placeholder="Channel Link" className="w-full bg-red-500/5 border border-red-500/10 p-4 rounded-2xl text-foreground font-bold focus:ring-2 ring-red-500/20" />
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-500 tracking-widest ml-1"><Facebook size={12} /> Facebook</label>
                            <input name="facebook" defaultValue={fullCompany?.socialLinks?.facebook} placeholder="Page Link" className="w-full bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl text-foreground font-bold focus:ring-2 ring-blue-500/20" />
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-500 tracking-widest ml-1"><MessageSquare size={12} /> WhatsApp</label>
                            <input name="whatsapp" defaultValue={fullCompany?.socialLinks?.whatsapp} placeholder="Number or wa.me" className="w-full bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl text-foreground font-bold focus:ring-2 ring-emerald-500/20" />
                        </div>
                    </CardContent>
                </Card>

                {/* Banking & GST */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="border-border bg-card shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-6 border-b border-border/40">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <Landmark className="text-primary size-5" />
                                </div>
                                <CardTitle className="text-lg font-black tracking-tight">Banking Details</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-muted-foreground/60 uppercase ml-1">Bank Name</label>
                                    <input name="bankName" defaultValue={fullCompany?.bankDetails?.bankName} className="w-full bg-muted/20 border border-border/40 p-3 rounded-xl text-foreground font-bold focus:ring-2 ring-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-muted-foreground/60 uppercase ml-1">IFSC Code</label>
                                    <input name="ifsc" defaultValue={fullCompany?.bankDetails?.ifsc} className="w-full bg-muted/20 border border-border/40 p-3 rounded-xl text-foreground font-black uppercase focus:ring-2 ring-primary/20" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground/60 uppercase ml-1">Account Name</label>
                                <input name="accountName" defaultValue={fullCompany?.bankDetails?.accountName} className="w-full bg-muted/20 border border-border/40 p-3 rounded-xl text-foreground font-bold focus:ring-2 ring-primary/20" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground/60 uppercase ml-1">Account Number</label>
                                <input name="accountNumber" defaultValue={fullCompany?.bankDetails?.accountNumber} className="w-full bg-muted/20 border border-border/40 p-3 rounded-xl text-foreground font-black tracking-wider focus:ring-2 ring-primary/20" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground/60 uppercase ml-1">Branch</label>
                                <input name="branch" defaultValue={fullCompany?.bankDetails?.branch} className="w-full bg-muted/20 border border-border/40 p-3 rounded-xl text-foreground font-medium focus:ring-2 ring-primary/20" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-6 border-b border-border/40">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <Hash className="text-primary size-5" />
                                </div>
                                <CardTitle className="text-lg font-black tracking-tight">Tax & Document Prefixes</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground/40 ml-1">GSTIN</label>
                                <input name="gstin" defaultValue={fullCompany?.gstin} className="w-full bg-muted/20 border border-border/40 p-4 rounded-2xl text-foreground font-black uppercase tracking-widest focus:ring-2 ring-primary/20" />
                            </div>
                            <Separator className="bg-border/20" />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-muted-foreground/60 uppercase ml-1">Quotation SQ</label>
                                    <input name="quotationPrefix" defaultValue={fullCompany?.quotationPrefix} className="w-full bg-muted/20 border border-border/40 p-3 rounded-xl text-center font-black focus:ring-2 ring-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-muted-foreground/60 uppercase ml-1">Job Card SQ</label>
                                    <input name="jobCardPrefix" defaultValue={fullCompany?.jobCardPrefix} className="w-full bg-muted/20 border border-border/40 p-3 rounded-xl text-center font-black focus:ring-2 ring-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-muted-foreground/60 uppercase ml-1">Invoice SQ</label>
                                    <input name="invoicePrefix" defaultValue={fullCompany?.invoicePrefix} className="w-full bg-muted/20 border border-border/40 p-3 rounded-xl text-center font-black focus:ring-2 ring-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-muted-foreground/60 uppercase ml-1">Project SQ</label>
                                    <input name="projectPrefix" defaultValue={fullCompany?.projectPrefix} className="w-full bg-muted/20 border border-border/40 p-3 rounded-xl text-center font-black focus:ring-2 ring-primary/20" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end pt-6">
                    <Button
                        type="submit"
                        disabled={updateCompanyMut.isPending}
                        className="rounded-2xl h-14 px-12 font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {updateCompanyMut.isPending ? <Loader2 className="size-5 animate-spin mr-3" /> : <CheckCircle2 className="size-5 mr-3" />}
                        Update Company Profile
                    </Button>
                </div>
            </form>
        </div>
    );
}
