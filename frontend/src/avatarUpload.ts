// shrinks a picked image in the browser before saving it

export const AVATAR_SIZE = 128;         // square, in pixels
export const MAX_FILE_BYTES = 8 * 1024 * 1024;   // max file size

// background pictures are bigger than avatars
export const BACKGROUND_WIDTH = 1600;

// shrink an image file to a square data URI
export function fileToAvatarDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('That file isn’t an image — pick a PNG, JPEG or WebP.'));
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            reject(new Error('That image is over 8 MB — please pick a smaller one.'));
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);      // done with the temp link
            try {
                const canvas = document.createElement('canvas');
                canvas.width = AVATAR_SIZE;
                canvas.height = AVATAR_SIZE;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('canvas unavailable');

                // crop to a centred square
                const side = Math.min(image.width, image.height);
                const sx = (image.width - side) / 2;
                const sy = (image.height - side) / 2;
                ctx.drawImage(image, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

                // jpeg, small but still clean
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            } catch {
                reject(new Error('That image could not be processed — try a different one.'));
            }
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('That image could not be opened — try a different one.'));
        };

        image.src = objectUrl;
    });
}

// shrink a picture for the page background, not cropped
export function fileToBackgroundDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('That file isn’t an image — pick a PNG, JPEG or WebP.'));
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            reject(new Error('That image is over 8 MB — please pick a smaller one.'));
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            try {
                // scale down only
                const scale = Math.min(1, BACKGROUND_WIDTH / image.width);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(image.width * scale);
                canvas.height = Math.round(image.height * scale);

                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('canvas unavailable');
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

                const dataUri = canvas.toDataURL('image/jpeg', 0.72);

                // backend refuses themes over ~1.5 MB
                const bytes = Math.floor(dataUri.length * 3 / 4);
                if (bytes > 1_200_000) {
                    reject(new Error('That image is too detailed to save — try a smaller or simpler one.'));
                    return;
                }
                resolve(dataUri);
            } catch {
                reject(new Error('That image could not be processed — try a different one.'));
            }
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('That image could not be opened — try a different one.'));
        };

        image.src = objectUrl;
    });
}
