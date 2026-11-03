import { describe, it, expect } from "vitest";
import { encodeUserToken, decodeUserToken, isValidUserToken } from "../lib/tabeTokenService";

describe("tabeTokenService", () => {
  const sampleUserId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("codifica y decodifica el token de usuario de forma determinista", () => {
    const token = encodeUserToken(sampleUserId);
    expect(token).toMatch(/^tabe_usr_[0-9a-f]+$/);
    expect(isValidUserToken(token)).toBe(true);

    const decoded = decodeUserToken(token);
    expect(decoded).toBe(sampleUserId);
  });

  it("acepta tokens pasados con Bearer prefix", () => {
    const token = encodeUserToken(sampleUserId);
    const bearer = `Bearer ${token}`;
    expect(decodeUserToken(bearer)).toBe(sampleUserId);
  });

  it("devuelve null ante tokens corruptos o inválidos", () => {
    expect(decodeUserToken("invalid_token")).toBeNull();
    expect(decodeUserToken("tabe_usr_zzzz")).toBeNull();
    expect(decodeUserToken("")).toBeNull();
    expect(isValidUserToken("tabe_usr_1234")).toBe(false);
  });
});
