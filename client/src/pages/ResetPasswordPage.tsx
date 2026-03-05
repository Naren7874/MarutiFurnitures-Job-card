import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Building2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiPost } from '../lib/axios';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

const schema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

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
            <div className="min-h-screen flex items-center justify-center bg-background p-4 text-foreground relative overflow-hidden">
                <div className="max-w-md w-full text-center space-y-8 relative z-10">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto text-emerald-500 mb-2 shadow-inner border border-emerald-500/20">
                        <CheckCircle2 size={40} />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight">Security Updated!</h1>
                    <p className="text-muted-foreground font-medium">
                        Your password has been successfully updated. Redirecting to login...
                    </p>
                    <Link to="/login" className="text-primary hover:underline transition-all font-black uppercase text-xs tracking-widest">
                        Click here if not redirected
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/2 pointer-events-none" />

            <div className="relative w-full max-w-md">
                <div className="bg-card border border-border rounded-3xl p-10 shadow-2xl backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary/50 via-primary to-primary/50" />
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                            <Building2 className="text-primary-foreground" size={24} />
                        </div>
                        <h1 className="text-foreground font-black text-2xl tracking-tighter">Maruti Furniture</h1>
                    </div>

                    <h2 className="text-foreground text-3xl font-black mb-2">Set New Password</h2>
                    <p className="text-muted-foreground text-sm font-medium mb-10">
                        Almost done! Choose a strong password for your account.
                    </p>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">New Password</Label>
                            <Input
                                {...register('password')}
                                type="password"
                                placeholder="••••••••"
                                className="bg-muted/50 border-border text-foreground h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            />
                            {errors.password && <p className="text-destructive text-xs mt-1 font-bold">{errors.password.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">Confirm Password</Label>
                            <Input
                                {...register('confirmPassword')}
                                type="password"
                                placeholder="••••••••"
                                className="bg-muted/50 border-border text-foreground h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            />
                            {errors.confirmPassword && <p className="text-destructive text-xs mt-1 font-bold">{errors.confirmPassword.message}</p>}
                        </div>

                        {apiError && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-destructive text-sm font-bold flex items-center gap-2">
                                <AlertCircle size={18} /> {apiError}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold text-base shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Securely Reset Password'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
