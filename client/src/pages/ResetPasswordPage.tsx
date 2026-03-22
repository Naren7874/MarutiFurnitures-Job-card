import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, ShieldCheck, Lock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiPost } from '../lib/axios';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { FullPageBackground } from '../components/shared/FullPageBackground';

const schema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6 } }
};

export default function ResetPasswordPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [isSuccess, setIsSuccess] = useState(false);
    const [apiError, setApiError] = useState('');

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (values: FormValues) => {
        setApiError('');
        try {
            await apiPost(`/auth/reset-password/${token}`, { password: values.password });
            setIsSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setApiError(err?.response?.data?.message || 'Invalid or expired token.');
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center relative overflow-hidden selection:bg-primary/30 font-sans">
                <FullPageBackground />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full mx-4 text-center z-10"
                >
                    <Card className="glass-dark border border-white/10 rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] backdrop-blur-3xl p-12 relative overflow-hidden">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto text-emerald-500 mb-8 shadow-inner border border-emerald-500/20">
                            <CheckCircle2 size={40} className="animate-pulse" />
                        </div>
                        <h1 className="text-white text-3xl font-black tracking-tight mb-4">Identity Secured</h1>
                        <p className="text-white/50 text-base font-medium mb-10 leading-relaxed">
                            Your vault key has been successfully rotated. Redirecting to the secure terminal...
                        </p>
                        <Link to="/login" className="inline-flex items-center gap-3 text-primary hover:text-primary/80 transition-all font-black uppercase text-xs tracking-[0.3em] bg-white/5 px-6 py-3 rounded-full border border-white/5 hover:border-white/10">
                            Sign In Now
                        </Link>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden selection:bg-primary/30 font-sans transition-colors duration-500">
            <FullPageBackground />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative w-full max-w-lg mx-4 z-10 flex flex-col items-center"
            >
                {/* ── Brand Header (Adaptive) ────────────────────────── */}
                <motion.div variants={itemVariants} className="flex flex-col items-center mb-8 text-center transition-colors duration-500">
                    <h1 className="text-neutral-900 dark:text-white font-black text-6xl tracking-tight mb-3 drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] transition-colors duration-500">Maruti Furniture</h1>
                    <div className="flex items-center gap-4">
                        <div className="h-px w-12 bg-neutral-900/10 dark:bg-white/20 transition-colors duration-500" />
                        <p className="text-primary font-black text-xs uppercase tracking-[0.5em] drop-shadow-md">Elite Management Suite</p>
                        <div className="h-px w-12 bg-neutral-900/10 dark:bg-white/20 transition-colors duration-500" />
                    </div>
                </motion.div>

                {/* ── Login Card (Adaptive Glass) ────────────────────── */}
                <motion.div variants={itemVariants} className="w-full">
                    <Card className="glass dark:glass-dark border border-neutral-200 dark:border-white/10 rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] backdrop-blur-3xl relative overflow-hidden p-0 ring-1 ring-neutral-200 dark:ring-white/10 group/card transition-all duration-500">
                        <div className="absolute inset-0 rounded-[40px] border border-neutral-900/5 dark:border-white/5 pointer-events-none z-20 group-hover/card:border-neutral-900/10 dark:group-hover/card:border-white/20 transition-colors duration-500" />
                        <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-linear-to-br from-neutral-400/5 via-transparent to-transparent dark:from-white/10 pointer-events-none rotate-12 transition-transform duration-1000 group-hover/card:scale-110" />
                        
                        <CardHeader className="p-10 md:p-12 pb-0 text-center relative z-20">
                            <CardTitle className="text-neutral-900 dark:text-white text-3xl font-black tracking-tight mb-2 drop-shadow-sm transition-colors duration-500">Vault Rotation</CardTitle>
                            <CardDescription className="text-neutral-500 dark:text-white/40 text-sm font-medium leading-relaxed max-w-[280px] mx-auto transition-colors duration-500">Establish a new high-security password for your workstation access.</CardDescription>
                        </CardHeader>

                        <CardContent className="p-10 md:p-12 pt-8 relative z-20">
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="space-y-5">
                                    {/* New Password */}
                                    <motion.div variants={itemVariants} className="space-y-2.5">
                                        <Label className="text-neutral-500 dark:text-white/40 text-[9px] font-black uppercase tracking-[.2em] px-3 flex justify-between items-center bg-neutral-900/5 dark:bg-white/5 py-1 rounded-full w-fit border border-neutral-900/5 dark:border-white/5 transition-colors duration-500">
                                            <span className="px-1 text-primary">New Vault Key</span>
                                        </Label>
                                        <div className="relative group">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-white/20 group-focus-within:text-primary transition-all z-10">
                                                <Lock size={20} />
                                            </div>
                                            <Input
                                                {...register('password')}
                                                type="password"
                                                placeholder="••••••••"
                                                className="bg-neutral-900/5 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white h-14 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all font-semibold pl-14 pr-4 placeholder:text-neutral-400 dark:placeholder:text-white/10 text-base group-focus-within:bg-neutral-900/8 dark:group-focus-within:bg-white/10"
                                            />
                                        </div>
                                        {errors.password && <p className="text-primary text-[10px] font-bold px-2 uppercase tracking-wider">! {errors.password.message}</p>}
                                    </motion.div>

                                    {/* Confirm Password */}
                                    <motion.div variants={itemVariants} className="space-y-2.5">
                                        <Label className="text-neutral-500 dark:text-white/40 text-[9px] font-black uppercase tracking-[.2em] px-3 flex justify-between items-center bg-neutral-900/5 dark:bg-white/5 py-1 rounded-full w-fit border border-neutral-900/5 dark:border-white/5 transition-colors duration-500">
                                            <span className="px-1 text-primary">Confirm Rotation</span>
                                        </Label>
                                        <div className="relative group">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-white/20 group-focus-within:text-primary transition-all z-10">
                                                <ShieldCheck size={20} />
                                            </div>
                                            <Input
                                                {...register('confirmPassword')}
                                                type="password"
                                                placeholder="••••••••"
                                                className="bg-neutral-900/5 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white h-14 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all font-semibold pl-14 pr-4 placeholder:text-neutral-400 dark:placeholder:text-white/10 text-base group-focus-within:bg-neutral-900/8 dark:group-focus-within:bg-white/10"
                                            />
                                        </div>
                                        {errors.confirmPassword && <p className="text-primary text-[10px] font-bold px-2 uppercase tracking-wider">! {errors.confirmPassword.message}</p>}
                                    </motion.div>
                                </div>

                                <AnimatePresence mode="wait">
                                    {apiError && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-primary text-[11px] font-black flex items-center gap-3 shadow-lg"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping shrink-0" />
                                            <p className="uppercase tracking-wider">{apiError}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <motion.div variants={itemVariants}>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full bg-primary text-primary-foreground h-16 rounded-2xl font-black text-xl shadow-[0_20px_50px_-10px_rgba(143,251,3,0.4)] hover:shadow-[0_25px_60px_-12px_rgba(143,251,3,0.6)] hover:scale-[1.01] active:scale-95 transition-all group overflow-hidden relative border-none"
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-3">
                                            {isSubmitting ? (
                                                <><Loader2 className="animate-spin" size={24} /> Securing...</>
                                            ) : (
                                                <>Securely Update Password <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform duration-500" /></>
                                            )}
                                        </span>
                                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                    </Button>
                                </motion.div>
                            </form>
                        </CardContent>

                        <CardFooter className="p-10 md:p-12 pt-0 flex flex-col items-center relative z-20">
                            <div className="w-full h-px bg-neutral-900/5 dark:bg-white/10 mb-8 transition-colors duration-500" />
                            <Link to="/login" title="Return to login" className="text-neutral-400 dark:text-white/30 hover:text-primary dark:hover:text-primary text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center gap-4 hover:gap-6 px-5 py-2.5 rounded-full hover:bg-neutral-900/5 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/5 hover:border-neutral-900/10 dark:hover:border-white/20 shadow-sm">
                                <ArrowLeft size={16} className="opacity-50" /> Back to Sign In
                            </Link>
                        </CardFooter>
                    </Card>
                </motion.div>

                {/* ── Security Badge ─────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ delay: 1.5 }}
                    className="mt-12 flex items-center gap-5 text-[10px] font-black text-neutral-400 dark:text-white/40 uppercase tracking-[0.6em] transition-colors duration-500"
                >
                    <div className="h-px w-10 bg-linear-to-r from-transparent to-neutral-900/10 dark:to-white/20 transition-colors duration-500" />
                    <span className="flex items-center gap-2 drop-shadow-lg animate-pulse transition-all">
                        <Lock size={10} /> Secure Key Rotation
                    </span>
                    <div className="h-px w-10 bg-linear-to-l from-transparent to-neutral-900/10 dark:to-white/20 transition-colors duration-500" />
                </motion.div>
            </motion.div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 1.5s infinite linear;
                }
                .font-sans { font-family: 'NeueHaasDisplay', system-ui, sans-serif; }
            ` }} />
        </div>
    );
}
