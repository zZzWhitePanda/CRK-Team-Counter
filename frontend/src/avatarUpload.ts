// ============================================================
// avatarUpload.ts - turning a chosen image file into something
// small enough to store.
//
// A photo off a phone is 3-5 MB, which is far too big to keep in
// a database row. Rather than upload the file and shrink it on the
// server, the BROWSER does the work first:
//
//   1. read the file the user picked
//   2. draw it onto a hidden 128x128 canvas, cropped to a square
//      from the middle so faces don't get squashed
//   3. read the canvas back out as a compressed JPEG data URI
//
// The result is roughly 10-15 KB, so it fits comfortably in the
// users table and there are no uploaded files to lose when the
// free hosting restarts and wipes the server's disk.
//
// The backend checks the size and file type again when it arrives
// (never trust the browser - NFR05).
// ============================================================

export const AVATAR_SIZE = 128;         // pixels, square
export const MAX_FILE_BYTES = 8 * 1024 * 1024;   // 8 MB before shrinking

/**
 * Shrink an image file to a square data URI ready to save.
 * Rejects with a friendly message if the file isn't a usable image.
 */
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
            URL.revokeObjectURL(objectUrl);      // done with the temporary link
            try {
                const canvas = document.createElement('canvas');
                canvas.width = AVATAR_SIZE;
                canvas.height = AVATAR_SIZE;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('canvas unavailable');

                // Crop to a centred square: take the biggest square that
                // fits, from the middle of the picture.
                const side = Math.min(image.width, image.height);
                const sx = (image.width - side) / 2;
                const sy = (image.height - side) / 2;
                ctx.drawImage(image, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

                // 0.85 quality JPEG: small file, still looks clean at 128px
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
