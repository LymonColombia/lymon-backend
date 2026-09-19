import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';
import { ISupplier } from '@/domain/inventory/interfaces/supplier.interface';

export class Supplier {
  private constructor(
    private readonly id: SupplierId | null,
    private readonly tenantId: TenantId,
    private readonly name: string,
    private readonly contactEmail: string,
    private readonly contactPhone: string,
    private readonly country: string,
    private readonly city: string,
    private readonly nit: string,
    private readonly createdAt: Date,
    private readonly updatedAt: Date,
    private readonly deletedAt: Date | null,
  ) {}

  static create(params: {
    tenantId: TenantId;
    name: string;
    contactEmail: string;
    contactPhone: string;
    country: string;
    city: string;
    nit: string;
  }): Supplier {
    const name = params.name.trim();
    const contactEmail = params.contactEmail.trim().toLowerCase();
    const contactPhone = params.contactPhone.trim();
    const country = params.country.trim();
    const city = params.city.trim();
    const nit = params.nit.trim().toUpperCase();

    if (!name) throw new DomainException('Supplier name is required');
    if (!contactEmail)
      throw new DomainException('Supplier contact email is required');
    if (!Supplier.isValidEmail(contactEmail)) {
      throw new DomainException('Supplier contact email format is invalid');
    }
    if (!contactPhone)
      throw new DomainException('Supplier contact phone is required');
    if (!country) throw new DomainException('Supplier country is required');
    if (!city) throw new DomainException('Supplier city is required');
    if (!nit) throw new DomainException('Supplier NIT is required');

    return new Supplier(
      null,
      params.tenantId,
      name,
      contactEmail,
      contactPhone,
      country,
      city,
      nit,
      new Date(),
      new Date(),
      null,
    );
  }

  static reconstitute(data: ISupplier): Supplier {
    return new Supplier(
      data.id,
      data.tenantId,
      data.name,
      data.contactEmail,
      data.contactPhone,
      data.country,
      data.city,
      data.nit,
      data.createdAt,
      data.updatedAt,
      data.deletedAt,
    );
  }

  getId(): SupplierId | null {
    return this.id;
  }

  getTenantId(): TenantId {
    return this.tenantId;
  }

  getName(): string {
    return this.name;
  }

  getContactEmail(): string {
    return this.contactEmail;
  }

  getContactPhone(): string {
    return this.contactPhone;
  }

  getCountry(): string {
    return this.country;
  }

  getCity(): string {
    return this.city;
  }

  getNit(): string {
    return this.nit;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getDeletedAt(): Date | null {
    return this.deletedAt;
  }

  assertCanBeDeleted(
    associatedItems: Array<{ name: string; sku: string }>,
  ): void {
    if (associatedItems.length === 0) {
      return;
    }

    const dependencies = associatedItems
      .map((item) => `${item.name} (${item.sku})`)
      .join(', ');

    throw new DomainException(
      `Cannot delete supplier because it is associated with inventory items: ${dependencies}`,
    );
  }

  private static isValidEmail(value: string): boolean {
    if (value.length === 0 || value.includes(' ')) {
      return false;
    }

    const atIndex = value.indexOf('@');
    if (atIndex <= 0 || atIndex !== value.lastIndexOf('@')) {
      return false;
    }

    const localPart = value.slice(0, atIndex);
    const domainPart = value.slice(atIndex + 1);
    if (!localPart || !domainPart) {
      return false;
    }

    const dotIndex = domainPart.lastIndexOf('.');
    if (dotIndex <= 0 || dotIndex === domainPart.length - 1) {
      return false;
    }

    return true;
  }
}
