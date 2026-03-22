export const FullPageBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-neutral-100 dark:bg-black transition-colors duration-500">
        {/* Generated Premium Image */}
        <img 
            src="/login-bg.png" 
            alt="Background" 
            className="w-full h-full object-cover opacity-30 dark:opacity-70 scale-100 transition-opacity duration-500"
        />
        {/* Adaptive Overlays */}
        <div className="absolute inset-0 bg-linear-to-b from-white/40 via-transparent to-white/60 dark:from-black/60 dark:via-black/20 dark:to-black/70 transition-colors duration-500" />
        <div className="absolute inset-0 bg-linear-to-r from-white/20 via-transparent to-white/20 dark:from-black/40 dark:via-transparent dark:to-black/40 transition-colors duration-500" />
        
        {/* Subtle Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-125" />
    </div>
);
