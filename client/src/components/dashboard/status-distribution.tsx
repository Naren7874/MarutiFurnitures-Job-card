import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { motion } from "motion/react"
import { PieChart as PieIcon } from "lucide-react"

interface StatusDistributionProps {
    data: { status: string; count: number; color?: string }[]
}

const STATUS_COLORS = ['#3B82F6', '#F59E0B', '#F97316', '#8B5CF6', '#10B981', '#06B6D4', '#1E293B']

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
    if (active && payload?.length) {
        return (
            <div className="px-3 py-2 rounded-xl bg-card border border-border shadow-lg text-xs font-semibold">
                <div className="text-foreground">{payload[0].name}</div>
                <div className="text-2xl font-bold text-foreground mt-1">{payload[0].value}</div>
                <div className="text-muted-foreground">job cards</div>
            </div>
        )
    }
    return null
}

export function StatusDistribution({ data }: StatusDistributionProps) {
    const total = data.reduce((acc, curr) => acc + curr.count, 0)
    const topStage = data.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), data[0] || { status: '', count: 0 })

    return (
        <Card className="flex flex-col border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between shrink-0 pb-2 pt-5 px-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet-500/10">
                        <PieIcon className="size-4 text-violet-500" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-bold">Job Card Status</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{total} total jobs</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 px-4 pb-4 pt-0">
                {/* Donut Chart */}
                <div className="h-[200px] w-full relative">
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                        <div className="text-2xl font-bold text-foreground">{total}</div>
                        <div className="text-xs text-muted-foreground font-medium">Total</div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={65}
                                outerRadius={88}
                                paddingAngle={3}
                                dataKey="count"
                                nameKey="status"
                                animationBegin={0}
                                animationDuration={1200}
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color || STATUS_COLORS[index % STATUS_COLORS.length]}
                                        className="cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="space-y-2 mt-2">
                    {data.map((item, index) => {
                        const color = item.color || STATUS_COLORS[index % STATUS_COLORS.length]
                        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
                        return (
                            <motion.div
                                key={item.status}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    <span className="text-xs text-muted-foreground font-medium truncate">{item.status}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                    </div>
                                    <span className="text-xs font-bold text-foreground w-4 text-right">{item.count}</span>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>

                {topStage && (
                    <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/60">
                        <div className="text-xs text-muted-foreground">Largest stage</div>
                        <div className="font-bold text-sm text-foreground mt-0.5">{topStage.status} <span className="text-muted-foreground font-normal">— {topStage.count} jobs</span></div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
