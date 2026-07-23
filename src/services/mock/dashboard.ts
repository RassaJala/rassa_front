// ponytail: mock data — replace with API calls when backend endpoints exist

export interface AdminStats {
  totalProducts: number;
  totalUsers: number;
  totalOrders: number;
  totalFarmers: number;
  totalSellers: number;
  revenue: number;
}

export interface FarmerStats {
  totalProducts: number;
  activeProducts: number;
  ordersReceived: number;
  revenue: number;
}

export interface SellerStats {
  salesToday: number;
  salesWeek: number;
  salesMonth: number;
  pendingDeliveries: number;
  pendingCollections: number;
}

export interface SaleItem {
  id: number;
  product: string;
  quantity: string;
  total: number;
  date: string;
  status: 'Completado' | 'Pendiente' | 'Cancelado';
}

export interface ProductItem {
  id: number;
  name: string;
  price: string;
  stock: number;
  status: 'active' | 'inactive';
  category: string;
  description: string;
}

export function getAdminStats(): AdminStats {
  return {
    totalProducts: 1248,
    totalUsers: 856,
    totalOrders: 432,
    totalFarmers: 48,
    totalSellers: 12,
    revenue: 48250,
  };
}

export function getFarmerStats(): FarmerStats {
  return {
    totalProducts: 12,
    activeProducts: 9,
    ordersReceived: 24,
    revenue: 18500,
  };
}

export function getSellerStats(): SellerStats {
  return {
    salesToday: 2450,
    salesWeek: 14800,
    salesMonth: 42500,
    pendingDeliveries: 3,
    pendingCollections: 2,
  };
}

export function getFarmerProducts(): ProductItem[] {
  return [
    {
      id: 1,
      name: 'Tomates Premium',
      price: '$120/kg',
      stock: 150,
      status: 'active',
      category: 'Verduras',
      description: 'Tomates orgánicos de invernadero',
    },
    {
      id: 2,
      name: 'Pimientos Orgánicos',
      price: '$85/kg',
      stock: 75,
      status: 'active',
      category: 'Verduras',
      description: 'Pimientos sin pesticidas',
    },
    {
      id: 3,
      name: 'Zanahorias',
      price: '$45/kg',
      stock: 300,
      status: 'inactive',
      category: 'Verduras',
      description: 'Zanahorias baby',
    },
    {
      id: 4,
      name: 'Lechugas Baby',
      price: '$60/kg',
      stock: 200,
      status: 'active',
      category: 'Verduras',
      description: 'Lechugas hidropónicas',
    },
    {
      id: 5,
      name: 'Fresas',
      price: '$180/kg',
      stock: 40,
      status: 'active',
      category: 'Frutas',
      description: 'Fresas de temporada',
    },
  ];
}

export function getRecentSales(): SaleItem[] {
  return [
    {
      id: 1,
      product: 'Tomates Premium',
      quantity: '50 kg',
      total: 6000,
      date: 'Hoy, 14:30',
      status: 'Completado',
    },
    {
      id: 2,
      product: 'Fresas',
      quantity: '20 kg',
      total: 3600,
      date: 'Ayer, 10:15',
      status: 'Pendiente',
    },
    {
      id: 3,
      product: 'Lechugas Baby',
      quantity: '100 kg',
      total: 6000,
      date: '12/08, 16:00',
      status: 'Cancelado',
    },
    {
      id: 4,
      product: 'Pimientos Orgánicos',
      quantity: '30 kg',
      total: 2550,
      date: '11/08, 09:45',
      status: 'Completado',
    },
  ];
}

export function getAllProducts(): ProductItem[] {
  const categories = ['Verduras', 'Frutas', 'Granos', 'Lácteos'];
  const productNames: Record<string, string[]> = {
    Verduras: [
      'Tomates Orgánicos',
      'Lechuga Fresca',
      'Pimientos Rojos',
      'Zanahorias Baby',
      'Espinacas',
    ],
    Frutas: ['Fresas', 'Manzanas', 'Naranjas', 'Plátanos', 'Uvas'],
    Granos: ['Maíz Dulce', 'Frijol Negro', 'Arroz Integral', 'Trigo', 'Avena'],
    Lácteos: [
      'Queso Fresco',
      'Yogurt Natural',
      'Leche Entera',
      'Crema',
      'Mantequilla',
    ],
  };

  const products: ProductItem[] = [];
  let id = 1;
  for (const cat of categories) {
    const names = productNames[cat];
    if (!names) continue;
    for (const name of names) {
      const price = Math.floor(Math.random() * 200 + 30);
      products.push({
        id: id++,
        name,
        price: `$${price}/kg`,
        stock: Math.floor(Math.random() * 300 + 10),
        status: Math.random() > 0.2 ? 'active' : 'inactive',
        category: cat,
        description: `${name} de la mejor calidad`,
      });
    }
  }
  return products;
}
