# AGENTS.md — LaCarta

> Directrices obligatorias para cualquier agente o desarrollador que trabaje en este repositorio.
> Ante conflicto entre este documento y una suposición propia, **este documento manda**.

---

## 1. Visión del Proyecto

**LaCarta** es una plataforma SaaS **multi-tenant** para restaurantes que permite:

- Publicar un **menú digital** por restaurante (`/{slug}`), mobile-first.
- Recibir **pedidos por WhatsApp** (carrito → mensaje preformateado → `wa.me`).
- Recibir **pedidos desde mesa** escaneando un **QR** (`/{slug}/mesa/{tableId}`).
- Gestionar productos, categorías, horarios y configuración desde un **panel de administración**.

**Objetivo arquitectónico:** el núcleo de negocio debe quedar **desacoplado de la UI** para poder migrar a
apps móviles (iOS/Android vía **Capacitor**) o exponer **APIs REST** consumibles por clientes nativos sin reescribir lógica.

Tenant piloto: **Cowiings** (datos en [`seed-data.json`](./seed-data.json)).

---

## 2. Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| Framework | **Next.js** (App Router) |
| Lenguaje | **TypeScript** en modo `strict` |
| Estilos | **Tailwind CSS** |
| Iconos | **Lucide React** (`lucide-react`) |
| Backend / BD | **Supabase** (PostgreSQL + Auth + Storage) con **Row Level Security (RLS)** |
| Validación | **Zod** para todo input externo (formularios, params, payloads de API) |

No introducir librerías de UI, estado global u ORMs adicionales sin justificarlo y documentarlo aquí.

---

## 3. Arquitectura Multi-Tenant

### 3.1 Modelo de aislamiento
- **Base de datos compartida, esquema compartido**, aislamiento por columna `tenant_id` (UUID).
- **Toda tabla de negocio** (excepto `tenants`) lleva `tenant_id NOT NULL` con FK e índice. Las relaciones entre tablas de negocio usan **FK compuestas `(id, tenant_id)`** para impedir vínculos entre tenants.
- El tenant público se resuelve por **`slug`** (único, URL-safe) → `tenant_id`.
- El tenant del panel se resuelve por el **usuario autenticado** (`tenants.owner_id = auth.uid()`), **nunca** por un parámetro enviado desde el cliente.

### 3.2 Tablas núcleo (ver `supabase/schema.sql`)
`tenants` (con `owner_id`), `categories`, `products`, `tables` (con `qr_token`), `orders`, `order_items`.
Pendientes de modelar: salsas/opciones de producto, horarios de atención (`business_hours`), múltiples miembros por tenant.

### 3.3 Reglas de RLS (obligatorias)
- **RLS habilitado en todas las tablas**. Ninguna tabla queda con RLS desactivado.
- Lectura pública (`anon`) de `tenants`, `categories` y `products` disponibles.
- Escritura solo para el dueño del tenant (`public.is_tenant_owner(tenant_id)`).
- `tables`: solo el dueño. El público valida un QR con la RPC `public.resolve_table(slug, qr_token)`.
- `orders` / `order_items`: el público **no inserta directamente**; usa la RPC `public.place_order(...)`, que recalcula precios desde la BD. Solo el dueño puede leer y cambiar estado. No se borran (auditoría).
- La `service_role` key **solo** se usa en servidor (Route Handlers / Server Actions / scripts de seed). **Jamás** en código cliente ni con prefijo `NEXT_PUBLIC_`.
- Esquema y políticas en `supabase/schema.sql`; datos iniciales en `supabase/seed.sql`. Los cambios posteriores se versionan como migraciones en `supabase/migrations/`.

---

## 4. Estructura de Carpetas

```
app/
  (public)/
    [slug]/
      page.tsx                     # Menú público + carrito flotante + checkout WhatsApp
      mesa/
        [tableId]/
          page.tsx                 # Pedido desde mesa (QR)
  (dashboard)/
    admin/
      layout.tsx                   # Guard de auth + resolución de tenant
      page.tsx                     # Resumen
      productos/...                # CRUD productos y categorías
      horarios/...                 # Horarios de atención
      configuracion/...            # Datos del negocio, WhatsApp, branding, mesas/QR
  api/
    v1/...                         # API REST versionada (contrato para móviles)
components/
  ui/                              # Primitivos reutilizables (Button, Card, Badge, Sheet...)
  menu/                            # Componentes del menú público (ProductCard, CategoryTabs, CartDrawer...)
  admin/                           # Componentes del panel
lib/
  supabase/                        # Clientes: server.ts, client.ts, middleware.ts
  services/                        # Lógica de negocio pura (sin React, sin Next)
  validators/                      # Esquemas Zod
  whatsapp/                        # Construcción del mensaje y URL wa.me
  utils/
types/
  database.ts                      # Tipos generados por Supabase CLI (no editar a mano)
  domain.ts                        # Tipos de dominio
supabase/
  schema.sql                       # Esquema inicial + RLS + RPCs
  seed.sql                         # Tenant piloto (Cowiings)
  migrations/                      # Cambios posteriores versionados
```

