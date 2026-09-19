# Refactorización: Módulo Shift

## Resumen

Refactorización del módulo `Shift` para separar responsabilidades de aplicación, dominio e infraestructura. El cambio mueve la auditoría, el envío de notificaciones y la carga de plantillas a componentes dedicados, y reemplaza el contrato posicional de reconstitución de la entidad por un contrato tipado por objeto.

---

## Cambios Principales

### 1. Aislamiento del módulo de Shift

Se creó `ShiftApplicationModule` para agrupar handlers, servicios de aplicación y servicios de dominio relacionados con turnos.

**Beneficios:**
- Reduce el ruido en `ApplicationModule`
- Hace más explícita la frontera del caso de uso
- Permite mover o probar el módulo de forma más aislada

---

### 2. Servicio de auditoría de diffs

Se introdujo `ShiftAuditDiffService` para capturar snapshots del estado del turno y calcular el diff entre dos estados.

**Responsabilidades:**
- Serializar `Shift` a un snapshot estable
- Detectar `changedFields`
- Construir `previousValue` y `newValue`

**Beneficios:**
- El handler deja de duplicar lógica de diff
- La auditoría mantiene un formato homogéneo
- El servicio puede reutilizarse en otros flujos del agregado

---

### 3. Servicio dedicado para notificaciones

Se creó `ShiftNotificationService` para encapsular el envío de correos de actualización de turnos.

**Responsabilidades:**
- Resolver destinatarios
- Construir el HTML a través de `EmailTemplateService`
- Enviar el correo con el servicio de email existente

**Beneficios:**
- El handler no mezcla orquestación con presentación
- La plantilla del correo queda centralizada
- El formato de notificación es más fácil de mantener

---

### 4. Plantilla compartida en infrastructure/common/templates

La plantilla nueva se ubicó junto a las demás plantillas compartidas en `src/infrastructure/common/templates/shift-updated.html`.

**Motivo:**
- El proyecto ya concentra allí las plantillas de email
- Evita duplicar una carpeta paralela solo para una plantilla
- Mantiene una convención uniforme para renderizado

---

### 5. Reconstitución tipada de la entidad Shift

Se reemplazó la firma posicional de `Shift.reconstitute(...)` por `IShiftReconstituteData`.

**Beneficios:**
- Evita errores por orden incorrecto de parámetros
- Documenta mejor el estado requerido por la entidad
- Simplifica el mapeo desde Mongo

---

### 6. Value Objects para fecha y hora

Se incorporaron `ShiftDate` y `ShiftHour` para encapsular parsing y validación.

**Beneficios:**
- La validación deja de estar dispersa
- La entidad gana expresividad
- El parsing se vuelve reutilizable

---

## Patrón Aplicado

### Clean separation of concerns

- `application/` orquesta el caso de uso
- `domain/` contiene reglas y validaciones del agregado
- `infrastructure/` maneja persistencia, templates y envío de correo

### Reutilización de lógica transversal

- La auditoría se centraliza en un servicio de dominio
- Las plantillas de email se centralizan en `EmailTemplateService`

### Contratos más seguros

- Se reemplaza un contrato posicional por un contrato por objeto
- Se reduce la fragilidad del mapeo entre persistencia y dominio

---

## Archivos Relacionados

- `src/application/shift/shift-application.module.ts`
- `src/application/shift/commands/update-shift/update-shift.handler.ts`
- `src/application/shift/services/shift-notification.service.ts`
- `src/domain/shift/services/shift-audit-diff.service.ts`
- `src/domain/shift/entities/shift.entity.ts`
- `src/domain/shift/interfaces/shift.interface.ts`
- `src/domain/shift/value-objects/shift-date.vo.ts`
- `src/domain/shift/value-objects/shift-hour.vo.ts`
- `src/infrastructure/persistence/repositories/mongo-shift.repository.ts`
- `src/infrastructure/common/email-template.service.ts`
- `src/infrastructure/common/templates/shift-updated.html`
