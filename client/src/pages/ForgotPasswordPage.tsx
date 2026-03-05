import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import { Building2, ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { apiPost } from '../lib/axios';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

const schema = z.object({
    email: z.string().email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
    const [isSent, setIsSent] = useState(false);
    const [apiError, setApiError] = useState('');

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (values: FormValues) => {
        setApiError('');
        try {
            await apiPost('/auth/forgot-password', values);
            setIsSent(true);
        } catch (err: any) {
            setApiError(err?.response?.data?.message || 'Something went wrong. Try again later.');
        }
    };

    if (isSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4 text-foreground relative overflow-hidden">
                <div className="max-w-md w-full text-center space-y-8 relative z-10">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary mb-2 shadow-inner border border-primary/20">
                        <MailCheck size={40} />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight">Check your email</h1>
                    <p className="text-muted-foreground font-medium">
                        If an account exists for that email, we've sent instructions to reset your password.
                    </p>
                    <Link to="/login" className="inline-flex items-center gap-2 text-primary hover:underline transition-all font-black uppercase text-xs tracking-widest">
                        <ArrowLeft size={16} /> Back to Secure Login
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

                    <h2 className="text-foreground text-3xl font-black mb-2">Forgot Password?</h2>
                    <p className="text-muted-foreground text-sm font-medium mb-10">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">Email Address</Label>
                            <Input
                                {...register('email')}
                                type="email"
                                placeholder="name@company.com"
                                className="bg-muted/50 border-border text-foreground h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            />
                            {errors.email && <p className="text-destructive text-xs mt-1 font-bold">{errors.email.message}</p>}
                        </div>

                        {apiError && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-destructive text-sm font-bold flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                                {apiError}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold text-base shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Send Reset Link'}
                        </Button>

                        <div className="text-center pt-6 mt-4 border-t border-border/40">
                            <Link to="/login" className="text-muted-foreground hover:text-primary text-xs font-black uppercase tracking-widest transition-all inline-flex items-center gap-2">
                                <ArrowLeft size={14} /> Back to Sign In
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
