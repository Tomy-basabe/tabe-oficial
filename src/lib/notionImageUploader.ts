import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
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
    // Si la imagen es pequeña (< 150KB) y ya tiene formato válido, no requiere recompresión
    if (file.size < 150 * 1024 && ALLOWED_MIME_TYPES.includes(file.type)) {
      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] || "png";
      resolve({ blob: file, mimeType: file.type, extension: ext });
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
 * Función auxiliar para subir binario a Supabase Storage con control estricto de respuesta.
 * Lee siempre `res.text()` para evitar excepciones de `SyntaxError: Unexpected token '<'`.
 */
async function uploadToSupabaseBucket(
  bucket: string,
  path: string,
  blob: Blob,
  mimeType: string,
  token: string
): Promise<{ success: boolean; publicUrl?: string; error?: string; isMissingBucket?: boolean }> {
  try {
    const cleanBaseUrl = SUPABASE_URL.replace(/\/+$/, "");
    const endpoint = `${cleanBaseUrl}/storage/v1/object/${bucket}/${path}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": mimeType,
        "x-upsert": "false",
      },
      body: blob,
    });

    const responseText = await res.text();

    if (res.ok) {
      const publicUrl = `${cleanBaseUrl}/storage/v1/object/public/${bucket}/${path}`;
      return { success: true, publicUrl };
    }

    // Analizar el contenido del error
    const isHtml = responseText.trim().startsWith("<");
    let errorDetail = responseText;

    if (!isHtml) {
      try {
        const json = JSON.parse(responseText);
        errorDetail = json.message || json.error || responseText;
      } catch {}
    } else {
      errorDetail = `Error HTTP ${res.status}`;
    }

    const isMissingBucket =
      res.status === 404 ||
      errorDetail.toLowerCase().includes("not found") ||
      errorDetail.toLowerCase().includes("bucket");

    return {
      success: false,
      error: errorDetail,
      isMissingBucket,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Fallo de conexión al servidor de almacenamiento",
    };
  }
}

/**
 * Sube una imagen a Supabase Storage con compresión inteligente,
 * control de ruta por usuario y tolerancia ante fallos de bucket o proxy.
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
    // 1. Optimizar imagen en cliente
    const { blob, mimeType, extension } = await optimizeImageForUpload(file);

    // 2. Obtener sesión de Supabase
    let userId = "anonymous";
    let token = SUPABASE_PUBLISHABLE_KEY;

    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        userId = data.session.user.id;
      }
      if (data?.session?.access_token) {
        token = data.session.access_token;
      }
    } catch {
      // Continuar con anonymous y publishable key
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;
    const filePath = `${userId}/${fileName}`;

    // 3. Intento 1: Bucket primario 'notion-images'
    let result = await uploadToSupabaseBucket("notion-images", filePath, blob, mimeType, token);

    // 4. Fallback si el bucket 'notion-images' no existe o falla por 404
    if (!result.success && result.isMissingBucket) {
      console.warn("Bucket notion-images no disponible. Probando en library-files...", result.error);
      const fallbackPath = `apuntes-imagenes/${filePath}`;
      result = await uploadToSupabaseBucket("library-files", fallbackPath, blob, mimeType, token);
    }

    // 5. Fallback secundario vía SDK nativo si fetch directo tuvo algún inconveniente
    if (!result.success) {
      console.warn("Intento directo falló, probando vía SDK Supabase Storage:", result.error);
      const { error: sdkError } = await supabase.storage
        .from("notion-images")
        .upload(filePath, blob, {
          cacheControl: "31536000",
          upsert: false,
          contentType: mimeType,
        });

      if (!sdkError) {
        const { data: { publicUrl } } = supabase.storage.from("notion-images").getPublicUrl(filePath);
        if (publicUrl) {
          if (showToast) {
            toast.success("Imagen subida correctamente", { id: toastId });
          }
          return publicUrl;
        }
      }
    }

    if (!result.success || !result.publicUrl) {
      throw new Error(result.error || "No se pudo subir la imagen a Supabase Storage");
    }

    if (showToast) {
      toast.success("Imagen subida correctamente", { id: toastId });
    }

    return result.publicUrl;
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
