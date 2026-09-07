# ADR-007: MongoDB con Mongoose como Capa de Persistencia

**Fecha:** 2026-01-01  
**Estado:** Sustituido por [ADR-018: PostgreSQL con Prisma](018-postgresql-prisma.md) (2026-09-06)

---

## Contexto

La aplicación gestiona tenants hoteleros, propiedades, unidades, usuarios y sus relaciones. Necesitábamos una base de datos que maneje bien documentos con estructura variable (los atributos de una unidad difieren según su tipo), soporte el aislamiento multi-tenant, e integre naturalmente con el ecosistema NestJS.

## Decisión

Usamos **MongoDB** como base de datos, accedida a través de **Mongoose** mediante `@nestjs/mongoose`. Cada aggregate root tiene una colección dedicada: `tenants`, `users`, `properties`, `units`, `roles`.

Los schemas se definen como clases decoradas usando `@Schema()` / `@Prop()` y se registran por módulo a través de `MongooseModule.forFeature()` dentro de `PersistenceModule`. La URI de conexión se provee a través de la variable de entorno `MONGODB_URI`.

Los índices se definen junto al schema:

```typescript
// Ej. user.schema.ts
UserSchema.index({ email: 1, tenantId: 1 }, { unique: true });
UserSchema.index({ tenantId: 1 });
```

La capa de dominio está completamente aislada de Mongoose. Las implementaciones de repositorios en `infrastructure/persistence/repositories/` son el único lugar donde se importan tipos de Mongoose. Las entidades de dominio se reconstituyen a partir de datos planos mediante los métodos factory `reconstitute()` en cada clase de entidad.

## Consecuencias

**Positivas:**
- La estructura flexible de documentos se adapta a los atributos variables de propiedades/unidades sin migraciones
- `@nestjs/mongoose` se integra limpiamente con el DI de NestJS
- El aislamiento de datos por tenant es directo a través del campo `tenantId` en cada documento

**Negativas:**
- Sin joins forzados — la integridad referencial (ej. `roleId` en `roleAssignments` apuntando a un rol real) debe validarse en la capa de aplicación
- El sistema de tipos de Mongoose requiere castings explícitos en el límite de infraestructura (ej. `doc.roleAssignments as RoleAssignment[]`) ya que los tipos del schema pierden precisión TypeScript en tiempo de ejecución
