/**
 * Compresses an image file using Canvas to optimize memory usage on mobile devices.
 * Downscales images to a maximum dimension and reduces JPEG quality.
 */
export const compressImage = (file: File, maxWidth = 1920, quality = 0.7): Promise<File> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            return resolve(file);
        }

        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(img.src);
            
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxWidth) {
                    width = Math.round((width * maxWidth) / height);
                    height = maxWidth;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) {
                return resolve(file);
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Give the browser a moment to settle memory before blob creation
            setTimeout(() => {
                canvas.toBlob(
                    (blob) => {
                        // Crucial cleanup
                        canvas.width = 0;
                        canvas.height = 0;

                        if (!blob) {
                            return resolve(file);
                        }
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            }, 100);
        };

        img.onerror = (err) => {
            reject(err);
        };
    });
};
