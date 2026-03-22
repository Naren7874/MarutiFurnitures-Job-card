import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { motion } from "motion/react"
import { PieChart as PieIcon } from "lucide-react"

interface StatusDistributionProps {
    data: { status: string; count: number; color?: string }[]
}

const STATUS_COLORS = ['#3B82F6', '#F59E0B', '#F97316', '#8B5CF6', '#10B981', '#06B6D4', '#1E293B']


export function StatusDistribution({ data }: StatusDistributionProps) {
    const total = data.reduce((acc, curr) => acc + curr.count, 0)
    const topStage = data.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), data[0] || { status: '', count: 0 })
    const [activeItem, setActiveItem] = useState<{ status: string, count: number } | null>(null)

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
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 transition-all duration-300">
                        {activeItem ? (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center"
                            >
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                                    {activeItem.status.replace(/_/g, ' ')}
                                </div>
                                <div className="text-3xl font-bold text-foreground">
                                    {activeItem.count}
                                </div>
                                <div className="text-[9px] font-medium text-muted-foreground mt-1 tracking-wider uppercase">
                                    Job Cards
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center"
                            >
                                <div className="text-3xl font-bold text-foreground">{total}</div>
                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Total</div>
                            </motion.div>
                        )}
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
                                animationDuration={1000}
                                stroke="none"
                                onMouseEnter={(_, index) => {
                                    if (data[index]) {
                                        setActiveItem(data[index])
                                    }
                                }}
                                onMouseLeave={() => setActiveItem(null)}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color || STATUS_COLORS[index % STATUS_COLORS.length]}
                                        className="cursor-pointer outline-none transition-opacity"
                                    />
                                ))}
                            </Pie>
                            {/* Disabled default tooltip to use center label instead */}
                            {/* <Tooltip content={<CustomTooltip />} /> */}
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
                                    <span className="text-xs text-muted-foreground font-semibold truncate uppercase tracking-tighter">
                                        {item.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
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
                        <div className="font-bold text-sm text-foreground mt-0.5 uppercase tracking-tighter">
                            {topStage.status.replace(/_/g, ' ')} 
                            <span className="text-muted-foreground font-normal normal-case tracking-normal">— {topStage.count} jobs</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
