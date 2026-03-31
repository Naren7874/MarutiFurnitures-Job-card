import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { apiPost } from '../lib/axios';
import { useAuthStore } from '../stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Mail, Lock } from 'lucide-react';

// ── Schema ────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

// ── Components ────────────────────────────────────────────────────────────────

import { FullPageBackground } from '../components/shared/FullPageBackground';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
    visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.8, ease: "easeOut" }
    }
};

export default function LoginPage() {
    const navigate = useNavigate();
    const { setAuth, setCompany } = useAuthStore();
    const [showPass, setShowPass] = useState(false);
    const [apiError, setApiError] = useState('');

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    const onSubmit = async (values: LoginForm) => {
        setApiError('');
        try {
            const res: any = await apiPost('/auth/login', values);
            setAuth(res.token, res.user, res.allCompanies ?? []);
            if (res.company) setCompany(res.company);
            navigate('/', { replace: true });
        } catch (err: any) {
            setApiError(err?.response?.data?.message || 'Login failed. Check your credentials.');
        }
    };

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
                <motion.div variants={itemVariants} className="flex flex-col items-center mb-8 text-center">
                    <h1 className="text-neutral-900 dark:text-white font-black text-6xl tracking-tight mb-3 drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] transition-colors duration-500">Maruti Furniture</h1>
                    <div className="flex items-center gap-4">
                        <div className="h-px w-12 bg-neutral-900/10 dark:bg-white/20 transition-colors duration-500" />
                        <p className="text-primary font-black text-xs uppercase tracking-[0.5em] drop-shadow-sm">Elite Management Suite</p>
                        <div className="h-px w-12 bg-neutral-900/10 dark:bg-white/20 transition-colors duration-500" />
                    </div>
                </motion.div>

                {/* ── Login Card (Adaptive Glass) ────────────────────── */}
                <motion.div variants={itemVariants} className="w-full">
                    <Card className="glass dark:glass-dark border border-neutral-200 dark:border-white/10 rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] backdrop-blur-3xl relative overflow-hidden p-0 ring-1 ring-neutral-200 dark:ring-white/10 group/card transition-all duration-500">
                        {/* Animated Border Shimmer */}
                        <div className="absolute inset-0 rounded-[40px] border border-neutral-900/5 dark:border-white/5 pointer-events-none z-20 group-hover/card:border-neutral-900/10 dark:group-hover/card:border-white/20 transition-colors duration-500" />

                        {/* Interactive Glare / Shine */}
                        <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-linear-to-br from-neutral-400/5 via-transparent to-transparent dark:from-white/10 pointer-events-none rotate-12 transition-transform duration-1000 group-hover/card:scale-110" />

                        <CardHeader className="p-10 md:p-12 pb-0 text-center relative z-20">
                            <CardTitle className="text-neutral-900 dark:text-white text-3xl font-black tracking-tight mb-2 drop-shadow-sm transition-colors duration-500">Sign In</CardTitle>
                            <CardDescription className="text-neutral-500 dark:text-white/40 text-sm font-medium leading-relaxed max-w-[280px] mx-auto transition-colors duration-500">
                                Enter your email and password to continue</CardDescription>
                        </CardHeader>

                        <CardContent className="p-10 md:p-12 pt-8 relative z-20">
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="space-y-5">
                                    {/* Email */}
                                    <motion.div variants={itemVariants} className="space-y-2.5">
                                        <Label className="text-neutral-500 dark:text-white/40 text-[9px] font-black uppercase tracking-[.2em] px-3 flex justify-between items-center bg-neutral-900/5 dark:bg-white/5 py-1 rounded-full w-fit border border-neutral-900/5 dark:border-white/5 transition-colors duration-500">
                                            <span className="px-1 text-primary">Email Address</span>
                                        </Label>
                                        <div className="group relative">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-white/20 group-focus-within:text-primary transition-all z-10">
                                                <Mail size={20} />
                                            </div>
                                            <Input
                                                {...register('email')}
                                                type="email"
                                                placeholder="executive@maruti.com"
                                                autoCapitalize="none"
                                                autoCorrect="off"
                                                spellCheck="false"
                                                className="bg-neutral-900/5 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white h-14 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all font-semibold pl-14 pr-4 placeholder:text-neutral-400 dark:placeholder:text-white/10 text-base group-focus-within:bg-neutral-900/8 dark:group-focus-within:bg-white/10"
                                            />
                                        </div>
                                        {errors.email && <p className="text-primary text-[10px] font-bold px-2 uppercase tracking-wider">! {errors.email.message}</p>}
                                    </motion.div>

                                    {/* Password */}
                                    <motion.div variants={itemVariants} className="space-y-2.5">
                                        <Label className="text-neutral-500 dark:text-white/40 text-[9px] font-black uppercase tracking-[.2em] px-3 flex justify-between items-center bg-neutral-900/5 dark:bg-white/5 py-1 rounded-full w-fit border border-neutral-900/5 dark:border-white/5 transition-colors duration-500">
                                            <span className="px-1 text-primary">Password</span>
                                        </Label>
                                        <div className="relative group">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-white/20 group-focus-within:text-primary transition-all z-10">
                                                <Lock size={20} />
                                            </div>
                                            <Input
                                                {...register('password')}
                                                type={showPass ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                disableTitleCase
                                                autoCapitalize="none"
                                                autoCorrect="off"
                                                spellCheck="false"
                                                className="bg-neutral-900/5 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white h-14 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all font-semibold pl-14 pr-14 placeholder:text-neutral-400 dark:placeholder:text-white/10 text-base group-focus-within:bg-neutral-900/8 dark:group-focus-within:bg-white/10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPass(!showPass)}
                                                className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-white/20 hover:text-primary transition-colors cursor-pointer z-10 p-1"
                                            >
                                                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                        {errors.password && <p className="text-primary text-[10px] font-bold px-2 uppercase tracking-wider">! {errors.password.message}</p>}
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
                                                <><Loader2 className="animate-spin" size={24} /> Processing...</>
                                            ) : (
                                                <>Sign In<ArrowRight size={24} className="group-hover:translate-x-2 transition-transform duration-500" /></>
                                            )}
                                        </span>
                                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                    </Button>
                                </motion.div>
                            </form>
                        </CardContent>

                        <CardFooter className="p-10 md:p-12 pt-0 flex flex-col items-center relative z-20">
                            <div className="w-full h-px bg-neutral-900/5 dark:bg-white/10 mb-8 transition-colors duration-500" />
                            <Link to="/forgot-password" title="Recover account" className="text-neutral-400 dark:text-white/30 hover:text-primary dark:hover:text-primary text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center gap-4 hover:gap-6 px-5 py-2.5 rounded-full hover:bg-neutral-900/5 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/5 hover:border-neutral-900/10 dark:hover:border-white/20 shadow-sm">
                                <ShieldCheck size={16} className="opacity-50" /> Forgot Password?
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
                    <div className="h-px w-10 bg-linear-to-r from-transparent to-neutral-900/10 dark:to-white/20" />
                    <span className="flex items-center gap-2 drop-shadow-lg transition-all"><Lock size={10} /> Secure Portal</span>
                    <div className="h-px w-10 bg-linear-to-l from-transparent to-neutral-900/10 dark:to-white/20" />
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
                .h-18 { height: 4.5rem; }
                .font-sans { font-family: 'NeueHaasDisplay', system-ui, sans-serif; }
            ` }} />
        </div>
    );
}
