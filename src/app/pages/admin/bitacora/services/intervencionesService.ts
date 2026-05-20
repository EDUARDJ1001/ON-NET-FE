const apiHost = process.env.NEXT_PUBLIC_API_HOST || "";

export const ESTADOS_BITACORA = [
  "Borrador",
  "Finalizada",
  "Facturada",
  "Anulada",
] as const;

export type EstadoBitacora = (typeof ESTADOS_BITACORA)[number];

export interface CatalogItem {
  id: number;
  nombre: string;
}

export interface DetalleBitacoraLinea {
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  total: number;
  nota: string;
}

export interface IntervencionTecnica {
  id: number;
  cliente_id: number | null;
  usuario_id: number;
  tipo_servicio_id: number;
  descripcion: string;
  fecha: string;
  observacion: string;
  detalle_bitacora: DetalleBitacoraLinea[];
  total_estimado: number;
  estado: EstadoBitacora;
  cliente_nombre?: string;
  tecnico_nombre?: string;
  tipo_servicio_nombre?: string;
}

export interface IntervencionPayload {
  cliente_id: number | null;
  usuario_id: number;
  tipo_servicio_id: number;
  descripcion: string;
  fecha: string;
  observacion: string;
  detalle_bitacora: DetalleBitacoraLinea[];
  total_estimado: number;
  estado: EstadoBitacora;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const toStringSafe = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
};

const toNumber = (v: unknown, fallback = 0): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};

const toNullablePositiveNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = toNumber(v, Number.NaN);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${String(token)}` } : {};
};

const toInputDate = (value: unknown): string => {
  const raw = toStringSafe(value).trim();
  if (!raw) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeEstado = (value: unknown): EstadoBitacora => {
  const raw = toStringSafe(value).trim().toLowerCase();
  if (raw === "finalizada") return "Finalizada";
  if (raw === "facturada") return "Facturada";
  if (raw === "anulada") return "Anulada";
  return "Borrador";
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const parseResponseError = async (res: Response): Promise<string> => {
  try {
    const data = (await res.json()) as unknown;
    if (isRecord(data)) {
      const msg = toStringSafe(data.message || data.error).trim();
      if (msg) return msg;
    }
  } catch {
    // no-op
  }
  return `Error ${res.status}: ${res.statusText}`;
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...(init?.headers || {}),
  };

  const res = await fetch(`${apiHost}${path}`, { ...init, headers });
  if (!res.ok) {
    throw new ApiError(await parseResponseError(res), res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text.trim()) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
};

const normalizeDetalleLine = (value: unknown): DetalleBitacoraLinea | null => {
  if (!isRecord(value)) return null;

  const descripcion = toStringSafe(value.descripcion).trim();
  const cantidad = toNumber(value.cantidad, 0);
  const unidad = toStringSafe(value.unidad).trim();
  const precioUnitario = toNumber(value.precioUnitario ?? value.precio_unitario, 0);
  const totalRaw = toNumber(value.total, Number.NaN);
  const total = Number.isFinite(totalRaw) ? totalRaw : cantidad * precioUnitario;
  const nota = toStringSafe(value.nota).trim();

  return {
    descripcion,
    cantidad,
    unidad,
    precioUnitario,
    total,
    nota,
  };
};

const parseDetalleBitacora = (value: unknown): DetalleBitacoraLinea[] => {
  let raw: unknown = value;

  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      raw = [];
    }
  }

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => normalizeDetalleLine(item))
    .filter((item): item is DetalleBitacoraLinea => item !== null);
};

const normalizeCatalog = (value: unknown): CatalogItem[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;

      const id = toNumber(item.id, Number.NaN);
      if (!Number.isFinite(id)) return null;

      const nombre =
        toStringSafe(item.nombre).trim() ||
        toStringSafe(item.descripcion).trim() ||
        toStringSafe(item.nombreCargo).trim() ||
        toStringSafe(item.username).trim() ||
        `Item ${id}`;

      return { id, nombre };
    })
    .filter((item): item is CatalogItem => item !== null);
};

const normalizeIntervencion = (value: unknown): IntervencionTecnica | null => {
  if (!isRecord(value)) return null;

  const id = toNumber(value.id, Number.NaN);
  if (!Number.isFinite(id)) return null;

  const detalle = parseDetalleBitacora(value.detalle_bitacora);
  const totalCalculado = detalle.reduce((sum, line) => sum + toNumber(line.total, 0), 0);
  const totalEstimado = toNumber(value.total_estimado, totalCalculado);

  const clienteJoin =
    isRecord(value.cliente) && toStringSafe(value.cliente.nombre)
      ? toStringSafe(value.cliente.nombre)
      : "";
  const usuarioJoin =
    isRecord(value.usuario)
      ? `${toStringSafe(value.usuario.nombre)} ${toStringSafe(value.usuario.apellido)}`.trim()
      : "";
  const tipoJoin =
    isRecord(value.tipo_servicio)
      ? toStringSafe(value.tipo_servicio.nombre || value.tipo_servicio.descripcion)
      : "";

  return {
    id,
    cliente_id: toNullablePositiveNumber(value.cliente_id),
    usuario_id: toNumber(value.usuario_id, 0),
    tipo_servicio_id: toNumber(value.tipo_servicio_id, 0),
    descripcion: toStringSafe(value.descripcion).trim(),
    fecha: toInputDate(value.fecha),
    observacion: toStringSafe(value.observacion).trim(),
    detalle_bitacora: detalle,
    total_estimado: totalEstimado,
    estado: normalizeEstado(value.estado),
    cliente_nombre: toStringSafe(value.cliente_nombre).trim() || clienteJoin || undefined,
    tecnico_nombre: toStringSafe(value.tecnico_nombre).trim() || usuarioJoin || undefined,
    tipo_servicio_nombre:
      toStringSafe(value.tipo_servicio_nombre).trim() || tipoJoin || undefined,
  };
};

const sanitizePayload = (payload: IntervencionPayload): IntervencionPayload => {
  const detalle = payload.detalle_bitacora.map((line) => {
    const cantidad = toNumber(line.cantidad, 0);
    const precioUnitario = toNumber(line.precioUnitario, 0);
    const total = cantidad * precioUnitario;

    return {
      descripcion: toStringSafe(line.descripcion).trim(),
      cantidad,
      unidad: toStringSafe(line.unidad).trim(),
      precioUnitario,
      total,
      nota: toStringSafe(line.nota).trim(),
    };
  });

  const totalEstimado = detalle.reduce((sum, line) => sum + line.total, 0);

  return {
    cliente_id: toNullablePositiveNumber(payload.cliente_id),
    usuario_id: toNumber(payload.usuario_id, 0),
    tipo_servicio_id: toNumber(payload.tipo_servicio_id, 0),
    descripcion: toStringSafe(payload.descripcion).trim(),
    fecha: toInputDate(payload.fecha),
    observacion: toStringSafe(payload.observacion).trim(),
    detalle_bitacora: detalle,
    total_estimado: totalEstimado,
    estado: normalizeEstado(payload.estado),
  };
};

export const getIntervencionesTecnicas = async (): Promise<IntervencionTecnica[]> => {
  const data = await requestJson<unknown>("/api/intervenciones-tecnicas");
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => normalizeIntervencion(item))
    .filter((item): item is IntervencionTecnica => item !== null);
};

export const getIntervencionById = async (id: number): Promise<IntervencionTecnica> => {
  const data = await requestJson<unknown>(`/api/intervenciones-tecnicas/${id}`);
  const item = normalizeIntervencion(data);
  if (!item) throw new Error("No se pudo leer la bitacora");
  return item;
};

export const getIntervencionesByCliente = async (
  clienteId: number
): Promise<IntervencionTecnica[]> => {
  const data = await requestJson<unknown>(`/api/intervenciones-tecnicas/cliente/${clienteId}`);
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => normalizeIntervencion(item))
    .filter((item): item is IntervencionTecnica => item !== null);
};

export const createIntervencion = async (
  payload: IntervencionPayload
): Promise<IntervencionTecnica> => {
  const data = await requestJson<unknown>("/api/intervenciones-tecnicas", {
    method: "POST",
    body: JSON.stringify(sanitizePayload(payload)),
  });

  const item = normalizeIntervencion(data);
  if (!item) throw new Error("No se pudo crear la bitacora");
  return item;
};

export const updateIntervencion = async (
  id: number,
  payload: IntervencionPayload
): Promise<IntervencionTecnica> => {
  const data = await requestJson<unknown>(`/api/intervenciones-tecnicas/${id}`, {
    method: "PUT",
    body: JSON.stringify(sanitizePayload(payload)),
  });

  const item = normalizeIntervencion(data);
  if (!item) throw new Error("No se pudo actualizar la bitacora");
  return item;
};

export const patchEstadoIntervencion = async (
  id: number,
  estado: EstadoBitacora
): Promise<IntervencionTecnica> => {
  const data = await requestJson<unknown>(`/api/intervenciones-tecnicas/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado: normalizeEstado(estado) }),
  });

  const item = normalizeIntervencion(data);
  if (!item) throw new Error("No se pudo actualizar el estado");
  return item;
};

