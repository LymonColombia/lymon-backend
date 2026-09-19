import { CartRepository } from '@/domain/cart/repositories/cart.repository';

type CartRepositoryMock = jest.Mocked<CartRepository> & {
  findOpenByGuestAndTenant: jest.Mock;
};

export function createCartRepositoryMock(): CartRepositoryMock {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findOpenByGuest: jest.fn(),
    findOpenByGuestAndTenant: jest.fn(),
    findByGuestAccountId: jest.fn(),
    findPendingPaymentCartsOlderThan: jest.fn(),
  } as CartRepositoryMock;
}
