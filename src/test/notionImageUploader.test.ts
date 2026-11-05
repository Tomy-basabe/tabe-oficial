import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadNotionImage } from "@/lib/notionImageUploader";

vi.mock("@/integrations/supabase/client", () => ({
  SUPABASE_URL: "https://ndmjrcinfugswtlknebl.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "fake-key",
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: "test-user-123" },
            access_token: "mock-token",
          },
        },
      }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: "test-user-123/img.png" },
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: "https://ndmjrcinfugswtlknebl.supabase.co/storage/v1/object/public/notion-images/test-user-123/img.png" },
        }),
      }),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("uploadNotionImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true, publicUrl: "https://ndmjrcinfugswtlknebl.supabase.co/storage/v1/object/public/notion-images/test-user-123/img.png" }),
      text: vi.fn().mockResolvedValue(JSON.stringify({ Key: "notion-images/test.png" })),
    }) as any;
  });

  it("sube una imagen válida y devuelve la URL pública de Supabase", async () => {
    const file = new File(["dummy png content"], "test.png", { type: "image/png" });
    const url = await uploadNotionImage(file, { showToastFeedback: false });

    expect(url).toContain("https://ndmjrcinfugswtlknebl.supabase.co/storage/v1/object/public/");
    expect(url).toContain("test-user-123");
  });

  it("maneja el fallback correctamente si el primer intento directo falla", async () => {
    // Primer fetch falla, reintento vía SDK funciona
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue("Server Error"),
    }) as any;

    const file = new File(["dummy png content"], "test.png", { type: "image/png" });
    const url = await uploadNotionImage(file, { showToastFeedback: false });

    expect(url).toContain("notion-images");
  });
});