export const anularIntervencion = async (id: number): Promise<void> => {
  await requestJson<unknown>(`/api/intervenciones-tecnicas/${id}`, {
    method: "DELETE",
  });
};

export const getClientesCatalogo = async (): Promise<CatalogItem[]> => {
  const data = await requestJson<unknown>("/api/clientes");
  return normalizeCatalog(data).map((item) => ({
    ...item,
    nombre: item.nombre,
  }));
};

export const getUsuariosCatalogo = async (): Promise<CatalogItem[]> => {
  const data = await requestJson<unknown>("/api/users");
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      if (!isRecord(item)) return null;
      const id = toNumber(item.id, Number.NaN);
      if (!Number.isFinite(id)) return null;
      const nombre = `${toStringSafe(item.nombre)} ${toStringSafe(item.apellido)}`.trim();
      const username = toStringSafe(item.username).trim();

      return {
        id,
        nombre: nombre || username || `Usuario ${id}`,
      };
    })
    .filter((item): item is CatalogItem => item !== null);
};

const TIPO_SERVICIOS_ENDPOINT = "/api/tipo_servicios";

const extractCatalogArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];

  const candidates: unknown[] = [
    value.data,
    value.items,
    value.rows,
    value.result,
    value.tipos,
    value.tipos_servicio,
    value.tipo_servicios,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

export const getTiposServicioCatalogo = async (): Promise<CatalogItem[]> => {
  const data = await requestJson<unknown>(TIPO_SERVICIOS_ENDPOINT);
  const rawList = extractCatalogArray(data);
  return normalizeCatalog(rawList);
};
