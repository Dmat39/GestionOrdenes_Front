export type EstadoMesa = 'LIBRE' | 'OCUPADA' | 'CUENTA_PENDIENTE';
export type EstadoOrden = 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO' | 'ENTREGADO' | 'CANCELADO';
export type EstadoItem = 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO' | 'ENTREGADO' | 'CANCELADO';
export type MetodoPago = 'EFECTIVO' | 'TARJETA';
export type EstadoPago = 'PENDIENTE' | 'PAGADO';

export interface Categoria {
  id: number;
  nombre: string;
}

export interface Plato {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen_url?: string;
  categoria: Categoria;
  activo: boolean;
}

export interface MenuDiaItem {
  id: number;
  plato: Plato;
  disponible: boolean;
  stock: number | null;
  precio_oferta: number | null;
  etiqueta: string | null;
}

export interface MenuDia {
  id: number;
  fecha: string;
  items: MenuDiaItem[];
}

export interface Mesa {
  id: number;
  numero: number;
  qr_code?: string;
  estado: EstadoMesa;
}

export interface OrdenItem {
  id: number;
  plato: Plato;
  cantidad: number;
  notas?: string;
  estado: EstadoItem;
  created_at: string;
  orden?: {
    id: number;
    visita?: {
      mesa?: Mesa;
    };
  };
}

export interface Orden {
  id: number;
  estado: EstadoOrden;
  created_at: string;
  items: OrdenItem[];
  visita?: {
    id: number;
    mesa?: Mesa;
  };
}

export interface Visita {
  id: number;
  activa: boolean;
  created_at: string;
  mesa: Mesa;
  ordenes: Orden[];
}

export interface Cuenta {
  id: number;
  total: number;
  metodo_pago: MetodoPago | null;
  estado_pago: EstadoPago;
  fecha_pago: string | null;
  created_at: string;
  visita: Visita;
}

export interface CartItem {
  platoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  notas?: string;
}
