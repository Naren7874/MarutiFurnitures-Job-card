import { useState, useMemo, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { format, isSameDay, parseISO } from "date-fns"
import { Calendar as CalendarIcon, Package, ChevronRight, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "motion/react"

interface DashboardCalendarProps {
    jobCards: any[]
}

const priorityConfig: Record<string, { color: string; dot: string }> = {
    urgent: { color: "text-rose-500", dot: "bg-rose-500" },
    high: { color: "text-amber-500", dot: "bg-amber-500" },
    medium: { color: "text-blue-500", dot: "bg-blue-500" },
    low: { color: "text-slate-400", dot: "bg-slate-400" },
}

export function DashboardCalendar({ jobCards }: DashboardCalendarProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
    const [currentTime, setCurrentTime] = useState(new Date())
    const [isOpen, setIsOpen] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const deliveryDates = useMemo(() => {
        const map = new Map<string, string>() // dateString -> maxPriority
        const priorityScore: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 }

        jobCards.forEach(jc => {
            if (jc.expectedDelivery) {
                const dateKey = format(parseISO(jc.expectedDelivery), 'yyyy-MM-dd')
                const currentPriority = jc.priority || 'medium'
                const existingPriority = map.get(dateKey)

                if (!existingPriority || priorityScore[currentPriority] > priorityScore[existingPriority]) {
                    map.set(dateKey, currentPriority)
                }
            }
        })
        return map
    }, [jobCards])

    const selectedDayJobs = useMemo(() => {
        if (!selectedDate) return []
        return jobCards.filter(jc => 
            jc.expectedDelivery && isSameDay(parseISO(jc.expectedDelivery), selectedDate)
        )
    }, [jobCards, selectedDate])

    const modifiers = { hasDelivery: Array.from(deliveryDates.keys()).map(d => parseISO(d)) }

    const priorityStyles: Record<string, { bg: string; text: string; dot: string; glow: string }> = {
        urgent: { bg: "bg-rose-500/20", text: "text-rose-500", dot: "bg-rose-500", glow: "shadow-[0_0_10px_rgba(244,63,94,0.4)]" },
        high: { bg: "bg-amber-500/20", text: "text-amber-500", dot: "bg-amber-500", glow: "shadow-[0_0_10px_rgba(245,158,11,0.4)]" },
        medium: { bg: "bg-primary/20", text: "text-primary", dot: "bg-primary", glow: "shadow-[0_0_10px_rgba(var(--primary),0.4)]" },
        low: { bg: "bg-slate-500/20", text: "text-slate-400", dot: "bg-slate-500", glow: "shadow-[0_0_10px_rgba(148,163,184,0.2)]" },
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="outline" 
                    className="flex items-center gap-4 bg-card/30 backdrop-blur-md border border-border/40 px-6 py-3 h-auto rounded-2xl hover:border-primary/30 hover:bg-card/50 transition-all group shadow-sm"
                >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                        <CalendarIcon size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[14px] font-black tracking-tight text-foreground uppercase">
                            {format(new Date(), 'EEE, d MMM')}
                        </span>
                        <span className="text-[13px] font-bold text-foreground/40 tabular-nums border-l border-border/20 pl-4 py-0.5">
                            {format(currentTime, 'p')}
                        </span>
                    </div>
                </Button>
            </PopoverTrigger>
 
            <PopoverContent 
                className="w-[300px] p-0 rounded-[24px] border-border/20 shadow-2xl bg-card/95 backdrop-blur-xl ring-1 ring-white/5 flex flex-col max-h-[85vh] overflow-hidden" 
                align="end"
                sideOffset={8}
            >
                {/* Minimal Header */}
                <div className="p-5 pb-3 flex items-center justify-between border-b border-border/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <LayoutGrid size={14} className="text-primary/60" />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80">
                            Deliveries
                        </h3>
                    </div>
                    <Badge variant="outline" className="text-[8px] font-bold tracking-widest bg-primary/5 border-primary/10 text-primary/60 px-2 py-0 h-5 rounded-md">LIVE</Badge>
                </div>
                
                <div className="p-1 pt-0 border-b border-border/5 shrink-0">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="bg-transparent"
                        modifiers={modifiers}
                        components={{
                            DayButton: ({ day, modifiers: dayModifiers, ...props }: any) => {
                                const dateKey = format(day.date, 'yyyy-MM-dd')
                                const priority = deliveryDates.get(dateKey)
                                const isSelected = dayModifiers.selected
                                const isToday = dayModifiers.today
                                const style = priority ? priorityStyles[priority] : null
                                
                                return (
                                    <div className="relative w-full h-full flex items-center justify-center p-0.5">
                                        <Button
                                            {...props}
                                            variant="ghost"
                                            className={cn(
                                                "h-8 w-8 p-0 text-[11px] font-bold rounded-lg transition-all relative group/day",
                                                isSelected 
                                                    ? "bg-primary text-primary-foreground shadow-md" 
                                                    : (priority 
                                                        ? cn(style?.bg, style?.text, "hover:bg-opacity-30 font-black shadow-[inset_0_0_10px_rgba(var(--primary),0.02)]")
                                                        : (isToday ? "ring-1 ring-primary/30 bg-primary/5 shadow-sm" : "hover:bg-primary/10 hover:text-primary"))
                                            )}
                                        >
                                            <span className={cn(
                                                "relative z-10",
                                                priority && !isSelected && style?.text
                                            )}>{day.date.getDate()}</span>
                                            {priority && (
                                                <div className={cn(
                                                    "absolute bottom-1 w-1.5 h-0.5 rounded-full transition-all",
                                                    isSelected ? "bg-primary-foreground scale-110" : cn(style?.dot, style?.glow)
                                                )} />
                                            )}
                                        </Button>
                                    </div>
                                )
                            }
                        }}
                    />
                </div>

                <div className="bg-muted/20 pb-4 flex flex-col flex-1 min-h-0">
                    <div className="px-5 py-3.5 flex items-center justify-between shrink-0">
                        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">
                            {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select Date'}
                        </span>
                        <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                            <Package size={10} className="text-primary" />
                            <span className="text-[10px] font-bold text-primary">{selectedDayJobs.length}</span>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 px-3 min-h-0 overflow-y-auto">
                        <AnimatePresence mode="wait">
                            {selectedDayJobs.length > 0 ? (
                                <motion.div 
                                    key={selectedDate?.toISOString()}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-1 pb-2"
                                >
                                    {selectedDayJobs.map((jc: any) => {
                                        const config = priorityConfig[jc.priority] || priorityConfig.medium
                                        return (
                                            <div 
                                                key={jc._id}
                                                onClick={() => navigate(`/jobcards/${jc._id}`)}
                                                className="group flex items-center justify-between p-3.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-border/10 transition-all cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 shadow-sm transition-transform group-hover:scale-150", config.dot)} />
                                                    {jc.items?.[0]?.photo && (
                                                        <div className="w-7 h-7 rounded-md overflow-hidden shrink-0 border border-border/50">
                                                            <img src={jc.items[0].photo} alt={jc.jobCardNumber} className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-[13px] font-black text-foreground group-hover:text-primary transition-colors tracking-tight truncate">{jc.jobCardNumber}</p>
                                                        <p className="text-[11px] font-semibold text-muted-foreground/70 truncate leading-tight group-hover:text-foreground transition-colors">{jc.title}</p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary transition-all translate-x-1 opacity-0 group-hover:opacity-100 shrink-0" />
                                            </div>
                                        )
                                    })}
                                </motion.div>
                            ) : (
                                <div className="py-10 text-center flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center">
                                        <Package size={14} className="text-muted-foreground/30" />
                                    </div>
                                    <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
                                        Idle Fleet
                                    </p>
                                </div>
                            )}
                        </AnimatePresence>
                    </ScrollArea>
                </div>
            </PopoverContent>
        </Popover>
    )
}
