import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const profileImageUploadResponseSchema = z.object({
  imageUrl: z.string().url()
});

export type ProfileImageUploadResponse = z.infer<typeof profileImageUploadResponseSchema>;

export const uploadProfileImage = async (file: File): Promise<ProfileImageUploadResponse> => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${backendUrl}/api/users/me/profile-image`, {
    method: "PUT",
    body: formData,
    credentials: "include"
  });

  if (!response.ok) {
    let message = "Failed to upload profile image.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Keep default message when body is not JSON.
    }

    throw new Error(message);
  }

  return profileImageUploadResponseSchema.parse((await response.json()) as unknown);
};
