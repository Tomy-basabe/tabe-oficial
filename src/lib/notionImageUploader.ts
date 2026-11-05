import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
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
async function optimizeImageForUpload(file: File | Blob): Promise<{ fileToUpload: File; mimeType: string }> {
  // 1. Si es GIF animado, preservar sin canvas para mantener animación
  if (file.type === "image/gif") {
    const gifFile = file instanceof File ? file : new File([file], `anim-${Date.now()}.gif`, { type: "image/gif" });
    return { fileToUpload: gifFile, mimeType: "image/gif" };
  }

  // Si no estamos en entorno navegador, devolver como File nativo
  if (typeof window === "undefined" || typeof document === "undefined") {
    const genericFile = file instanceof File ? file : new File([file], `upload-${Date.now()}.png`, { type: file.type || "image/png" });
    return { fileToUpload: genericFile, mimeType: file.type || "image/png" };
  }

  return new Promise((resolve) => {
    // Si la imagen es pequeña (< 120KB) y tiene mime válido, convertir directo a File
    if (file.size < 120 * 1024 && ALLOWED_MIME_TYPES.includes(file.type)) {
      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] || "png";
      const f = file instanceof File ? file : new File([file], `image-${Date.now()}.${ext}`, { type: file.type });
      resolve({ fileToUpload: f, mimeType: file.type });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const maxDim = 1920; // Full HD
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
        const fallbackMime = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
        const ext = fallbackMime === "image/jpeg" ? "jpg" : "png";
        const f = file instanceof File ? file : new File([file], `image-${Date.now()}.${ext}`, { type: fallbackMime });
        resolve({ fileToUpload: f, mimeType: fallbackMime });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      const targetMime = file.type === "image/png" ? "image/png" : "image/jpeg";
      const quality = 0.85;

      canvas.toBlob(
        (blob) => {
          const mime = blob?.type || targetMime;
          const ext = mime === "image/jpeg" ? "jpg" : "png";
          const finalFile = new File([blob || file], `notion-${Date.now()}.${ext}`, { type: mime });
          resolve({ fileToUpload: finalFile, mimeType: mime });
        },
        targetMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const fallbackMime = file.type && ALLOWED_MIME_TYPES.includes(file.type) ? file.type : "image/png";
      const ext = fallbackMime === "image/jpeg" ? "jpg" : "png";
      const f = file instanceof File ? file : new File([file], `image-${Date.now()}.${ext}`, { type: fallbackMime });
      resolve({ fileToUpload: f, mimeType: fallbackMime });
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
    // 1. Optimizar imagen y convertir a File nativo
    const { fileToUpload, mimeType } = await optimizeImageForUpload(file);

    // 2. Obtener usuario para respetar RLS (storage.foldername(name))[1] = auth.uid()
    let userId = "anonymous";
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        userId = data.session.user.id;
      }
    } catch {
      // Continuar con anonymous
    }

    const ext = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : mimeType === "image/gif" ? "gif" : "png";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    // 3. Subir vía SDK oficial de Supabase con FormData multipart automático
    let { data: uploadData, error: uploadError } = await supabase.storage
      .from("notion-images")
      .upload(filePath, fileToUpload, {
        cacheControl: "31536000",
        upsert: false,
        contentType: mimeType,
      });

    let bucketUsed = "notion-images";

    // 4. Fallback si el bucket notion-images no existe o falla por 404
    if (uploadError) {
      const errMsg = (uploadError.message || "").toLowerCase();
      const isMissingBucket = errMsg.includes("not found") || (uploadError as any).statusCode === "404" || errMsg.includes("bucket");

      if (isMissingBucket) {
        console.warn("Bucket notion-images no disponible. Reintentando subida en library-files...", uploadError);
        const fallbackPath = `apuntes-imagenes/${filePath}`;
        const fallbackResult = await supabase.storage
          .from("library-files")
          .upload(fallbackPath, fileToUpload, {
            cacheControl: "31536000",
            upsert: false,
            contentType: mimeType,
          });

        if (!fallbackResult.error) {
          uploadError = null;
          bucketUsed = "library-files";
          const { data: { publicUrl } } = supabase.storage.from("library-files").getPublicUrl(fallbackPath);
          if (showToast) {
            toast.success("Imagen subida correctamente", { id: toastId });
          }
          return publicUrl;
        }
      }

      // Si no es missing bucket o falló el fallback, lanzar excepción
      throw uploadError;
    }

    // 5. Obtener URL pública directa
    const { data: { publicUrl } } = supabase.storage
      .from(bucketUsed)
      .getPublicUrl(filePath);

    if (!publicUrl) {
      throw new Error("No se pudo generar el enlace público de la imagen");
    }

    if (showToast) {
      toast.success("Imagen subida correctamente", { id: toastId });
    }

    return publicUrl;
  } catch (error: any) {
    console.error("Error al subir imagen a Supabase Storage:", error);
    const friendlyMsg = error?.message?.startsWith("<")
      ? "Error en la respuesta del servidor de archivos"
      : error?.message || "Error al subir la imagen. Verifica tu conexión.";

    if (showToast) {
      toast.error(`Error al subir la imagen: ${friendlyMsg}`, { id: toastId });
    }
    throw error;
  }
}
