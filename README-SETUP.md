# Lymon Backend - Sistema de Gestión Hotelera

## 🚀 Características Implementadas

### ✅ Sistema de Autenticación

- **Registro de usuarios** (`POST /auth/register`)
- **Login de usuarios** (`POST /auth/login`)
- Autenticación mediante JWT (JSON Web Tokens)
- Contraseñas encriptadas con bcrypt
- Guards de protección para rutas privadas

### 🏨 Gestión de Hoteles

- **Registro de hoteles** (`POST /hotels/register`) - Requiere autenticación
- Campos del hotel:
  - Nombre del hotel
  - Subdominio único
  - Ubicación
  - Imagen
  - Color principal (formato hexadecimal)
  - Descripción
- Relación automática con el usuario autenticado

### 🛏️ Gestión de Habitaciones

- **Crear habitación** (`POST /rooms`) - Requiere autenticación
- Campos de la habitación:
  - Número de habitación
  - Nombre descriptivo
  - Tipo de habitación (ID del room-type)
  - Piso
  - Imagen
  - Servicios incluidos (array): WiFi, TV, Aire acondicionado, etc.
  - Descripción
- **Crear tipo de habitación** (`POST /rooms/room-types`) - Requiere autenticación
- **Asignar unidades a tipo de habitación** (`POST /rooms/room-types/assign-units`) - Requiere autenticación

## 📦 Tecnologías Utilizadas

- **NestJS** - Framework backend
- **TypeScript** - Lenguaje de programación
- **PostgreSQL 18** - Base de datos
- **Prisma 7** - ORM
- **Passport & JWT** - Autenticación
- **Bcrypt** - Encriptación de contraseñas
- **Swagger** - Documentación de API

## 🔧 Instalación

