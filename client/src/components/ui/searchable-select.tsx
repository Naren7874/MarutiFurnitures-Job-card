import * as React from 'react';
import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { Check, ChevronsUpDown, Search, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchableSelectOption {
    value: string;
    label: string;
    /** Optional color dot (hex) */
    color?: string;
    /** Disables this option */
    disabled?: boolean;
    /** Group label — options with the same group are visually grouped */
    group?: string;
}

export interface SearchableSelectProps {
    /** Array of options */
    options: SearchableSelectOption[];
    /** Currently selected value */
    value?: string;
    /** Called when a value is selected */
    onChange: (value: string) => void;
    /** Placeholder shown when nothing is selected */
    placeholder?: string;
    /** Placeholder inside the search input */
    searchPlaceholder?: string;
    /** Allow clearing the selection */
    clearable?: boolean;
    /** Disable the entire select */
    disabled?: boolean;
    /** Extra classes on the trigger button */
    className?: string;
    /** Height variant */
    size?: 'sm' | 'md' | 'lg';
    /** No-results text */
    emptyText?: string;
    /** Max height of the dropdown list (px) */
    maxHeight?: number;
    /** If true, the dropdown opens upward */
    side?: 'top' | 'bottom' | 'auto';
    /** Allow typing a custom value not in the list */
    creatable?: boolean;
    /** Called when a custom value is entered/selected (if creatable) */
    onCreate?: (value: string) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SIZE = {
    sm: 'h-8 text-xs px-2.5',
    md: 'h-10 text-sm px-3',
    lg: 'h-11 text-sm px-3.5',
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Select…',
    searchPlaceholder = 'Search…',
    clearable = false,
    disabled = false,
    className,
    size = 'md',
    emptyText = 'No results found',
    maxHeight = 280,
    side = 'auto',
    creatable = false,
    onCreate,
}: SearchableSelectProps) {
    const uid = useId();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIdx, setActiveIdx] = useState(0);
    const [dropSide, setDropSide] = useState<'top' | 'bottom'>('bottom');

    const triggerRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => o.value === value);

    // ── Filtering ──────────────────────────────────────────────────────────────
    const filtered = React.useMemo(() => {
        let list = query.trim()
            ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
            : options;
        
        if (creatable && query.trim() && !options.find(o => o.label.toLowerCase() === query.trim().toLowerCase())) {
            list = [{ value: '__create__', label: `Add "${query.trim()}"` }, ...list];
        }
        return list;
    }, [options, query, creatable]);

    const handleCreate = useCallback(() => {
        if (!onCreate || !query.trim()) return;
        onCreate(query.trim());
        setOpen(false);
        setQuery('');
    }, [onCreate, query]);

    // ── Auto-detect side ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!open || side !== 'auto') return;
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setDropSide(spaceBelow < maxHeight + 40 ? 'top' : 'bottom');
    }, [open, side, maxHeight]);

    // ── Focus search on open ───────────────────────────────────────────────────
    useEffect(() => {
        if (open) {
            setQuery('');
            setActiveIdx(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // ── Click-outside close ────────────────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // ── Scroll active item into view ───────────────────────────────────────────
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const item = list.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
        item?.scrollIntoView({ block: 'nearest' });
    }, [activeIdx]);

    // ── Keyboard navigation ────────────────────────────────────────────────────
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!open) {
            if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); setOpen(true); }
            return;
        }
        if (e.key === 'Escape') { e.preventDefault(); setOpen(false); triggerRef.current?.focus(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); return; }
        if (e.key === 'Enter') {
            e.preventDefault();
            const opt = filtered[activeIdx];
            if (opt && !opt.disabled) {
                if (opt.value === '__create__') {
                    handleCreate();
                } else {
                    select(opt.value);
                }
            } else if (creatable && query.trim()) {
                handleCreate();
            }
            return;
        }
        if (e.key === 'Tab') { setOpen(false); }
    }, [open, filtered, activeIdx]);

    const select = useCallback((val: string) => {
        onChange(val);
        setOpen(false);
        triggerRef.current?.focus();
    }, [onChange]);

    const clear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
    };

    // Group options
    const groups = React.useMemo(() => {
        const map = new Map<string, SearchableSelectOption[]>([['__none__', []]]);
        filtered.forEach(opt => {
            const g = opt.group || '__none__';
            if (!map.has(g)) map.set(g, []);
            map.get(g)!.push(opt);
        });
        return map;
    }, [filtered]);

    // Flat list for keyboard navigation index
    const flatFiltered = filtered;

    const resolvedSide = side === 'auto' ? dropSide : side;

    return (
        <div ref={containerRef} className="relative w-full" onKeyDown={handleKeyDown}>
            {/* ── Trigger button ─────────────────────────────────────────────────── */}
            <button
                ref={triggerRef}
                id={`${uid}-trigger`}
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-controls={`${uid}-listbox`}
                disabled={disabled}
                onClick={() => !disabled && setOpen(v => !v)}
                className={cn(
                    'group flex w-full items-center justify-between gap-2 rounded-xl border transition-all',
                    'border-input bg-background ring-offset-background',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    'hover:border-primary/50 hover:shadow-sm',
                    open && 'border-primary/60 ring-2 ring-primary/20 shadow-sm',
                    disabled && 'cursor-not-allowed opacity-50',
                    SIZE[size],
                    className
                )}
            >
                {/* Selected label / placeholder */}
                <div className="flex min-w-0 items-center gap-2 flex-1">
                    {selectedOption?.color && (
                        <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: selectedOption.color }}
                        />
                    )}
                    <span className={cn(
                        'truncate text-left',
                        !selectedOption && !value ? 'text-muted-foreground/60' : 'text-foreground font-medium'
                    )}>
                        {selectedOption ? selectedOption.label : (value || placeholder)}
                    </span>
                </div>

                {/* Right icons */}
                <div className="flex shrink-0 items-center gap-1">
                    {clearable && selectedOption && (
                        <span
                            role="button"
                            aria-label="Clear"
                            onClick={clear}
                            className="rounded p-0.5 text-muted-foreground/50 hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <X className="size-3" />
                        </span>
                    )}
                    <ChevronsUpDown
                        className={cn(
                            'size-3.5 text-muted-foreground/50 transition-transform duration-200',
                            open && 'rotate-180'
                        )}
                    />
                </div>
            </button>

            {/* ── Dropdown ───────────────────────────────────────────────────────── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: resolvedSide === 'bottom' ? -6 : 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: resolvedSide === 'bottom' ? -4 : 4, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className={cn(
                            'absolute left-0 right-0 z-9999 overflow-hidden',
                            'rounded-xl border border-border bg-popover shadow-2xl shadow-black/20',
                            'backdrop-blur-md',
                            resolvedSide === 'bottom' ? 'top-[calc(100%+6px)]' : 'bottom-[calc(100%+6px)]'
                        )}
                    >
                        {/* Search input */}
                        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                            <Search className="size-3.5 shrink-0 text-muted-foreground/50" />
                            <input
                                ref={inputRef}
                                type="text"
                                role="searchbox"
                                aria-controls={`${uid}-listbox`}
                                value={query}
                                onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
                                placeholder={searchPlaceholder}
                                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => { setQuery(''); setActiveIdx(0); inputRef.current?.focus(); }}
                                    className="rounded text-muted-foreground/40 hover:text-foreground transition-colors"
                                >
                                    <X className="size-3" />
                                </button>
                            )}
                        </div>

                        {/* Options list */}
                        <ul
                            ref={listRef}
                            id={`${uid}-listbox`}
                            role="listbox"
                            aria-label="Options"
                            className="overflow-y-auto py-1.5"
                            style={{ maxHeight }}
                        >
                            {flatFiltered.length === 0 ? (
                                <li className="flex flex-col items-center gap-2 py-8 text-muted-foreground/50">
                                    <AlertCircle className="size-5" />
                                    <span className="text-xs">{emptyText}</span>
                                </li>
                            ) : (
                                Array.from(groups.entries()).map(([groupName, groupOpts]) => (
                                    <React.Fragment key={groupName}>
                                        {groupName !== '__none__' && (
                                            <li
                                                role="presentation"
                                                className="mx-2 mb-1 mt-2 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40 first:mt-0"
                                            >
                                                {groupName}
                                            </li>
                                        )}
                                        {groupOpts.map(opt => {
                                            const idx = flatFiltered.indexOf(opt);
                                            const isActive = idx === activeIdx;
                                            const isSelected = opt.value === value;
                                            return (
                                                <li
                                                    key={opt.value}
                                                    role="option"
                                                    data-idx={idx}
                                                    aria-selected={isSelected}
                                                    aria-disabled={opt.disabled}
                                                    onMouseEnter={() => setActiveIdx(idx)}
                                                    onClick={() => !opt.disabled && select(opt.value)}
                                                    className={cn(
                                                        'mx-1.5 flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                                                        isActive && !opt.disabled && 'bg-accent text-accent-foreground',
                                                        isSelected && 'font-semibold',
                                                        opt.disabled && 'cursor-not-allowed opacity-40'
                                                    )}
                                                >
                                                    {/* Color dot */}
                                                    {opt.color && (
                                                        <span
                                                            className="size-2 shrink-0 rounded-full"
                                                            style={{ backgroundColor: opt.color }}
                                                        />
                                                    )}

                                                    <span className="flex-1 truncate">{opt.label}</span>

                                                    {/* Check mark for selected */}
                                                    {isSelected && (
                                                        <Check className="size-3.5 shrink-0 text-primary" />
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </React.Fragment>
                                ))
                            )}
                        </ul>

                        {/* Footer count */}
                        {query && flatFiltered.length > 0 && (
                            <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground/40">
                                {flatFiltered.length} result{flatFiltered.length !== 1 ? 's' : ''}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
