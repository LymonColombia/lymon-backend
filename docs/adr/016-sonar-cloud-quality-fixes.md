# ADR-016: Resolución de issues SonarCloud a nivel de proyecto

**Fecha:** 2026-05-04  
**Estado:** Aceptado  
**Ticket:** LYMON-839

---

## Contexto

El proyecto se integró con SonarCloud (SonarQube en la nube) para asegurar calidad de código. El análisis inicial identificó ~70+ issues distribuidos en todo el codebase:

- Code smells (funciones con más de 7 parámetros, imports redundantes, loops ineficientes)
- Security issues (uso de crypto sin prefijo `node:`)
- Bugs potenciales (optional chaining defensivo innecesario, type imports incompletos)
- Problemas en templates HTML (atributos deprecated)

---

## Decisión

Se acepta la resolución de todos los issues SonarCloud identificados en una sola pasada (branch `LYMON-839-qa-fix-sonar-issues`), agrupados por categoría funcional:

1. **Infraestructura/CI** — actualizar SonarCloud keys, simplificar comando `sonar` (drop Docker)
2. **Dominio** — refactorizar reconstitute() (parámetros posicionales → objeto tipado)
3. **Aplicación** — fixes en handlers: `node:crypto`, `import type`, loops, optional chaining
4. **Dominio (servicios)** — extraer constantes module-level, agregar `readonly`
5. **Infraestructura (auth/email)** — remover `private` de constructor params, safe chaining
6. **Presentación** — imports explícitos, `@HttpCode`, `Number.parseInt`, templates HTML

**Justificación:** Una única pasada mantiene el contexto coherente y evita merge conflicts. Cada commit es self-contained y documentado.

---

## Consecuencias

### Positivas

✓ SonarCloud score mejora (baseline limpia)  
✓ Establece estándares de código enforzables  
✓ Reduce deuda técnica recién integrada  
✓ Facilita PR reviews futuras (less noise)  

### Negativas

- No cambia arquitectura o comportamiento funcional
- Commits puramente estéticos/linting (no agregue valor directo al usuario)

---

## Referencias

- [SonarCloud integration](../docs/sonar-cloud.md)
- [Refactorización: reconstitute param objects](../refactoring/sonar-reconstitute-param-objects.md)
