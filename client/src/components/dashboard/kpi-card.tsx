import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "motion/react"

interface KPICardProps {
    title: string
    value: string | number
    change?: number
    icon: LucideIcon
    prefix?: string
    suffix?: string
    className?: string
    accentColor?: string
    description?: string
}

function formatValue(value: string | number, prefix?: string, suffix?: string) {
    if (typeof value === 'number' && value >= 100000) {
        const lakhs = (value / 100000).toFixed(1)
        return `${prefix || ''}${lakhs}L${suffix || ''}`
    }
    return `${prefix || ''}${value}${suffix || ''}`
}

export function KPICard({ title, value, change, icon: Icon, prefix, suffix, className, accentColor, description }: KPICardProps) {
    const isPositive = (change ?? 0) >= 0
    const isNeutral = change === 0 || change === undefined

    return (
        <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
                "relative group rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow",
                className
            )}
        >
            {/* Top gradient accent line */}
            <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: accentColor ? `linear-gradient(90deg, transparent, ${accentColor}, transparent)` : 'linear-gradient(90deg, transparent, var(--primary), transparent)' }}
            />

            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div
                        className="p-2.5 rounded-xl"
                        style={{
                            backgroundColor: accentColor ? `${accentColor}18` : 'color-mix(in srgb, var(--primary) 12%, transparent)',
                        }}
                    >
                        <Icon
                            className="size-5"
                            style={{ color: accentColor || 'var(--primary)' }}
                        />
                    </div>
                    {!isNeutral && (
                        <div className={cn(
                            "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                            isPositive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                        )}>
                            {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                            {isPositive ? '+' : ''}{change}%
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <div className="text-3xl font-bold tracking-tight text-foreground">
                        {formatValue(value, prefix, suffix)}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">{title}</div>
                    {description && (
                        <div className="text-xs text-muted-foreground/60 pt-1">{description}</div>
                    )}
                </div>
            </div>

            {/* Bottom progress indicator */}
            <div className="h-1 w-full bg-muted">
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: accentColor || 'var(--primary)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(Math.abs(change ?? 50), 100)}%` }}
                    transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                />
            </div>
        </motion.div>
    )
}
