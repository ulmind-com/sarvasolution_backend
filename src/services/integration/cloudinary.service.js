import { cloudinary } from '../../config/cloudinary.js';
import streamifier from 'streamifier';

export const uploadToCloudinary = (fileBuffer, folder = 'sarvasolution/profiles') => {
    return new Promise((resolve, reject) => {
        console.log(`[Cloudinary] Starting upload for folder: ${folder}`);
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: "auto",
                timeout: 120000, // Increased to 120s
                transformation: [
                    { width: 500, height: 500, crop: "fill" },
                    { quality: "auto" },
                    { fetch_format: "auto" }
                ]
            },
            (error, result) => {
                if (error) {
                    console.error('[Cloudinary] Upload Error:', error);
                    return reject(error);
                }
                console.log('[Cloudinary] Upload Success:', result.secure_url);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id
                });
            }
        );

        try {
            streamifier.createReadStream(fileBuffer).pipe(uploadStream);
        } catch (err) {
            console.error('[Cloudinary] Stream Error:', err);
            reject(err);
        }
    });
};

/**
 * Upload PDF to Cloudinary with public access
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {String} folder - Cloudinary folder path
 * @param {String} filename - Custom filename (optional)
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadPDFToCloudinary = (pdfBuffer, folder = 'sarvasolution/invoices', filename = null) => {
    return new Promise((resolve, reject) => {
        console.log(`[Cloudinary PDF] Starting upload for folder: ${folder}`);

        const uploadOptions = {
            folder: folder,
            resource_type: 'raw', // CRITICAL: Use 'raw' for PDFs
            type: 'upload', // Explicitly set upload type
            access_mode: 'public', // Ensure public access
            timeout: 120000
        };

        // Add custom filename if provided
        if (filename) {
            uploadOptions.public_id = filename;
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error('[Cloudinary PDF] Upload Error:', error);
                    return reject(error);
                }
                console.log('[Cloudinary PDF] Upload Success:', result.secure_url);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id
                });
            }
        );

        try {
            streamifier.createReadStream(pdfBuffer).pipe(uploadStream);
        } catch (err) {
            console.error('[Cloudinary PDF] Stream Error:', err);
            reject(err);
        }
    });
};

