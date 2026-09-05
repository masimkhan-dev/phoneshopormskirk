/**
 * Cloudinary client utilities for image optimization, file validation, and direct browser uploads.
 */

export type CloudinaryVariant = "CARD" | "DETAIL" | "THUMBNAIL";

const TRANSFORMS: Record<CloudinaryVariant, string> = {
  CARD: "w_400,h_400,c_fill,f_auto,q_auto",
  DETAIL: "w_900,c_limit,f_auto,q_auto",
  THUMBNAIL: "w_120,h_120,c_fill,f_auto,q_auto",
};

/**
 * Returns an optimized Cloudinary delivery URL for the requested variant.
 * If the URL is not from Cloudinary, returns the original URL unchanged.
 */
export function getCloudinaryImageUrl(
  url: string | null | undefined,
  variant: CloudinaryVariant = "CARD",
): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  const transform = TRANSFORMS[variant] ?? TRANSFORMS.CARD;

  // Prevent double-applying the transformation
  if (url.includes(`/upload/${transform}/`)) {
    return url;
  }

  return url.replace("/upload/", `/upload/${transform}/`);
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PRODUCT_IMAGES = 3;

export type ImageValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Validates a user-selected image file against MIME type and file size limits.
 */
export function validateProductImageFile(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: "Please choose a JPG, PNG or WebP image.",
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: "Image must be 5 MB or smaller.",
    };
  }

  return { valid: true };
}

export type CloudinaryUploadSignature = {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
};

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
};

/**
 * Uploads an image file directly from the browser to Cloudinary using a signed upload signature.
 * Binary image data never passes through Supabase or your application server.
 */
export async function uploadImageToCloudinary(
  file: File,
  sig: CloudinaryUploadSignature,
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("signature", sig.signature);
  formData.append("folder", sig.folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message =
      (errorJson as { error?: { message?: string } })?.error?.message ||
      `Upload failed with status ${response.status}`;
    throw new Error(`Cloudinary upload failed: ${message}`);
  }

  const json = (await response.json()) as { secure_url: string; public_id: string };
  if (!json.secure_url || !json.public_id) {
    throw new Error("Invalid response received from Cloudinary upload endpoint.");
  }

  return {
    secure_url: json.secure_url,
    public_id: json.public_id,
  };
}