1. **Instalar dependencias:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configurar variables de entorno:**

   El archivo \`.env\` ya está configurado con:
   \`\`\`env
   DATABASE_URL=postgresql://lymon:lymon@127.0.0.1:5433/lymon?schema=public
   JWT_SECRET=yourJwt-Secret
   JWT_EXPIRES_IN=yourJwtExpiration
   PORT=yourPort
   NODE_ENV=development
   \`\`\`

   ⚠️ **IMPORTANTE:** levanta Postgres antes de arrancar la API:

   ```bash
   pnpm db:up
   pnpm db:deploy
   ```

   Escucha en el puerto **5433** (no 5432). La base arranca vacía y se llena aplicando
   las migraciones de `prisma/migrations`. Para recrearla desde cero: `pnpm db:reset`.

3. **Compilar el proyecto:**
   \`\`\`bash
   npm run build
   \`\`\`

4. **Iniciar en modo desarrollo:**
   \`\`\`bash
   npm run start:dev
   \`\`\`

## 📚 Documentación de API (Swagger)

Una vez que la aplicación esté corriendo, accede a:

**http://localhost:3000/api/docs**

Aquí encontrarás la documentación interactiva completa con todos los endpoints disponibles.

## 🔐 Flujo de Uso de la Aplicación

### 1. Registrar un Usuario

\`\`\`http
POST /auth/register
Content-Type: application/json

{
"email": "usuario@example.com",
"name": "Juan Pérez",
"password": "password123"
}
\`\`\`

**Respuesta:**
\`\`\`json
{
"user": {
"id": "user\_...",
"email": "usuario@example.com",
"name": "Juan Pérez"
},
"access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
\`\`\`

### 2. Iniciar Sesión

\`\`\`http
POST /auth/login
Content-Type: application/json

{
"email": "usuario@example.com",
"password": "password123"
}
\`\`\`

**Respuesta:**
\`\`\`json
{
"user": {
"id": "user\_...",
"email": "usuario@example.com",
"name": "Juan Pérez"
},
"access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
\`\`\`

### 3. Registrar un Hotel (con token JWT)

\`\`\`http
POST /hotels/register
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
"name": "Hotel Paradise",
"subdomain": "paradise",
"location": "Calle Principal 123, Ciudad",
"image": "https://example.com/hotel.jpg",
"primaryColor": "#FF5733",
"description": "Un hotel de lujo con vistas al mar"
}
\`\`\`

### 4. Crear una Habitación (con token JWT)

\`\`\`http
POST /rooms
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
"roomTypeId": "room-type-id-123",
"hotelId": "hotel-id-456",
"roomNumber": "101",
"name": "Suite Presidencial",
"floor": 1,
"image": "https://example.com/room.jpg",
"amenities": ["WiFi", "TV", "Aire acondicionado", "Minibar"],
"description": "Amplia suite con vista al mar"
}
\`\`\`

## 🗂️ Estructura del Proyecto

\`\`\`
src/
├── application/
│ └── use-cases/ # Casos de uso (lógica de negocio)
│ ├── auth.service.ts # Registro y login
│ ├── register-hotel.use-case.ts
│ ├── create-room.use-case.ts
│ └── ...
├── domain/
│ ├── entities/ # Entidades del dominio
│ │ ├── user.entity.ts
│ │ ├── hotel.entity.ts
│ │ └── room.entity.ts
│ └── repositories/ # Interfaces de repositorios
│ ├── user.repository.ts
│ ├── hotel.repository.ts
│ └── room.repository.ts
├── infrastructure/
│ ├── auth/ # Estrategias y guards de autenticación
│ │ ├── jwt.strategy.ts
│ │ └── jwt-auth.guard.ts
│ ├── controllers/ # Controladores HTTP
│ │ ├── auth/
│ │ ├── hotel/
│ │ └── rooms/
│ ├── dtos/ # Data Transfer Objects
│ │ ├── register-user.dto.ts
│ │ ├── login.dto.ts
│ │ ├── register-hotel.dto.ts
│ │ └── create-room.dto.ts
│ ├── modules/ # Módulos de NestJS
│ │ ├── auth/
│ │ ├── hotels/
│ │ └── rooms/
│ └── persistence/
│ └── persistence/ # Implementación de repositorios con Prisma
│ ├── prisma/ # PrismaService + cliente generado
│ └── repositories/
└── main.ts # Punto de entrada
\`\`\`

## 🔑 Autenticación JWT

Para acceder a las rutas protegidas, debes incluir el token JWT en el header:

\`\`\`
Authorization: Bearer YOUR_JWT_TOKEN
\`\`\`

El token se obtiene al hacer login o al registrarse.

## 📊 Tablas de PostgreSQL

El esquema vive en `prisma/schema/` y cada cambio se aplica con una migración en `prisma/migrations/`:

- **users** - Usuarios de la plataforma
- **hotels** - Hoteles registrados
- **rooms** - Habitaciones de los hoteles
- **roomtypes** - Tipos de habitaciones

## ⚠️ Notas Importantes

1. **Seguridad:**
   - En producción, cambia el `JWT_SECRET` por uno más seguro
   - No compartas las credenciales de la base de datos
   - Configura CORS apropiadamente para tu dominio

2. **PostgreSQL:**
   - Si hay problemas de conexión, revisa que el contenedor `lymon-pg` esté arriba y escuchando en 5433

3. **Desarrollo:**
   - La aplicación usa hot-reload en modo desarrollo
   - Los errores se muestran en la consola
   - Swagger se actualiza automáticamente

## 🐛 Solución de Problemas

### Error de conexión a PostgreSQL

```
Can't reach database server at 127.0.0.1:5433
```

**Solución:**

1. Verifica que el contenedor esté arriba: `docker ps | grep lymon-pg`
2. Si no lo está: `pnpm db:up`
3. Confirma que `DATABASE_URL` en `.env` apunta al puerto **5433**
4. Si el esquema cambió, aplica las migraciones: `pnpm db:deploy` (o `pnpm db:reset`)

### Error de ejecución de scripts en PowerShell

\`\`\`
No se puede cargar el archivo ... porque la ejecución de scripts está deshabilitada
\`\`\`

**Solución:**
\`\`\`powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
\`\`\`

## 📞 Contacto y Soporte

Si tienes problemas o preguntas, revisa:

1. La documentación de Swagger en `/api/docs`
2. Los logs de la aplicación en la consola
3. El estado del contenedor `lymon-pg`

## 🎯 Próximos Pasos Sugeridos

- [ ] Implementar paginación en listados
- [ ] Agregar filtros de búsqueda
- [ ] Implementar sistema de reservas
- [ ] Agregar validaciones adicionales
- [ ] Implementar roles (admin, recepcionista, etc.)
- [ ] Agregar sistema de reportes
- [ ] Implementar carga de imágenes a un servicio cloud (S3, Cloudinary, etc.)
