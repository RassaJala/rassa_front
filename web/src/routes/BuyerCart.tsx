import { PageHeader } from '../components/layout/PageHeader';

const sampleItems = [
  {
    id: 1,
    nombre: 'Tomate orgánico',
    cantidad: 5,
    precio: '$150 / kg',
    subtotal: '$750',
  },
  {
    id: 2,
    nombre: 'Lechuga hidropónica',
    cantidad: 2,
    precio: '$100 / unit',
    subtotal: '$200',
  },
  {
    id: 3,
    nombre: 'Zanahoria baby',
    cantidad: 3,
    precio: '$65 / kg',
    subtotal: '$195',
  },
];

export function BuyerCart() {
  const total = sampleItems.reduce(
    (acc, item) =>
      acc + parseInt(item.subtotal.replace('$', '').replace('.', ''), 10),
    0,
  );

  return (
    <>
      <PageHeader title="Mi Carrito" />
      {sampleItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="mb-4 text-5xl">🛒</span>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Tu carrito está vacío
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Agregá productos desde el catálogo para comenzar tu compra.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sampleItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 text-2xl dark:bg-green-900/30">
                  🥬
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {item.nombre}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.cantidad} x {item.precio}
                  </p>
                </div>
              </div>
              <p className="font-bold text-brand-green-forest">
                {item.subtotal}
              </p>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
              Total
            </p>
            <p className="text-xl font-bold text-brand-green-forest">
              ${total.toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
