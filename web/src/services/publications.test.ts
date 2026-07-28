import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG_PAGE_SIZE } from "../constants/api";

vi.mock("./api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from "./api";
import { assertValidId } from "../constants/api";
import {
  PUBLICACION_ESTADOS,
  addProductoSemanal,
  closePublicacion,
  createPublicacion,
  deleteProductoSemanal,
  deletePublicacion,
  getCatalogProductos,
  getPublicacion,
  getPublicaciones,
  getProductosSemanales,
  getUnidades,
  publishPublicacion,
  updateProductoSemanal,
  uploadProductoSemanalImagen,
} from "./publications";

const mockedApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PUBLICACION_ESTADOS", () => {
  it("has correct values", () => {
    expect(PUBLICACION_ESTADOS.BORRADOR).toBe("borrador");
    expect(PUBLICACION_ESTADOS.PUBLICADO).toBe("publicado");
    expect(PUBLICACION_ESTADOS.CERRADO).toBe("cerrado");
    expect(PUBLICACION_ESTADOS.CANCELADO).toBe("cancelado");
  });
});

describe("getPublicaciones", () => {
  it("calls GET /publicaciones/", async () => {
    mockedApi.get.mockResolvedValue({
      data: { data: { count: 0, results: [] } },
    });
    const result = await getPublicaciones();
    expect(mockedApi.get).toHaveBeenCalledWith("/publicaciones/", {
      params: undefined,
    });
    expect(result).toEqual({ data: { count: 0, results: [] } });
  });

  it("passes estado filter", async () => {
    mockedApi.get.mockResolvedValue({
      data: { data: { count: 0, results: [] } },
    });
    await getPublicaciones({ estado: "borrador" });
    expect(mockedApi.get).toHaveBeenCalledWith("/publicaciones/", {
      params: { estado: "borrador" },
    });
  });
});

describe("getPublicacion", () => {
  it("calls GET /publicaciones/:id/", async () => {
    mockedApi.get.mockResolvedValue({ data: { data: { id_publicacion: 1 } } });
    const result = await getPublicacion(1);
    expect(mockedApi.get).toHaveBeenCalledWith("/publicaciones/1/");
    expect(result).toEqual({ data: { id_publicacion: 1 } });
  });
});

describe("createPublicacion", () => {
  it("calls POST /publicaciones/", async () => {
    mockedApi.post.mockResolvedValue({ data: { data: { id_publicacion: 1 } } });
    const result = await createPublicacion();
    expect(mockedApi.post).toHaveBeenCalledWith("/publicaciones/");
    expect(result).toEqual({ data: { id_publicacion: 1 } });
  });
});

describe("deletePublicacion", () => {
  it("calls DELETE /publicaciones/:id/", async () => {
    mockedApi.delete.mockResolvedValue({ data: { data: null } });
    const result = await deletePublicacion(42);
    expect(mockedApi.delete).toHaveBeenCalledWith("/publicaciones/42/");
    expect(result).toEqual({ data: null });
  });
});

describe("publishPublicacion", () => {
  it("calls POST /publicaciones/:id/publish/", async () => {
    mockedApi.post.mockResolvedValue({ data: { data: { id_publicacion: 1 } } });
    const result = await publishPublicacion(1);
    expect(mockedApi.post).toHaveBeenCalledWith("/publicaciones/1/publish/");
    expect(result).toEqual({ data: { id_publicacion: 1 } });
  });
});

describe("closePublicacion", () => {
  it("calls POST /publicaciones/:id/close/", async () => {
    mockedApi.post.mockResolvedValue({ data: { data: { id_publicacion: 1 } } });
    const result = await closePublicacion(1);
    expect(mockedApi.post).toHaveBeenCalledWith("/publicaciones/1/close/");
    expect(result).toEqual({ data: { id_publicacion: 1 } });
  });
});

describe("addProductoSemanal", () => {
  it("calls POST /publicaciones/:pubId/productos/", async () => {
    const payload = { fk_producto: 1, fk_unidad: 1, stock: 10, precio: 500 };
    mockedApi.post.mockResolvedValue({
      data: { data: { id_producto_semanal: 1 } },
    });
    const result = await addProductoSemanal(5, payload);
    expect(mockedApi.post).toHaveBeenCalledWith(
      "/publicaciones/5/productos/",
      payload,
    );
    expect(result).toEqual({ data: { id_producto_semanal: 1 } });
  });
});

describe("updateProductoSemanal", () => {
  it("calls PATCH with correct path", async () => {
    mockedApi.patch.mockResolvedValue({
      data: { data: { id_producto_semanal: 1 } },
    });
    const result = await updateProductoSemanal(5, 10, { stock: 20 });
    expect(mockedApi.patch).toHaveBeenCalledWith(
      "/publicaciones/5/productos/10/",
      { stock: 20 },
    );
    expect(result).toEqual({ data: { id_producto_semanal: 1 } });
  });
});

describe("deleteProductoSemanal", () => {
  it("calls DELETE with correct path", async () => {
    mockedApi.delete.mockResolvedValue({ data: { data: null } });
    const result = await deleteProductoSemanal(5, 10);
    expect(mockedApi.delete).toHaveBeenCalledWith(
      "/publicaciones/5/productos/10/",
    );
    expect(result).toEqual({ data: null });
  });
});

