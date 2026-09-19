# Refactorización: Entidad Property

## Resumen
Refactorización de la entidad `Property` para implementar patrones de **Clean Architecture** y **Domain-Driven Design (DDD)**, mejorando la encapsulación de la lógica de negocio y validación.

---

## Cambios Principales

### 1. **Estructura con Aggregate Root Pattern**
La clase `Property` ahora actúa como un Aggregate Root que encapsula toda la lógica de negocio relacionada con propiedades.

```typescript
export class Property {
  private constructor(...);
  static create(props: PropertyProps): Property;
  static reconstitute(...): Property;
}
```

**Beneficios:**
- Validación centralizada en el momento de creación
- Control total sobre las transiciones de estado
- Prevención de estados inválidos

---

### 2. **Métodos Estáticos para Creación**

#### `create(props: PropertyProps): Property`
- **Propósito:** Crear una nueva propiedad
- **Responsabilidades:**
  - Validar que el nombre no esté vacío
  - Validar que la dirección no esté vacía
  - Normalizar datos (trim)
  - Inicializar timestamps (createdAt, updatedAt)
  - Asignar null al ID (por asignar en la persistencia)

```typescript
static create(props: PropertyProps): Property {
  if (!props.name || props.name.trim() === '') {
    throw new Error('Property name cannot be empty');
  }
  if (!props.address || props.address.trim() === '') {
    throw new Error('Property address cannot be empty');
  }
  // ...resto de validaciones e inicialización
}
```

#### `reconstitute(id: PropertyId, props: PropertyProps, timestamps): Property`
- **Propósito:** Reconstruir una entidad desde la persistencia
- **Responsabilidades:**
  - Cargar el estado completo desde la base de datos
  - Restaurar timestamps originales
  - No realizar validaciones (datos ya validados)

---

### 3. **Interfaz PropertyProps**
Define la estructura de datos para crear una propiedad:

```typescript
export interface PropertyProps {
  tenantId: TenantId;
  name: string;
  description: string;
  propertyType: PropertyType;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  location: Location;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: CancellationPolicy;
  hostPhone: string;
  hostEmail: string;
}
```

**Características:**
- Usa Value Objects (TenantId, PropertyType, Location, CancellationPolicy)
- Separa datos de presentación de datos de dominio
- Type-safe y validable

---

### 4. **Interfaz PropertyUpdateData**
Define qué campos pueden ser actualizados:

```typescript
export interface PropertyUpdateData {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  location: Location;
}
```

**Nota:** No incluye campos inmutables como `tenantId`, `propertyType`, `createdAt`, etc.

---

### 5. **Getters para Inmutabilidad**
Todos los atributos se exponen únicamente a través de getters:

```typescript
getId(): PropertyId | null
getTenantId(): TenantId
getName(): string
getDescription(): string
getPropertyType(): PropertyType
// ... más getters
```

**Beneficios:**
- Encapsulación total
- Cambios futuros no rompen el código cliente
- Control sobre validaciones en accesos

---

### 6. **Método updateDetails()**
Actualiza los datos mutables de la propiedad:

```typescript
updateDetails(data: PropertyUpdateData): void {
  if (data.name && data.name.trim() !== '') {
    this.name = data.name.trim();
  }
  if (data.description !== undefined) {
    this.description = data.description.trim();
  }
  // ... validación y actualización de cada campo
}
```

**Características:**
- Validación condicional por campo
- Normalización de espacios en blanco
- Solo actualiza si los datos son válidos
- Automáticamente actualiza `updatedAt` (implícito en persistencia)

---

## Patrones Implementados

### 1. **Entity Encapsulation**
- Constructor privado
- Exposición solo a través de factory methods y getters
- Previene instanciación directa e inesperada

### 2. **Value Objects**
Uso de Value Objects para conceptos del dominio:
- `TenantId`: Identificador del inquilino
- `PropertyType`: Tipo de propiedad
- `Location`: Ubicación geográfica
- `CancellationPolicy`: Política de cancelación

