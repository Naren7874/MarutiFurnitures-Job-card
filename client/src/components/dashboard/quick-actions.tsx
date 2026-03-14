import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Plus, FileText, Users, Package, Truck, MessageCircle, BarChart3, Settings
} from "lucide-react"
import { motion } from "motion/react"

const actions = [
    { label: 'New Job Card', icon: Plus, color: '#1315E5', bg: '#1315E515', path: '/jobcards/new' },
    { label: 'New Quotation', icon: FileText, color: '#8B5CF6', bg: '#8B5CF615', path: '/quotations/new' },
    { label: 'Add Client', icon: Users, color: '#10B981', bg: '#10B98115', path: '/clients/new' },
    { label: 'Purchase Order', icon: Package, color: '#F59E0B', bg: '#F59E0B15', path: '/purchase-orders/new' },
    { label: 'Schedule Delivery', icon: Truck, color: '#F97316', bg: '#F9731615', path: '/jobcards' },
    { label: 'WhatsApp Blast', icon: MessageCircle, color: '#25D366', bg: '#25D36615', path: '/projects' },
    { label: 'Reports', icon: BarChart3, color: '#767A8C', bg: '#767A8C15', path: '/reports' },
    { label: 'Settings', icon: Settings, color: '#485666', bg: '#48566615', path: '/settings' },
]

export function QuickActions() {
    const navigate = useNavigate()

    return (
        <Card className="flex flex-col border-border bg-card shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6">
                <CardTitle className="text-base font-bold">Quick Actions</CardTitle>
                <p className="text-xs text-muted-foreground">Common operations</p>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-2 gap-2">
                    {actions.map((action, index) => (
                        <motion.div
                            key={action.label}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.04 }}
                            whileHover={{ y: -2, scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <Button
                                variant="ghost"
                                onClick={() => navigate(action.path)}
                                className="w-full h-auto py-3 px-3 flex flex-col items-center gap-2 rounded-xl border border-border hover:border-(--action-color) transition-all group"
                                style={{ '--action-color': action.color } as React.CSSProperties}
                            >
                                <div
                                    className="p-2 rounded-lg transition-colors"
                                    style={{ backgroundColor: action.bg }}
                                >
                                    <action.icon
                                        className="size-4 transition-colors"
                                        style={{ color: action.color }}
                                    />
                                </div>
                                <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors leading-tight text-center">
                                    {action.label}
                                </span>
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
