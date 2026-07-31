import api from "@/services/api";
import { createOrder } from "@/services/orders";

jest.mock("@/services/api", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

const mockPost = api.post as jest.MockedFunction<typeof api.post>;

describe("createOrder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("envía el payload a /pedidos/ y devuelve el pedido interno desenvuelto", async () => {
    const envelope = {
      ok: true,
      message: "Pedido creado correctamente.",
      data: {
        id_pedido: 34,
        cliente_nombre: "Ana Ramírez",
        estado: "pendiente",
        subtotal: "25.00",
        iva: "5.25",
        total: "30.25",
        detalles: [
          {
            id_detalle: 56,
            fk_producto_semanal: 1,
            nombre_producto: "Tomate Saladet",
            precio_unitario: "25.00",
            cantidad: 1,
            importe: "25.00",
          },
        ],
        creado_en: "2026-07-31T00:25:10Z",
      },
    };
    mockPost.mockResolvedValue({ data: envelope } as never);

    const result = await createOrder({
      items: [{ id_producto_semanal: 1, cantidad: 1 }],
    });

    expect(mockPost).toHaveBeenCalledWith("/pedidos/", {
      items: [{ id_producto_semanal: 1, cantidad: 1 }],
    });
    expect(result).toEqual(envelope.data);
    expect(result.id_pedido).toBe(34);
    expect(result.total).toBe("30.25");
  });
});
