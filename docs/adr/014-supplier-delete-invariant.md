# ADR-014: Invariante de Dominio para Eliminación de Supplier

**Fecha:** 2026-04-10  
**Estado:** Aceptado

---

## Contexto

Como parte del flujo administrativo de inventario, un usuario con permisos debe poder eliminar suppliers inactivos.

Sin embargo, existe una regla de negocio crítica: un supplier no puede eliminarse si tiene items de inventario asociados.

Además, el equipo definió dos necesidades explícitas:

1. **BE:** incorporar la validación como invariante de dominio (no solo como validación ad-hoc en la capa de aplicación).
2. **QA:** cubrir el command handler con pruebas unitarias para el caso válido y el caso con dependencias.

En paralelo, el flujo debe mantener trazabilidad mediante auditoría, alineada con el patrón de diff usado en otros módulos.

---

## Decisión

Se adopta una política de eliminación con invariante de dominio para Supplier:

1. La entidad `Supplier` expone `assertCanBeDeleted(associatedItems)`.
2. Si existen asociaciones, la entidad lanza una `DomainException` con el detalle de dependencias (`Nombre (SKU)`).
3. El command handler de eliminación traduce esa excepción a `ConflictException` para respuesta HTTP 409.
4. Si no hay dependencias, se ejecuta eliminación lógica (soft delete) en persistencia.
5. Se registra auditoría del borrado usando diff (`changedFields`, `previousValue`, `newValue`) para mantener consistencia con el patrón aplicado en update-shift.

---

## Razones

### 1. Regla crítica protegida por el dominio

El bloqueo por dependencias representa una regla de negocio central. Ubicarla en la entidad evita que quede dispersa o se omita en futuros casos de uso.

### 2. Error funcional claro para el usuario

El mensaje de conflicto incluye las dependencias detectadas, lo que permite a administración resolver la relación antes de reintentar.

### 3. Coherencia técnica con CQRS y manejo HTTP

El dominio expresa la regla; la aplicación traduce a semántica de transporte (HTTP 409), manteniendo separación de responsabilidades.

### 4. Auditoría consistente

El evento de auditoría del delete sigue el mismo enfoque de diff que otros comandos de actualización, mejorando observabilidad y trazabilidad.

---

## Consecuencias

**Positivas:**

- Se evita eliminar suppliers aún en uso.
- La regla queda centralizada y reusable.
- El error operativo es explícito y accionable.
- La auditoría conserva información de cambio estructurada.

**Negativas:**

- El handler debe mapear excepción de dominio a excepción HTTP.
- Se requiere mantener fixtures/mocks alineados con el contrato de delete del repositorio.

---

## Cobertura de QA

Se agrega cobertura unitaria del command handler de eliminación con al menos:

1. Caso válido: elimina cuando no hay items asociados.
2. Caso con dependencias: bloquea eliminación con conflicto y mensaje con lista de dependencias.

Adicionalmente, se mantiene cobertura de controlador para el disparo del comando de delete desde el endpoint.

---

## Criterios de Aceptación y Alcance

- **Confirmación de eliminación (diálogo):** corresponde a frontend y queda fuera del alcance de este ADR backend.
- **Confirmar y eliminar:** soportado por command handler + repositorio (soft delete).
- **Bloqueo por dependencias y mensaje:** soportado por invariante de dominio + conflicto HTTP.
- **Cancelar diálogo sin cambios:** al no invocar endpoint, backend no realiza mutaciones.
