export const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

const BASE64_DATA_URL_PATTERN = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/;

export type ProfileImageValidationResult = {
  byteLength: number;
  mimeType: string;
};

export function isBase64DataUrl(value: string): boolean {
  return BASE64_DATA_URL_PATTERN.test(value.trim());
}

export function getBase64DataUrlInfo(value: string): ProfileImageValidationResult | null {
  const match = BASE64_DATA_URL_PATTERN.exec(value.trim());
  const mimeType = match?.[1];
  const payload = match?.[2];

  if (!mimeType || !payload) {
    return null;
  }

  const sanitizedPayload = payload.replace(/\s+/g, "");
  const fileBuffer = Buffer.from(sanitizedPayload, "base64");

  return {
    byteLength: fileBuffer.byteLength,
    mimeType,
  };
}

export function assertProfileImageSize(value: string): void {
  const imageInfo = getBase64DataUrlInfo(value);
  if (!imageInfo) {
    throw new Error("Profile image must be a valid Base64 data URL.");
  }

  if (!imageInfo.mimeType.startsWith("image/")) {
    throw new Error("Profile image must be an image file.");
  }

  if (imageInfo.byteLength > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error(`Profile image exceeds the ${Math.round(MAX_PROFILE_IMAGE_BYTES / (1024 * 1024))}MB limit.`);
  }
}

export function getProfileImageConfig() {
  return {
    maxBytes: MAX_PROFILE_IMAGE_BYTES,
    maxMegabytes: MAX_PROFILE_IMAGE_BYTES / (1024 * 1024),
  };
}
