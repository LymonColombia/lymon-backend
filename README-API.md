# API Endpoints - Lymon Backend

## Estado Actual
✅ Endpoints creados y listos para conexión con base de datos y frontend

## Endpoints Disponibles

### 1. Hotels - Registro de Hoteles

#### POST `/hotels/register`
Registra un nuevo hotel en la plataforma con un subdominio único.

**Request Body:**
```json
{
  "name": "Hotel Paradise",
  "subdomain": "paradise-hotel",
  "ownerEmail": "owner@hotelparadise.com",
  "ownerPassword": "SecurePassword123!"
}
```

**Validaciones:**
- `name`: Requerido, string no vacío
- `subdomain`: Requerido, solo minúsculas, números y guiones (regex: `^[a-z0-9-]+$`)
- `ownerEmail`: Requerido, formato email válido
- `ownerPassword`: Requerido, mínimo 8 caracteres

**Response exitoso (201):**
```json
{
  "id": "uuid-v4",
  "name": "Hotel Paradise",
  "subdomain": "paradise-hotel",
  "ownerEmail": "owner@hotelparadise.com",
  "createdAt": "2026-01-30T10:00:00.000Z"
}
```

**Response error (400):**
```json
{
  "statusCode": 400,
  "message": "Subdomain is already taken. Please choose another one.",
  "error": "Bad Request"
}
```

---

### 2. Colaborators - Registro de Colaboradores

#### POST `/colaborator/register`
Registra un nuevo colaborador en el hotel.

**Request Body:**
```json
{
  "name": "Juan",
  "lastName": "Pérez",
  "email": "juan.perez@hotel.com",
  "phone": "1234567891",
  "role": "Recepcionista",
  "password": "password123"
}
```

**Roles disponibles:**
- `Gerente`
- `Recepcionista`
- `Limpieza`

**Response exitoso (201):**
```json
{
  "id": "uuid",
  "name": "Juan",
  "lastName": "Pérez",
  "email": "juan.perez@hotel.com",
  "phone": "1234567891",
  "role": "Recepcionista",
  "isActive": true
}
```

---

### 3. Rooms - Gestión de Tipos de Habitaciones y Unidades Físicas

#### POST `/rooms/room-types`
Crea un nuevo tipo de habitación con sus especificaciones.

**Request Body:**
```json
{
  "hotelId": "507f1f77bcf86cd799439011",
  "name": "Deluxe Suite",
  "description": "Spacious suite with ocean view and private balcony",
  "basePrice": 150.00,
  "maxOccupancy": 4,
  "amenities": ["Wi-Fi", "TV", "Air Conditioning", "Mini Bar", "Ocean View"]
}
```

**Validaciones:**
- `hotelId`: Requerido, ID del hotel
- `name`: Requerido, nombre del tipo de habitación
- `description`: Requerido, descripción detallada
- `basePrice`: Requerido, precio base por noche (≥ 0)
- `maxOccupancy`: Requerido, capacidad máxima de huéspedes (≥ 1)
- `amenities`: Opcional, array de amenidades

**Response exitoso (201):**
```json
{
  "id": "uuid-v4",
  "hotelId": "507f1f77bcf86cd799439011",
  "name": "Deluxe Suite",
  "description": "Spacious suite with ocean view and private balcony",
  "basePrice": 150.00,
  "maxOccupancy": 4,
  "amenities": ["Wi-Fi", "TV", "Air Conditioning", "Mini Bar", "Ocean View"],
  "createdAt": "2026-01-30T10:00:00.000Z"
}
```

---

#### POST `/rooms/room-types/assign-units`
Asigna unidades físicas (habitaciones) a un tipo de habitación.

**Request Body:**
```json
{
  "hotelId": "507f1f77bcf86cd799439011",
  "roomTypeId": "507f1f77bcf86cd799439012",
  "rooms": [
    { "roomNumber": "101", "floor": 1 },
    { "roomNumber": "102", "floor": 1 },
    { "roomNumber": "201", "floor": 2 },
    { "roomNumber": "202", "floor": 2 }
  ]
}
```

**Validaciones:**
- `hotelId`: Requerido, ID del hotel
- `roomTypeId`: Requerido, ID del tipo de habitación
- `rooms`: Requerido, array de unidades físicas
  - `roomNumber`: Requerido, número/código único de habitación
  - `floor`: Requerido, número de piso (≥ 0)

**Validaciones de negocio:**
- El tipo de habitación debe existir
- El tipo de habitación debe pertenecer al hotel especificado
- No puede haber números de habitación duplicados en la solicitud
- Los números de habitación deben ser únicos por hotel

**Response exitoso (201):**
```json
[
  {
    "id": "uuid-v4-1",
    "roomTypeId": "507f1f77bcf86cd799439012",
    "hotelId": "507f1f77bcf86cd799439011",
    "roomNumber": "101",
    "floor": 1,
    "status": "available",
    "createdAt": "2026-01-30T10:00:00.000Z"
  },
  {
    "id": "uuid-v4-2",
    "roomTypeId": "507f1f77bcf86cd799439012",
    "hotelId": "507f1f77bcf86cd799439011",
    "roomNumber": "102",
    "floor": 1,
    "status": "available",
    "createdAt": "2026-01-30T10:00:00.000Z"
  }
]
```

**Estados de habitación:**
- `available`: Disponible para reserva
- `occupied`: Ocupada
- `maintenance`: En mantenimiento
- `out_of_service`: Fuera de servicio

