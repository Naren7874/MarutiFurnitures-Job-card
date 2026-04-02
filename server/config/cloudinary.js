import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer       - File buffer
 * @param {string} folder       - Cloudinary folder path e.g. "maruti/quotations"
 * @param {string} resourceType - 'image' | 'raw' | 'video' (default: auto)
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadToCloudinary = (buffer, folder, resourceType = 'auto', publicId = undefined) => {
  return new Promise((resolve, reject) => {
    const options = { folder, resource_type: resourceType };
    if (publicId) {
      // Avoid duplicate folder prefix if using publicId
      options.public_id = publicId;
    }
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

/**
 * Delete a file from Cloudinary by publicId
 */
export const deleteFromCloudinary = (publicId) =>
  cloudinary.uploader.destroy(publicId);

export default cloudinary;
