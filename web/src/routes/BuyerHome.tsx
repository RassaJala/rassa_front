import { PageHeader } from '../components/layout/PageHeader';

export function BuyerHome() {
  return (
    <>
      <PageHeader title="Inicio" />
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="mb-4 text-6xl">🌱</span>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Bienvenido a RASSA-JALA
        </h3>
        <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
          Explorá los productos frescos de productores locales. Usá el menú
          lateral para navegar entre las secciones.
        </p>
      </div>
    </>
  );
}