describe("uploadProductoSemanalImagen", () => {
  it("calls POST with multipart and 60s timeout", async () => {
    const formData = new FormData();
    mockedApi.post.mockResolvedValue({
      data: { data: { id_producto_semanal: 1 } },
    });
    const result = await uploadProductoSemanalImagen(5, 10, formData);
    expect(mockedApi.post).toHaveBeenCalledWith(
      "/publicaciones/5/productos/10/imagen/",
      formData,
      { headers: { "Content-Type": "multipart/form-data" }, timeout: 60_000 },
    );
    expect(result).toEqual({ data: { id_producto_semanal: 1 } });
  });
});

describe("getCatalogProductos", () => {
  it("calls GET /productos/", async () => {
    mockedApi.get.mockResolvedValue({ data: { data: { results: [] } } });
    await getCatalogProductos();
    expect(mockedApi.get).toHaveBeenCalledWith("/productos/", {
      params: { page_size: CATALOG_PAGE_SIZE },
    });
  });
});

describe("getUnidades", () => {
  it("calls GET /unidades/", async () => {
    mockedApi.get.mockResolvedValue({ data: { data: [] } });
    await getUnidades();
    expect(mockedApi.get).toHaveBeenCalledWith("/unidades/");
  });
});

describe("assertValidId", () => {
  it("accepts positive integers", () => {
    expect(() => assertValidId(1)).not.toThrow();
    expect(() => assertValidId(42)).not.toThrow();
  });

  it("throws for zero", () => {
    expect(() => assertValidId(0)).toThrow("Invalid ID: 0");
  });

  it("throws for negative", () => {
    expect(() => assertValidId(-1)).toThrow("Invalid ID: -1");
  });

  it("throws for float", () => {
    expect(() => assertValidId(1.5)).toThrow("Invalid ID: 1.5");
  });

  it("throws for NaN", () => {
    expect(() => assertValidId(NaN)).toThrow("Invalid ID: NaN");
  });

  it("throws for Infinity", () => {
    expect(() => assertValidId(Infinity)).toThrow("Invalid ID: Infinity");
  });

  it("uses custom label", () => {
    expect(() => assertValidId(0, "publicacion")).toThrow(
      "Invalid publicacion: 0",
    );
  });

  // ── Security: ID injection prevention ─────────────────────

  it("SECURITY: rejects Number.MAX_SAFE_INTEGER + 1 (precision loss)", () => {
    const unsafe = Number.MAX_SAFE_INTEGER + 1;
    expect(() => assertValidId(unsafe)).toThrow();
  });

  it("SECURITY: rejects negative zero", () => {
    expect(() => assertValidId(-0)).toThrow("Invalid ID: 0");
  });

  it("SECURITY: rejects Number.MIN_VALUE (subnormal)", () => {
    expect(() => assertValidId(Number.MIN_VALUE)).toThrow();
  });

  it("SECURITY: rejects -Infinity", () => {
    expect(() => assertValidId(-Infinity)).toThrow();
  });

  it("SECURITY: rejects very large float near MAX_SAFE_INTEGER", () => {
    expect(() => assertValidId(9007199254740992.5)).toThrow();
  });

  it("SECURITY: rejects extremely small positive float", () => {
    expect(() => assertValidId(0.000001)).toThrow();
  });

  // ── Security: service function guards ─────────────────────

  it("SECURITY: getPublicacion rejects invalid IDs", async () => {
    await expect(getPublicacion(0)).rejects.toThrow("Invalid publicacion: 0");
    await expect(getPublicacion(-1)).rejects.toThrow("Invalid publicacion: -1");
  });

  it("SECURITY: deletePublicacion rejects invalid IDs", async () => {
    await expect(deletePublicacion(NaN)).rejects.toThrow(
      "Invalid publicacion: NaN",
    );
  });

  it("SECURITY: publishPublicacion rejects invalid IDs", async () => {
    await expect(publishPublicacion(0)).rejects.toThrow(
      "Invalid publicacion: 0",
    );
  });

  it("SECURITY: closePublicacion rejects invalid IDs", async () => {
    await expect(closePublicacion(-5)).rejects.toThrow(
      "Invalid publicacion: -5",
    );
  });

  it("SECURITY: addProductoSemanal rejects invalid pubId", async () => {
    await expect(
      addProductoSemanal(0, {
        fk_producto: 1,
        fk_unidad: 1,
        stock: 10,
        precio: 100,
      }),
    ).rejects.toThrow("Invalid publicacion: 0");
  });

  it("SECURITY: updateProductoSemanal rejects invalid pubId", async () => {
    await expect(updateProductoSemanal(-1, 1, { precio: 200 })).rejects.toThrow(
      "Invalid publicacion: -1",
    );
  });

  it("SECURITY: updateProductoSemanal rejects invalid itemId", async () => {
    await expect(updateProductoSemanal(1, 0, { precio: 200 })).rejects.toThrow(
      "Invalid producto_semanal: 0",
    );
  });

  it("SECURITY: deleteProductoSemanal rejects invalid IDs", async () => {
    await expect(deleteProductoSemanal(NaN, 1)).rejects.toThrow();
    await expect(deleteProductoSemanal(1, NaN)).rejects.toThrow();
  });

  it("SECURITY: uploadProductoSemanalImagen rejects invalid pubId", async () => {
    await expect(
      uploadProductoSemanalImagen(0, 1, new FormData()),
    ).rejects.toThrow("Invalid publicacion: 0");
  });

  it("SECURITY: uploadProductoSemanalImagen rejects invalid itemId", async () => {
    await expect(
      uploadProductoSemanalImagen(1, -1, new FormData()),
    ).rejects.toThrow("Invalid producto_semanal: -1");
  });

  it("SECURITY: getProductosSemanales rejects invalid pubId", async () => {
    await expect(getProductosSemanales(0)).rejects.toThrow(
      "Invalid publicacion: 0",
    );
  });
});
