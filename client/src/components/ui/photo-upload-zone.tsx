import React, { useRef, useState } from 'react';
import { ImagePlus, X, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function PhotoUploadZone({
    photoUrl,
    uploading,
    onFileSelect,
    onRemove,
}: {
    photoUrl: string;
    uploading: boolean;
    onFileSelect: (file: File) => void;
    onRemove: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) onFileSelect(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onFileSelect(file);
        e.target.value = '';
    };

    if (photoUrl) {
        return (
            <div className="relative w-full h-[140px] rounded-2xl overflow-hidden group/photo border border-border/40 bg-muted/20 shadow-sm transition-all hover:shadow-md">
                <img src={photoUrl} alt="Item photo" className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => window.open(photoUrl, '_blank')}
                        className="bg-white/10 backdrop-blur-md text-white p-2.5 rounded-xl hover:bg-white/20 transition-all hover:scale-110 active:scale-95"
                        title="View Full Image"
                    >
                        <ImagePlus size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="bg-white/10 backdrop-blur-md text-white p-2.5 rounded-xl hover:bg-white/20 transition-all hover:scale-110 active:scale-95"
                        title="Change Photo"
                    >
                        <Loader2 size={16} className={uploading ? "animate-spin" : ""} />
                    </button>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="bg-rose-500/80 backdrop-blur-md text-white p-2.5 rounded-xl hover:bg-rose-600 transition-all hover:scale-110 active:scale-95"
                        title="Remove Photo"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="absolute top-2 right-2 pointer-events-none">
                    <div className="bg-emerald-500 text-white p-1 rounded-full shadow-lg scale-90">
                        <CheckCircle2 size={12} />
                    </div>
                </div>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
        );
    }

    return (
        <div
            onClick={() => !uploading && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
                'w-full h-[140px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer',
                isDragging
                    ? 'border-primary bg-primary/10 scale-[1.02]'
                    : 'border-border/40 hover:border-primary/40 hover:bg-primary/5',
                uploading && 'pointer-events-none opacity-60'
            )}
        >
            {uploading ? (
                <>
                    <Loader2 size={22} className="text-primary animate-spin" />
                    <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Uploading...</p>
                </>
            ) : (
                <>
                    <div className={cn('p-3 rounded-xl transition-colors', isDragging ? 'bg-primary/20' : 'bg-muted/50')}>
                        <ImagePlus size={20} className={isDragging ? 'text-primary' : 'text-muted-foreground/40'} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/50 text-center px-2">
                        {isDragging ? 'Drop to upload' : 'Drag & drop or click'}
                    </p>
                    <p className="text-[9px] text-muted-foreground/30 font-medium">JPG, PNG, WEBP · Max 20MB</p>
                </>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
    );
}
