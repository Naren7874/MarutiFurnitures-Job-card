import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Building2, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiPost } from '../lib/axios';
import { useAuthStore } from '../stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ── Schema ────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

// ── Components ────────────────────────────────────────────────────────────────

const FloatingShape = ({ className, delay = 0 }: { className: string; delay?: number }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
            opacity: [0.1, 0.2, 0.1],
            scale: [1, 1.1, 1],
            y: [0, -20, 0]
        }}
        transition={{
            duration: 8,
            repeat: Infinity,
            delay,
            ease: "linear"
        }}
        className={className}
    />
);

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
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden selection:bg-primary/30">
            {/* ── Background Elements ──────────────────────────────── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />

                <FloatingShape className="absolute top-[20%] right-[15%] size-32 bg-primary/10 rounded-full blur-3xl" delay={0} />
                <FloatingShape className="absolute bottom-[25%] left-[10%] size-48 bg-primary/5 rounded-full blur-3xl" delay={2} />
            </div>

            <div className="relative w-full max-w-lg mx-4 z-10 flex flex-col items-center">
                {/* ── Brand Header ────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="flex flex-col items-center mb-10 text-center"
                >
                    <div className="relative group">
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-16 h-16 rounded-[22px] bg-linear-to-br from-primary via-primary to-blue-700 flex items-center justify-center shadow-2xl shadow-primary/40 mb-4 cursor-pointer"
                        >
                            <Building2 className="text-white" size={32} />
                        </motion.div>
                        <div className="absolute -inset-1 bg-primary/20 rounded-[24px] blur-lg group-hover:bg-primary/30 transition-all -z-10" />
                    </div>

                    <h1 className="text-foreground font-black text-4xl tracking-tighter mb-1">Maruti Furniture</h1>
                    <div className="flex items-center gap-2">
                        <div className="h-px w-8 bg-border" />
                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em]">Management Suite v2</p>
                        <div className="h-px w-8 bg-border" />
                    </div>
                </motion.div>

                {/* ── Login Card ──────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                    className="w-full bg-card/80 dark:bg-card/40 border border-border/50 rounded-[32px] p-8 md:p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] backdrop-blur-2xl relative overflow-hidden"
                >
                    {/* Top glass reflection */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/0 via-primary to-primary/0 opacity-50" />

                    <div className="mb-8">
                        <h2 className="text-foreground text-3xl font-black tracking-tight mb-2">Welcome Back</h2>
                        <p className="text-muted-foreground text-sm font-medium">Please enter your credentials to access the internal platform.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4">
                            {/* Email */}
                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.15em] px-1 flex justify-between">
                                    <span>Corporate Email</span>
                                    {errors.email && <span className="text-destructive lowercase tracking-normal">! {errors.email.message}</span>}
                                </Label>
                                <div className="group relative">
                                    <Input
                                        {...register('email')}
                                        type="email"
                                        placeholder="admin@maruti.com"
                                        className="bg-muted/30 border-border/60 text-foreground h-13 rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-semibold px-4 placeholder:text-muted-foreground/30"
                                    />
                                    <div className="absolute inset-0 rounded-2xl border border-primary/20 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity" />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.15em] px-1 flex justify-between">
                                    <span>Member Password</span>
                                    {errors.password && <span className="text-destructive lowercase tracking-normal">! {errors.password.message}</span>}
                                </Label>
                                <div className="relative group">
                                    <Input
                                        {...register('password')}
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        className="bg-muted/30 border-border/60 text-foreground h-13 rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-semibold px-4 pr-12 placeholder:text-muted-foreground/30"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-primary transition-colors cursor-pointer"
                                    >
                                        {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                    <div className="absolute inset-0 rounded-2xl border border-primary/20 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity" />
                                </div>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {apiError && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-destructive/10 border border-destructive/20 rounded-2xl px-4 py-3 text-destructive text-sm font-bold flex items-center gap-2"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse shrink-0" />
                                    <p>{apiError}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary text-primary-foreground h-14 rounded-2xl font-black text-lg shadow-[0_20px_40px_-10px_rgba(19,21,229,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(19,21,229,0.4)] hover:scale-[1.01] active:scale-95 transition-all group overflow-hidden relative"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {isSubmitting ? (
                                    <><Loader2 className="animate-spin" size={20} /> Verifying...</>
                                ) : (
                                    <>Sign In to Vault <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </span>
                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        </Button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-border/40 flex flex-col items-center gap-4">
                        <Link to="/forgot-password" title="Recover account" className="text-muted-foreground/60 hover:text-primary text-[10px] font-black uppercase tracking-[0.2em] transition-colors flex items-center gap-2">
                            <ShieldCheck size={14} className="opacity-50" /> Forgot credentials?
                        </Link>
                    </div>
                </motion.div>

                {/* ── Footer ──────────────────────────────────────────── */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ delay: 1 }}
                    className="mt-8 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
                >
                    Authorized Personnel Only — © 2024 MF Systems
                </motion.p>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 1.5s infinite;
                }
                .h-13 { height: 3.25rem; }
            ` }} />
        </div>
    );
}
