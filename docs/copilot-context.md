# Contextualización para Github Copilot

## Visión General

Lymón es un SaaS multi-tenant para la gestión centralizada de alojamientos turísticos, diseñado para unificar la operación de múltiples propiedades y plataformas (Airbnb, Booking, Vrbo, etc.) en un solo sistema.

El objetivo principal es permitir que propietarios, administradores y equipos operativos gestionen reservas, inventario, personal, finanzas, comunicaciones y métricas desde una plataforma única, escalable y segura.

Además, el sistema incluye una landing privada por cliente que permite reservas directas sin intermediarios, y un CRM para fidelización y gestión de huéspedes (según plan).

## Arquitectura Técnica

### Backend

- Framework: NestJS
- Lenguaje: TypeScript
- Base de datos: PostgreSQL (Prisma)
- Arquitectura: Arquitectura limpia con capas:
  - Domain
  - Application
  - Infrastructure
  - Presentation
- Organización por package/feature.

### Base de datos

PostgreSQL

### Frontend

- Framework: Angular

## Modelo de Datos y Jerarquía

El sistema separa identidad de capacidad operativa, bajo un modelo jerárquico flexible:

### Tenant (Cuenta raíz)

Representa a un cliente (ej: "Felipe", "Hotel Julio").

- Contiene:
  - tenantId
  - Plan de suscripción (LymonOne, LymonPlus, LymonPrime)
  - Usuarios
  - Configuración global
  - Facturación

### Property (Propiedad / Complejo)

- Representa un alojamiento físico:
  - Casa
  - Hotel
  - Hostal
  - Complejo turístico
- Pertenece a un Tenant.
- Tiene configuración propia.

### Unit (Unidad de reserva)

Es lo que realmente se alquila:

- Una casa completa.
- Una habitación dentro de un hotel.
- Cada Property tiene una o más Units.

### Ejemplos:

Felipe: - Tenant → 2 Properties (Medellín, Santa Fe) - Cada Property → 1 Unit (casas completas)
Julio: - Tenant → 1 Property (Hotel) - Property → 7 Units (habitaciones)

## Planes de Suscripción

### LymonOne

- Integraciones: Airbnb, Booking, Vrbo.
- Multicalendario unificado.
- Inbox combinado.
- Inventario hasta 5 sitios (Properties + Units).
- Gestión de hasta 2 usuarios.
- Roles, turnos, novedades laborales.

### LymonPlus

- Todo lo de LymonOne.
- Inventario hasta 20 sitios.
- Personalización de landing privada.
- Acceso a CRM.
- Gestión de hasta 10 usuarios.
- Turnos con biometría.

### LymonPrime

- Capacidades ilimitadas.
- Acceso completo a todas las funcionalidades.