### 3. **Aggregate Pattern**
- La entidad `Property` es el Aggregate Root
- Contiene toda la lógica de cambios de estado
- Garantiza consistencia e invariantes de negocio

### 4. **Immutability Where It Matters**
- Campos como `id`, `tenantId`, `propertyType`, `createdAt` son finales
- Solo campos de actualización frecuente son mutables
- El tiempo de actualización se maneja en la persistencia

---

## Invariantes de Negocio Garantizadas

1. **Nombre y dirección requeridos:** Validación en `create()`
2. **Identidad única:** `id` no puede cambiar
3. **Inquilino fijo:** `tenantId` no puede cambiar tras creación
4. **Tipo inmutable:** `propertyType` no puede cambiar
5. **Auditoría:** `createdAt` nunca cambia, `updatedAt` se actualiza

---

## Cómo Usar

### Crear una nueva propiedad:
```typescript
const property = Property.create({
  tenantId: tenantId,
  name: "Casa de playa",
  description: "Hermosa casa frente al mar",
  propertyType: PropertyType.HOUSE,
  address: "Calle Principal 123",
  city: "Cartagena",
  state: "Bolívar",
  country: "Colombia",
  zipCode: "130001",
  location: Location.create({ latitude: 10.3932, longitude: -75.4830 }),
  checkInTime: "15:00",
  checkOutTime: "11:00",
  cancellationPolicy: CancellationPolicy.MODERATE,
  hostPhone: "+573001234567",
  hostEmail: "host@example.com"
});
```

### Cargar desde la base de datos:
```typescript
const property = Property.reconstitute({
  id: propertyId,
  tenantId,
  name: "Casa de playa",
  description: "Una casa hermosa frente al mar",
  propertyType: PropertyType.CASA,
  address: "Av. Playa 123",
  city: "Cartagena",
  state: "Bolívar",
  country: "Colombia",
  zipCode: "130001",
  location: Location.create(10.3932, -75.4830),
  checkInTime: "15:00",
  checkOutTime: "11:00",
  cancellationPolicy: CancellationPolicy.MODERATE,
  hostPhone: "+573001234567",
  hostEmail: "host@example.com",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-03-24"),
  deletedAt: null
});
```

### Actualizar detalles:
```typescript
property.updateDetails({
  name: "Casa de playa actualizada",
  description: "Nueva descripción",
  address: "Nueva dirección",
  city: "Barranquilla",
  state: "Atlántico",
  country: "Colombia",
  zipCode: "080001",
  location: newLocation
});
```

### Acceder a datos:
```typescript
console.log(property.getName());
console.log(property.getAddress());
console.log(property.getTenantId());
```

---

## Beneficios de la Refactorización

| Aspecto | Antes | Después |
|--------|-------|--------|
| **Encapsulación** | × | ✓ Privada |
| **Validación** | Dispersa | Centralizada en `create()` |
| **Consistencia** | Manual | Garantizada por la clase |
| **Inmutabilidad** | Parcial | Total donde es necesaria |
| **Type Safety** | Básico | Completo con Value Objects |
| **Testabilidad** | Difícil | Fácil (métodos puros) |

---

## Próximas Mejoras Potenciales

1. **Domain Events:** Agregar eventos de dominio para cambios importantes
2. **Especificaciones:** Crear especificaciones reutilizables para queries complejas
3. **Repository Pattern:** Implementar métodos de persistencia tipo repository
4. **Soft Delete:** Implementar eliminación lógica si es requerida por el negocio

---

## Archivos Relacionados

- **Value Objects:** `src/domain/property/value-objects/`
  - `property-id.vo.ts`
  - `property-type.vo.ts`
  - `location.vo.ts`
  - `cancellation-policy.vo.ts`
- **Repository:** `src/infrastructure/persistence/property.repository.ts`
- **DTOs:** `src/presentation/dtos/property.dto.ts`

---

**Fecha de Refactorización:** 2025-03  
**Patrón de Arquitectura:** Clean Architecture + DDD  
**Principio de Diseño:** SOLID (especialmente Single Responsibility y Dependency Inversion)
