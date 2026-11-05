import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Mapeo de tipos MIME soportados por Supabase Storage en el bucket de imágenes.
 */
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Desregistra service workers problemáticos en caso de interceptación errónea de red
 */
function purgeStaleServiceWorkers(): void {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    });
    if ("caches" in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name).catch(() => {});
        }
      });
    }
  }
}

/**
 * Convierte un Blob o File a string Base64 con Data URL
 */
function fileToBase64(file: File | Blob): Promise<string> {
  if (typeof FileReader === "undefined") {
    return Promise.resolve("");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Realiza una subida directa binaria mediante fetch REST hacia Supabase Storage.
 * Envía el cuerpo como blob nativo con su Content-Type exacto, evitando problemas
 * con multipart boundaries y bypaseando errores de JSON parsing en el cliente.
 */
async function directBinaryUpload(
  bucket: string,
  path: string,
  file: File,
  mimeType: string,
  token?: string
): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const headers: Record<string, string> = {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token || SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": mimeType,
      "x-upsert": "false",
    };

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers,
      body: file,
      cache: "no-store",
    });

    if (res.ok) {
      return { ok: true, status: res.status };
    }

    const text = await res.text();
    let errorMsg = `Error HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      errorMsg = json.message || json.error || errorMsg;
    } catch {
      if (text.includes("<html") || text.includes("<!DOCTYPE")) {
        purgeStaleServiceWorkers();
        errorMsg = "Respuesta HTML inesperada del servidor de archivos";
      }
    }

    return { ok: false, status: res.status, error: errorMsg };
  } catch (err: any) {
    return { ok: false, status: 0, error: err?.message || "Error de conexión" };
  }
}

/**
 * Realiza una subida directa multipart mediante FormData hacia Supabase Storage.
 * Bypasea cualquier problema de parsing interno o interferencia del Service Worker.
 */
async function directFormDataUpload(
  bucket: string,
  path: string,
  file: File,
  token?: string
): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("", file);

    const headers: Record<string, string> = {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token || SUPABASE_PUBLISHABLE_KEY}`,
      "x-upsert": "false",
    };

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers,
      body: formData,
      cache: "no-store",
    });

    if (res.ok) {
      return { ok: true, status: res.status };
    }

    const text = await res.text();
    let errorMsg = `Error HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      errorMsg = json.message || json.error || errorMsg;
    } catch {
      if (text.includes("<html") || text.includes("<!DOCTYPE")) {
        purgeStaleServiceWorkers();
        errorMsg = "Respuesta HTML inesperada del servidor de archivos";
      }
    }

    return { ok: false, status: res.status, error: errorMsg };
  } catch (err: any) {
    return { ok: false, status: 0, error: err?.message || "Error de conexión" };
  }
}

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

    // 2. Obtener usuario y token para respetar RLS y autenticación
    let userId = "anonymous";
    let authToken: string | undefined = undefined;
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        userId = data.session.user.id;
        authToken = data.session.access_token;
      }
    } catch {
      // Continuar con anonymous
    }

    const ext = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : mimeType === "image/gif" ? "gif" : "png";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    // 3. Intento 0: API Backend (Mismo origen, inmune a bloqueos de CORS y Service Workers)
    try {
      const base64Data = await fileToBase64(fileToUpload);
      if (base64Data) {
        const apiRes = await fetch("/api/tabe-actions/upload-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            base64Data,
            mimeType,
            userId,
          }),
        });

        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.ok && json.publicUrl) {
            if (showToast) {
              toast.success("Imagen subida correctamente", { id: toastId });
            }
            return json.publicUrl;
          }
        }
      }
    } catch (apiErr) {
      console.warn("Intento vía /api/tabe-actions/upload-image falló, procediendo con subida directa:", apiErr);
    }

    let bucketUsed = "notion-images";
    let finalPath = filePath;
    let uploaded = false;

    // 4. Intento 1: Subida binaria directa REST (el método más directo y compatible)
    const binaryRes = await directBinaryUpload("notion-images", filePath, fileToUpload, mimeType, authToken);
    if (binaryRes.ok) {
      uploaded = true;
    } else {
      console.warn("Subida binaria a notion-images reportó error, intentando FormData/SDK:", binaryRes.error);

      // Si el error fue por HTML o respuesta inesperada, purgar SW
      if (binaryRes.error?.includes("HTML") || binaryRes.status === 0) {
        purgeStaleServiceWorkers();
      }

      // Intento 2: Direct FormData Upload
      const directRes = await directFormDataUpload("notion-images", filePath, fileToUpload, authToken);
      if (directRes.ok) {
        uploaded = true;
      } else {
        // Intento 3: SDK oficial de Supabase
        try {
          const { error: sdkError } = await supabase.storage
            .from("notion-images")
            .upload(filePath, fileToUpload, {
              cacheControl: "31536000",
              upsert: false,
              contentType: mimeType,
            });

          if (!sdkError) {
            uploaded = true;
          } else {
            console.warn("SDK upload a notion-images falló:", sdkError);
          }
        } catch (sdkEx: any) {
          console.warn("SDK upload exception:", sdkEx);
          purgeStaleServiceWorkers();
        }

        // Intento 4: Fallback al bucket 'library-files'
        if (!uploaded) {
          const fallbackPath = `apuntes-imagenes/${filePath}`;
          const fallbackBin = await directBinaryUpload("library-files", fallbackPath, fileToUpload, mimeType, authToken);

          if (fallbackBin.ok) {
            bucketUsed = "library-files";
            finalPath = fallbackPath;
            uploaded = true;
          } else {
            const fallbackRes = await directFormDataUpload("library-files", fallbackPath, fileToUpload, authToken);
            if (fallbackRes.ok) {
              bucketUsed = "library-files";
              finalPath = fallbackPath;
              uploaded = true;
            } else {
              throw new Error(fallbackRes.error || fallbackBin.error || "No se pudo subir la imagen al servidor.");
            }
          }
        }
      }
    }

    // 4. Generar URL pública directa
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketUsed}/${finalPath}`;

    if (showToast) {
      toast.success("Imagen subida correctamente", { id: toastId });
    }

    return publicUrl;
  } catch (error: any) {
    console.error("Error al subir imagen a Supabase Storage:", error);
    purgeStaleServiceWorkers();

    const rawMsg = String(error?.message || "");
    const friendlyMsg = rawMsg.includes("<") || rawMsg.includes("Unexpected token")
      ? "Error en la respuesta del servidor. Intenta nuevamente."
      : rawMsg || "Error al subir la imagen. Verifica tu conexión.";

    if (showToast) {
      toast.error(`Error al subir la imagen: ${friendlyMsg}`, { id: toastId });
    }
    throw error;
  }
}
