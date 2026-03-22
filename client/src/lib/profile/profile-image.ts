export const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.ceil(bytes / 1024)} KB`;
}

export async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to convert image to Base64."));
    };

    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export function validateProfileImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file from your device.");
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error(`Please choose an image smaller than ${formatFileSize(MAX_PROFILE_IMAGE_BYTES)}.`);
  }
}
