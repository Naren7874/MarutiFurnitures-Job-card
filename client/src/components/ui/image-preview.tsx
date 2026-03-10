import { Dialog, DialogContent, DialogTrigger, DialogTitle } from './dialog';
import { Maximize2 } from 'lucide-react';

export function ImagePreview({ src, alt }: { src: string; alt?: string }) {
    if (!src) return null;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="relative group cursor-zoom-in rounded-xl overflow-hidden border border-border/40 bg-muted/20 shadow-sm hover:shadow-md transition-all">
                    <img src={src} alt={alt || "Preview"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 size={16} className="text-white drop-shadow-lg" />
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none sm:max-w-3xl">
                <DialogTitle className="sr-only">Image Preview</DialogTitle>
                <div className="relative w-full h-full flex items-center justify-center p-4">
                    <img
                        src={src}
                        alt={alt || "Full View"}
                        className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-white/10"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
