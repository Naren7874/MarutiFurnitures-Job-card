import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Plus, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StaffMultiSelectProps {
    label: string;
    icon: any;
    selectedIds: string[];
    onToggle: (id: string) => void;
    allUsers: any[];
    placeholder?: string;
    className?: string;
    roleFilter?: string | string[];
}

export const StaffMultiSelect = ({ 
    label, 
    icon: Icon, 
    selectedIds, 
    onToggle, 
    allUsers,
    placeholder = "Assign staff...",
    className,
    roleFilter
}: StaffMultiSelectProps) => {
    const filteredUsers = allUsers.filter(u => {
        if (!roleFilter) return true;
        if (Array.isArray(roleFilter)) return roleFilter.includes(u.role);
        
        // Only Factory Manager is allowed for production stage assignment
        if (roleFilter === 'production') {
            const r = u.role?.toLowerCase().replace(/[\s_]/g, '');
            return r === 'factorymanager';
        }

        // Robust filtering for accounts (handles role: accountant AND department: accounts)
        if (roleFilter === 'accountant') {
            return u.role === 'accountant' || u.department === 'accounts';
        }
        
        return u.role === roleFilter;
    });

    const selectedUsers = allUsers.filter(u => selectedIds.includes(u._id));

    return (
        <div className={cn("space-y-2 flex-1", className)}>
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/60 ml-1 flex items-center gap-2">
                <Icon size={12} className="text-primary/50" /> {label}
            </label>
            <Popover modal={true}>
                <PopoverTrigger asChild>
                    <div className="min-h-12 p-2 rounded-2xl bg-muted/10 border border-border/20 flex flex-wrap gap-2 cursor-pointer hover:bg-muted/20 transition-all group-hover/card:bg-background/40">
                        {selectedUsers.length > 0 ? (
                            selectedUsers.map(u => (
                                <Badge key={u._id} variant="secondary" className="rounded-full py-1.5 px-4 text-[10px] font-black gap-2 bg-primary/10 text-primary border border-primary/20 shadow-sm hover:bg-primary/20 transition-all active:scale-95">
                                    {u.name}
                                    <X size={12} className="hover:text-primary transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); onToggle(u._id); }} />
                                </Badge>
                            ))
                        ) : (
                            <span className="text-xs text-muted-foreground/20 font-bold ml-3 mt-2.5">{placeholder}</span>
                        )}
                        <div className="ml-auto flex items-center pr-2 opacity-10 group-hover:opacity-30 transition-opacity">
                            <Plus size={16} />
                        </div>
                    </div>
                </PopoverTrigger>

                <PopoverContent 
                    className="w-[240px] p-0 rounded-2xl border-border/40 overflow-hidden shadow-xl bg-card" 
                    align="start"
                >
                    <Command className="bg-transparent">
                        <CommandInput placeholder={`Search ${label}...`} className="font-bold border-none" />
                        <CommandList className="max-h-[250px] p-1.5 custom-scrollbar">
                            <CommandEmpty className="py-8 text-center text-xs font-black uppercase text-muted-foreground/40">No staff found.</CommandEmpty>
                            <CommandGroup>
                                {filteredUsers.map(user => {
                                    const isSelected = selectedIds.includes(user._id);
                                    return (
                                        <CommandItem
                                            key={user._id}
                                            onSelect={() => onToggle(user._id)}
                                            className="flex items-center gap-3 px-3 py-3 text-sm font-bold cursor-pointer rounded-xl mb-1 aria-selected:bg-primary/10 aria-selected:text-primary transition-all"
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                                isSelected ? "bg-primary border-primary scale-110 shadow-lg shadow-primary/20" : "border-border/60"
                                            )}>
                                                {isSelected && <CheckCircle2 size={12} className="text-white" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="leading-none">{user.name}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">{user.role}</span>
                                            </div>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
};
