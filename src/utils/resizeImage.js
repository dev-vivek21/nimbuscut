/**
 * Resize and convert an image blob/url to target dimensions and format.
 *
 * @param {Blob|string} source - Blob or URL of the image with background removed
 * @param {number} targetWidth - Target width in pixels
 * @param {string} format - 'png' | 'jpeg' | 'webp'
 * @returns {Promise<Blob>}
 */
export async function resizeImage(source, targetWidth, format = 'png') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const tempUrl = typeof source === 'string' ? source : URL.createObjectURL(source);

    img.onload = () => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(tempUrl);
      }

      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;

      const scale = targetWidth / originalWidth;
      const targetHeight = Math.round(originalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not initialize 2D canvas context.'));
        return;
      }

      // Ensure high quality downscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // If format is JPEG, fill background with white (since JPEG has no alpha channel)
      if (format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      } else {
        ctx.clearRect(0, 0, targetWidth, targetHeight);
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      const quality = format === 'png' ? undefined : 0.95;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas export failed.'));
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(tempUrl);
      }
      reject(new Error('Failed to load image for resizing.'));
    };

    img.src = tempUrl;
  });
}
