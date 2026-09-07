import { prisma } from './prisma.helper';

/**
 * Minimal valid rows, inserted straight through Prisma. Repository specs use these to
 * set up the FK targets they need without depending on other repositories.
 */
export async function seedTenant(overrides: { name?: string; slug?: string } = {}) {
  const name = overrides.name ?? 'Costa Hoteles';
  return prisma.tenants.create({
    data: {
      name,
      slug: overrides.slug ?? `costa-${Math.random().toString(16).slice(2, 8)}`,
      owner_email: `owner-${Math.random().toString(16).slice(2, 8)}@costa.com`,
      plan: 'TRIAL',
    },
  });
}

export async function seedProperty(tenantId: string, name = 'Playa Norte') {
  return prisma.properties.create({
    data: {
      tenant_id: tenantId,
      name,
      slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(16).slice(2, 6)}`,
      description: 'A property',
      property_type: 'HOTEL',
      address: 'Calle 1',
      city: 'Cartagena',
      state: 'Bolivar',
      country: 'CO',
      zip_code: '130001',
      lat: 10.391,
      lng: -75.4794,
      check_in_time: new Date('1970-01-01T15:00:00Z'),
      check_out_time: new Date('1970-01-01T11:00:00Z'),
      cancellation_policy: 'FLEXIBLE',
      host_phone: '+573001112233',
      host_email: 'host@costa.com',
    },
  });
}

export async function seedUnit(
  tenantId: string,
  propertyId: string,
  name = 'Suite 101',
) {
  return prisma.units.create({
    data: {
      tenant_id: tenantId,
      property_id: propertyId,
      name,
      description: 'A unit',
      inventory_count: 3,
      max_guests: 4,
      standard_guests: 2,
      bathrooms_count: 1,
      price_per_night: 250000,
    },
  });
}

export async function seedRole(name = 'ADMIN', permissions: string[] = ['property:read']) {
  return prisma.roles.create({ data: { name, permissions } });
}

export async function seedUser(tenantId: string, email = 'owner@costa.com') {
  return prisma.users.create({
    data: {
      tenant_id: tenantId,
      email,
      password_hash: 'hash',
      is_owner: true,
    },
  });
}

export async function seedGuest(
  tenantId: string,
  fullName = 'Ana Gomez',
  email = 'ana@example.com',
) {
  return prisma.guests.create({
    data: {
      tenant_id: tenantId,
      full_name: fullName,
      primary_email: email,
    },
  });
}

export async function seedReservation(
  ids: { tenantId: string; propertyId: string; unitId: string; guestId: string },
  overrides: { status?: string; source?: string; checkIn?: Date; checkOut?: Date; totalPrice?: number } = {},
) {
  return prisma.reservations.create({
    data: {
      tenant_id: ids.tenantId,
      property_id: ids.propertyId,
      unit_id: ids.unitId,
      guest_id: ids.guestId,
      check_in: overrides.checkIn ?? new Date('2026-03-01'),
      check_out: overrides.checkOut ?? new Date('2026-03-04'),
      source: overrides.source ?? 'DIRECT',
      status: overrides.status ?? 'CONFIRMED',
      guests_count: 2,
      price_per_night: 250000,
      total_price: overrides.totalPrice ?? 750000,
    },
  });
}
