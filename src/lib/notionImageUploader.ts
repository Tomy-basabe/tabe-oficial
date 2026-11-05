import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Mapeo de tipos MIME soportados por Supabase Storage en el bucket de imágenes.
 */
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Optimiza y redimensiona una imagen en el cliente para preservar el límite
 * gratuito de Supabase (máx 1GB storage / 5GB egress), acelerando la subida
 * y evitando errores de archivo demasiado grande.
 */
async function optimizeImageForUpload(file: File | Blob): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  // 1. Si es GIF animado, no pasarlo por canvas para no perder la animación
  if (file.type === "image/gif") {
    return { blob: file, mimeType: "image/gif", extension: "gif" };
  }

  // Si no estamos en entorno navegador, devolver intacto
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      blob: file,
      mimeType: file.type || "image/png",
      extension: "png",
    };
  }

  return new Promise((resolve) => {
    // Si la imagen es muy pequeña (< 120KB) y ya tiene formato válido, no requiere recompresión
    if (file.size < 120 * 1024 && ALLOWED_MIME_TYPES.includes(file.type)) {
      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] || "png";
      resolve({ blob: file, mimeType: file.type, extension: ext });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const maxDim = 1920; // Resolución Full HD suficiente para apuntes nítidos
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve({
          blob: file,
          mimeType: file.type || "image/png",
          extension: file.type === "image/jpeg" ? "jpg" : "png",
        });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Si es PNG y potencialmente tiene transparencia, preferir WebP o PNG
      const targetMime = file.type === "image/png" ? "image/png" : "image/jpeg";
      const quality = 0.85;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              blob: file,
              mimeType: file.type || "image/png",
              extension: file.type === "image/jpeg" ? "jpg" : "png",
            });
            return;
          }

          const ext = targetMime === "image/jpeg" ? "jpg" : "png";
          resolve({ blob, mimeType: targetMime, extension: ext });
        },
        targetMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        blob: file,
        mimeType: file.type && ALLOWED_MIME_TYPES.includes(file.type) ? file.type : "image/png",
        extension: "png",
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Sube una imagen a Supabase Storage con compresión inteligente,
 * control de ruta por usuario y tolerancia ante fallos de bucket.
 */
export async function uploadNotionImage(
  file: File | Blob,
  options?: {
    toastId?: string | number;
    showToastFeedback?: boolean;
  }
): Promise<string> {
  const showToast = options?.showToastFeedback !== false;
  const toastId = options?.toastId || "notion-image-upload";

  if (showToast) {
    toast.loading("Subiendo imagen al apunte...", { id: toastId });
  }

  try {
    // 1. Optimizar imagen
    const { blob, mimeType, extension } = await optimizeImageForUpload(file);

    // 2. Obtener usuario para respetar RLS (storage.foldername(name))[1] = auth.uid()
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || "anonymous";

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;
    const filePath = `${userId}/${fileName}`;

    // 3. Subir a notion-images
    let uploadResult = await supabase.storage
      .from("notion-images")
      .upload(filePath, blob, {
        cacheControl: "31536000",
        upsert: false,
        contentType: mimeType,
      });

    let bucketUsed = "notion-images";

    // 4. Fallback: Si el bucket notion-images no existe o falla por 404, usar library-files
    if (uploadResult.error) {
      const errMsg = uploadResult.error.message?.toLowerCase() || "";
      const isBucketMissing = errMsg.includes("not found") || (uploadResult.error as any).statusCode === "404" || errMsg.includes("bucket");

      if (isBucketMissing) {
        console.warn("Bucket notion-images no disponible. Reintentando subida en library-files...", uploadResult.error);
        const fallbackPath = `apuntes-imagenes/${userId}/${fileName}`;
        const fallbackResult = await supabase.storage
          .from("library-files")
          .upload(fallbackPath, blob, {
            cacheControl: "31536000",
            upsert: false,
            contentType: mimeType,
          });

        if (!fallbackResult.error) {
          uploadResult = fallbackResult;
          bucketUsed = "library-files";
          // Actualizamos la ruta para el getPublicUrl
          const { data: { publicUrl } } = supabase.storage
            .from("library-files")
            .getPublicUrl(fallbackPath);

          if (showToast) {
            toast.success("Imagen subida correctamente", { id: toastId });
          }
          return publicUrl;
        }
      }

      // Si llegó aquí y sigue con error, lanzar excepción
      throw uploadResult.error;
    }

    // 5. Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(bucketUsed)
      .getPublicUrl(filePath);

    if (!publicUrl) {
      throw new Error("No se pudo generar la URL pública de la imagen");
    }

    if (showToast) {
      toast.success("Imagen subida correctamente", { id: toastId });
    }

    return publicUrl;
  } catch (error: any) {
    console.error("Error al subir imagen a Supabase Storage:", error);
    const friendlyMsg = error?.message || "Error al subir la imagen. Verifica tu conexión.";
    if (showToast) {
      toast.error(`Error al subir la imagen: ${friendlyMsg}`, { id: toastId });
    }
    throw error;
  }
}
