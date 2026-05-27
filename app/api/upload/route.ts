import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { getCurrentUser } from "@/lib/auth";
import { User } from "@/models/User";
import { connectDB } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const user = await User.findById(currentUser.userId);
        if (!user || !user.companyId) {
            return NextResponse.json(
                { error: "Please complete onboarding first" },
                { status: 400 }
            );
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const type = formData.get("type") as string; // "entry" | "exit" | "damage"

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Only JPEG, PNG, and WebP images are allowed" },
                { status: 400 }
            );
        }

        // Validate file size - max 5MB
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: "File size must be less than 5MB" },
                { status: 400 }
            );
        }

        // Convert file to buffer for cloudinary upload
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to cloudinary
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader
                .upload_stream(
                    {
                        // Organize photos by company and type in cloudinary
                        folder: `insyd-tracker/${user.companyId}/${type || "general"}`,
                        // Auto compress and optimize
                        quality: "auto",
                        fetch_format: "auto",
                        // Add timestamp to filename for uniqueness
                        public_id: `${type}-${Date.now()}`,
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                )
                .end(buffer);
        });

        const uploadResult = result as any;

        return NextResponse.json({
            success: true,
            url: uploadResult.secure_url,      // this is what you save in MongoDB
            publicId: uploadResult.public_id,  // useful if you ever want to delete it
        });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({
            error: "Failed to upload image",
            details: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
    }
}