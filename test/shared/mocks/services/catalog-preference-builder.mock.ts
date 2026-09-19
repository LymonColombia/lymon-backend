import { CatalogPreferenceBuilderService } from '@/application/guest-preference/services/catalog-preference-builder.service';

export function createCatalogPreferenceBuilderMock(): jest.Mocked<CatalogPreferenceBuilderService> {
  return {
    build: jest.fn(),
  } as unknown as jest.Mocked<CatalogPreferenceBuilderService>;
}
