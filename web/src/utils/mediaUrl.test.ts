import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("VITE_API_URL", "https://api.example.com/api");
});

import { mediaUrl } from "./mediaUrl";

describe("mediaUrl", () => {
  it("returns null for null input", () => {
    expect(mediaUrl(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(mediaUrl(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(mediaUrl("")).toBeNull();
  });

  it("passes through absolute HTTP URLs", () => {
    expect(mediaUrl("http://example.com/img.jpg")).toBe(
      "http://example.com/img.jpg",
    );
  });

  it("passes through absolute HTTPS URLs", () => {
    expect(mediaUrl("https://cdn.example.com/photo.png")).toBe(
      "https://cdn.example.com/photo.png",
    );
  });

  it("strips path traversal from relative paths", () => {
    const result = mediaUrl("/uploads/../../etc/passwd");
    expect(result).toBe("https://api.example.com/uploads/etc/passwd");
    expect(result).not.toContain("..");
  });

  it("prepends base URL to relative paths", () => {
    const result = mediaUrl("/uploads/photo.jpg");
    expect(result).toBe("https://api.example.com/uploads/photo.jpg");
  });

  it("prepends base URL and adds leading slash for paths without one", () => {
    const result = mediaUrl("uploads/photo.jpg");
    expect(result).toBe("https://api.example.com/uploads/photo.jpg");
  });

  it("normalizes leading slashes", () => {
    const result = mediaUrl("///uploads/img.png");
    expect(result).not.toContain("///");
    expect(result).toBe("https://api.example.com/uploads/img.png");
  });

  it("strips encoded traversal sequences", () => {
    const result = mediaUrl("/uploads/%2e%2e/etc/passwd");
    expect(result).toBe("https://api.example.com/uploads/etc/passwd");
    expect(result).not.toContain("%2e");
  });

  it("strips encoded dots case-insensitively", () => {
    const result = mediaUrl("/uploads/%2E%2E/admin");
    expect(result).toBe("https://api.example.com/uploads/admin");
  });
});