### Principio de desacoplamiento
- `lib/services/*` contiene la lógica de negocio (cálculo de totales, validación de horarios, creación de pedidos).
  **No importa** nada de `next/*` ni de React.
- Server Components, Server Actions y `app/api/v1/*` **consumen** los servicios; no duplican lógica.
- Todo flujo que una app móvil necesite debe existir también como endpoint en `app/api/v1/`.

---

## 5. Rutas Clave

### `app/(public)/[slug]/page.tsx` — Menú público
- **Mobile-first**, responsive, rápido (Server Component para datos; Client Components solo donde haya interacción).
- Navegación por categorías, tarjetas de producto con precio en USD, selección de salsas/opciones cuando aplique.
- **Carrito flotante** persistido en `localStorage` **por slug** (no mezclar carritos entre restaurantes).
- **Checkout a WhatsApp**: formulario (nombre, teléfono, tipo de entrega, dirección/referencia si aplica) → mensaje generado en `lib/whatsapp/` → redirección a `https://wa.me/{numero}?text=...`.
- Respetar horario de atención: si el local está cerrado, permitir ver el menú pero indicar claramente que no recibe pedidos.
- `generateMetadata` con título y descripción del restaurante (SEO).
- `notFound()` si el slug no existe o el restaurante está inactivo.

### `app/(public)/[slug]/mesa/[tableId]/page.tsx` — Pedido desde mesa
- Reutiliza los componentes del menú público.
- `tableId` es el `qr_token` de la mesa; se valida con `resolve_table(slug, qr_token)` (si no existe, `notFound()`).
- El pedido se registra con `place_order(..., p_order_type => 'dine_in', p_table_token => qr_token)`; opcionalmente notifica por WhatsApp.
- No solicita dirección de entrega.

### `app/(dashboard)/admin/...` — Panel de administración
- Protegido por Supabase Auth (middleware + verificación en `layout.tsx`).
- Gestión de productos y categorías (incluye disponibilidad, orden e imagen en Supabase Storage).
- Gestión de horarios de atención.
- Configuración del negocio: nombre, slug, número de WhatsApp, costo de envío, colores/branding, mesas y generación de QR.
- Mutaciones vía **Server Actions** validadas con Zod y revalidación (`revalidatePath`) del menú público afectado.

---

## 6. Reglas de Código

1. **TypeScript estricto**: `"strict": true`. **Prohibido `any`** (explícito o implícito). Usar `unknown` + narrowing o tipos precisos. Prohibido `@ts-ignore`; `@ts-expect-error` solo con comentario justificado.
2. **Tipos de BD generados** con Supabase CLI en `types/database.ts`; los tipos de dominio derivan de ellos.
3. **Componentes modulares**: un componente por archivo, responsabilidad única, props tipadas con `interface`. Si un componente supera ~200 líneas, dividirlo.
4. **Server Components por defecto**; `"use client"` solo cuando haya estado, efectos o eventos del navegador.
5. **Validación en el borde**: todo dato que entra desde el cliente o URL pasa por Zod antes de tocar la BD.
6. **Dinero**: precios almacenados como `numeric(10,2)` en BD; cálculos de totales en servidor; formateo con `Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })`.
7. **Estilos**: solo Tailwind; tokens de color del tenant vía CSS variables (permite branding por restaurante). Diseño dark-mode por defecto según identidad del tenant.
8. **Accesibilidad**: elementos interactivos con `id` únicos y descriptivos, `aria-label` en botones de solo icono, contraste AA.
9. **Secretos**: nunca commitear `.env*`; mantener `.env.example` actualizado.
10. **Nombres** de código, variables y comentarios en **inglés**; textos de UI en **español**.

---

## 7. Reglas de Ejecución (Definition of Done)

Una tarea **no se considera completada** hasta que se hayan ejecutado en terminal, sin errores:

```bash
npm run lint          # ESLint sin errores
npm run typecheck     # next typegen + tsc --noEmit
npm run build         # Build de producción exitoso
```

Además:
- Si se modificó el esquema: crear la migración en `supabase/migrations/` y regenerar `types/database.ts`.
- Si se agregó una tabla: incluir sus políticas RLS en la misma migración.
- Reportar al usuario qué comandos se ejecutaron y su resultado. **No afirmar que algo funciona sin haberlo verificado.**
- Si un comando falla y no se puede resolver, informarlo explícitamente en lugar de darlo por terminado.

---

## 8. Datos Semilla

- [`seed-data.json`](./seed-data.json) contiene el menú del tenant piloto (Cowiings) extraído de las fotos en `referencias/`.
- Los **nombres, precios, categorías, salsas, horarios y teléfono** provienen directamente de los menús.
- ⚠️ Algunos campos **no provienen de las referencias** y deben confirmarse con el restaurante antes de usarse como datos reales:
  `delivery.defaultFee`, los códigos hex de `visualIdentity.colors`, `typography`, las descripciones de las salsas,
  los adornos añadidos a descripciones de productos, los `tag`/`badge` y `orderFlowTemplate`.
