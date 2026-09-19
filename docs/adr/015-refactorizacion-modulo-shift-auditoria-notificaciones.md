# ADR-015: Refactorización del módulo Shift, auditoría y notificaciones

**Fecha:** 2026-04-13  
**Estado:** Aceptado

---

## Contexto

El flujo de actualización de turnos (`Shift`) estaba creciendo en responsabilidad. El command handler concentraba validación de datos, resolución de dependencias, verificación de solapamientos, persistencia, construcción de auditoría y envío de correos.

Además, la reconstitución de la entidad `Shift` seguía un contrato posicional difícil de mantener, y la auditoría de cambios se repetía como lógica local en los handlers. Eso aumentaba el riesgo de errores por orden de parámetros, duplicación de diff y acoplamiento innecesario con el formato del correo.

---

## Decisión

Se acepta la refactorización del módulo `Shift` para separar responsabilidades y mover la lógica repetida a servicios dedicados.

La implementación detallada de esta refactorización queda documentada en [docs/refactoring/shift-module-refactoring.md](../refactoring/shift-module-refactoring.md).

## Razón

El objetivo principal era reducir acoplamiento y mejorar la mantenibilidad sin cambiar el comportamiento funcional del flujo.

## Consecuencias

**Positivas:**

- El dominio de `Shift` queda mejor separado por responsabilidades.
- La auditoría de cambios es reutilizable y consistente.
- El envío de correo deja de estar acoplado al handler.
- La reconstitución de la entidad es más segura y legible.
- El bootstrap de la aplicación queda más modular.

**Negativas:**

- Se introduce más estructura: módulos, servicios y value objects adicionales.
- La ruta de actualización de turnos tiene más piezas que coordinar.
- El equipo debe seguir el nuevo contrato de reconstitución y el servicio de auditoría al crear futuros casos de uso.


