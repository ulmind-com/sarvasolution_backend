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