**Response error (400):**
```json
{
  "statusCode": 400,
  "message": "Room number 101 already exists in this hotel",
  "error": "Bad Request"
}
```

---

## Documentación Swagger

Una vez que el servidor esté corriendo, accede a:
```
http://localhost:3000/api
```

Ahí encontrarás la documentación interactiva de Swagger con todos los endpoints disponibles.

---

## Configuración para Conexión a Base de Datos

### Archivo `.env`
Configura la conexión a PostgreSQL:

```env
# PostgreSQL Connection
DATABASE_URL=postgresql://lymon:lymon@127.0.0.1:5433/lymon?schema=public


# Application
PORT=3000
NODE_ENV=development
```

### Reiniciar Aplicación
Después de configurar el `.env`:
```bash
npm run start:dev
```

---

## Arquitectura Implementada

### Estructura de Carpetas
```
src/
├── domain/                      # Capa de Dominio (lógica de negocio)
│   ├── entities/
│   │   ├── hotel.entity.ts      ✅
│   │   ├── colaborator.entity.ts ✅
│   │   ├── room-type.entity.ts  ✅
│   │   └── room.entity.ts       ✅
│   └── repositories/
│       ├── hotel.repository.ts   ✅
│       ├── colaborator.repository.ts ✅
│       ├── room-type.repository.ts ✅
│       └── room.repository.ts    ✅
│
├── application/                 # Capa de Aplicación (casos de uso)
│   └── use-cases/
│       ├── register-hotel.use-case.ts ✅
│       ├── register-colaborator.use-case.ts ✅
│       ├── create-room-type.use-case.ts ✅
│       └── assign-room-units.use-case.ts ✅
│
├── infrastructure/              # Capa de Infraestructura
│   ├── controllers/
│   │   ├── hotel/
│   │   │   └── hotel.controller.ts ✅
│   │   ├── colaborator/
│   │   │   └── colaborator.controller.ts ✅
│   │   └── rooms/
│   │       └── room.controller.ts ✅
│   ├── dtos/
│   │   ├── register-hotel.dto.ts ✅
│   │   ├── register-colaborator.dto.ts ✅
│   │   ├── create-room-type.dto.ts ✅
│   │   └── assign-room-units.dto.ts ✅
│   ├── modules/
│   │   ├── hotels/
│   │   │   └── hotels.module.ts ✅
│   │   ├── colaborators/
│   │   │   └── colaborators.module.ts ✅
│   │   └── rooms/
│   │       └── rooms.module.ts ✅
│   └── persistence/
│       └── prisma/
│           ├── hotel.schema.ts ✅
│           ├── colaborator.schema.ts ✅
│           ├── room-type.schema.ts ✅
│           ├── room.schema.ts ✅
│           └── repositories/
│               ├── hotel.repository.ts ✅
│               ├── colaborator.repository.ts ✅
│               ├── room-type.repository.ts ✅
│               └── room.repository.ts ✅
```

### Seguridad Implementada
- ✅ Hash de contraseñas con bcrypt
- ✅ Validación de inputs con class-validator
- ✅ Validación de formato de subdominios
- ✅ Verificación de unicidad (subdomain, email)

---

## Próximos Pasos para Integración

### Backend:
1. Configurar `DATABASE_URL` en `.env`
2. Configurar la cadena de conexión correcta
3. Reiniciar el servidor
4. Los endpoints funcionarán automáticamente

### Frontend:
1. Consumir `POST /hotels/register` para registro de hoteles
2. Consumir `POST /colaborator/register` para registro de colaboradores
3. Consumir `POST /rooms/room-types` para crear tipos de habitaciones
4. Consumir `POST /rooms/room-types/assign-units` para asignar unidades físicas
5. Base URL: `http://localhost:3000` (desarrollo)

### Ejemplo de llamada desde Frontend:
```typescript
// 1. Registro de hotel
const hotelResponse = await fetch('http://localhost:3000/hotels/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Hotel Paradise',
    subdomain: 'paradise-hotel',
    ownerEmail: 'owner@hotelparadise.com',
    ownerPassword: 'SecurePassword123!'
  })
});
const hotel = await hotelResponse.json();

// 2. Crear tipo de habitación
const roomTypeResponse = await fetch('http://localhost:3000/rooms/room-types', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hotelId: hotel.id,
    name: 'Deluxe Suite',
    description: 'Spacious suite with ocean view',
    basePrice: 150.00,
    maxOccupancy: 4,
    amenities: ['Wi-Fi', 'TV', 'Air Conditioning', 'Mini Bar']
  })
});
const roomType = await roomTypeResponse.json();

// 3. Asignar unidades físicas
const roomsResponse = await fetch('http://localhost:3000/rooms/room-types/assign-units', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hotelId: hotel.id,
    roomTypeId: roomType.id,
    rooms: [
      { roomNumber: '101', floor: 1 },
      { roomNumber: '102', floor: 1 },
      { roomNumber: '201', floor: 2 }
    ]
  })
});
const assignedRooms = await roomsResponse.json();
```

---

## Testing

Los tests están listos en:
- `src/infrastructure/controllers/hotel/hotel.controller.spec.ts`
- `src/infrastructure/controllers/colaborator/colaborator.controller.spec.ts`
- `src/infrastructure/controllers/rooms/room.controller.spec.ts`

Ejecutar tests:
```bash
npm test
```

---

## Documentación Adicional

Ver `docs/hotel-registration.md` para más detalles sobre la implementación del registro de hoteles.
