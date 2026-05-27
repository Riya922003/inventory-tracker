import { useState } from "react";

interface UploadResult {
    url: string;
    publicId: string;
}

export function useUpload() {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadPhoto = async (
        file: File,
        type: "entry" | "exit" | "damage"
    ): Promise<UploadResult | null> => {
        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("type", type);

            const response = await fetch("/api/upload", {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Upload failed");
                return null;
            }

            return { url: data.url, publicId: data.publicId };

        } catch (err) {
            setError("Upload failed. Please try again.");
            return null;
        } finally {
            setUploading(false);
        }
    };

    return { uploadPhoto, uploading, error };
}