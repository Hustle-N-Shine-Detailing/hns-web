(() => {
  if (db.storage.__hnsPhotoCompressionInstalled) return;
  db.storage.__hnsPhotoCompressionInstalled = true;

  const TARGET_BYTES = Math.floor(5.5 * 1024 * 1024);
  const HARD_BUCKET_BYTES = Math.floor(9.5 * 1024 * 1024);
  const MAX_DIMENSION = 2560;

  const originalFrom = db.storage.from.bind(db.storage);

  function canvasToBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }

  async function optimizePhoto(file) {
    if (!(file instanceof File)) return file;
    if (file.size <= TARGET_BYTES) return file;

    const compressible = /image\/(jpeg|webp)/i.test(file.type);
    if (!compressible) return file;

    const bitmap = await createImageBitmap(file);
    try {
      const largestSide = Math.max(bitmap.width, bitmap.height);
      const scale = Math.min(1, MAX_DIMENSION / largestSide);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('This browser could not prepare the photo for upload.');
      ctx.drawImage(bitmap, 0, 0, width, height);

      const outputType = file.type.toLowerCase() === 'image/webp' ? 'image/webp' : 'image/jpeg';
      let quality = 0.84;
      let blob = await canvasToBlob(canvas, outputType, quality);

      while (blob && blob.size > TARGET_BYTES && quality > 0.56) {
        quality -= 0.08;
        blob = await canvasToBlob(canvas, outputType, quality);
      }

      if (!blob) throw new Error('This browser could not prepare the photo for upload.');

      const extension = outputType === 'image/webp' ? '.webp' : '.jpg';
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'job-photo';
      return new File([blob], `${baseName}${extension}`, {
        type: outputType,
        lastModified: file.lastModified || Date.now()
      });
    } finally {
      if (typeof bitmap.close === 'function') bitmap.close();
    }
  }

  db.storage.from = function(bucketId) {
    const bucket = originalFrom(bucketId);
    if (bucketId !== 'job-photos') return bucket;

    const originalUpload = bucket.upload.bind(bucket);
    bucket.upload = async function(path, fileBody, options = {}) {
      try {
        const prepared = await optimizePhoto(fileBody);
        if (prepared instanceof File && prepared.size > HARD_BUCKET_BYTES) {
          const mb = (prepared.size / 1024 / 1024).toFixed(1);
          return {
            data: null,
            error: {
              message: `This photo is ${mb} MB and is still too large after optimization. Try a standard JPG camera photo instead of HEIC/HEIF or an ultra-high-resolution original.`
            }
          };
        }

        const uploadOptions = { ...options };
        if (prepared instanceof File && prepared.type) uploadOptions.contentType = prepared.type;
        return originalUpload(path, prepared, uploadOptions);
      } catch (error) {
        if (fileBody instanceof File && fileBody.size <= HARD_BUCKET_BYTES) {
          return originalUpload(path, fileBody, options);
        }
        return {
          data: null,
          error: {
            message: error?.message || 'The photo could not be optimized for upload.'
          }
        };
      }
    };

    return bucket;
  };

  const input = document.getElementById('photoFile');
  if (input) {
    input.insertAdjacentHTML('afterend', '<small class="muted" style="display:block;margin-top:6px">Large phone photos are optimized automatically before upload.</small>');
  }
})();
