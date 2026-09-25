import { createHash } from 'node:crypto';
import { WompiWebhookController } from '@/infrastructure/payment/controllers/wompi-webhook.controller';

function buildChecksum(
  payload: {
    data: {
      transaction: { id: string; status: string; amount_in_cents: number };
    };
    timestamp: number;
    signature: { properties: string[] };
  },
  secret: string,
): string {
  const concatenated = payload.signature.properties
    .map((property) => {
      const path = property.split('.');
      let current: any = payload as any;
      for (const segment of path) {
        current = current?.[segment];
      }
      return String(current ?? '');
    })
    .join('')
    .concat(String(payload.timestamp), secret);

  return createHash('sha256').update(concatenated).digest('hex');
}

describe('WompiWebhookController', () => {
  const secret = 'prod_events_test_secret';
  const payload = {
    event: 'transaction.updated',
    data: {
      transaction: {
        id: '1234-1610641025-49201',
        status: 'APPROVED',
        amount_in_cents: 4490000,
        reference: 'checkout_reference',
        currency: 'COP' as const,
      },
    },
    environment: 'test' as const,
    signature: {
      properties: [
        'transaction.id',
        'transaction.status',
        'transaction.amount_in_cents',
      ],
      checksum: '',
    },
    timestamp: 1530291411,
    sent_at: '2018-07-20T16:45:05.000Z',
  };

  it('accepts and processes a valid event checksum', async () => {
    const commandBus = { execute: jest.fn().mockResolvedValue(undefined) };
    const controller = new WompiWebhookController(
      commandBus as never,
      {
        get: jest.fn().mockReturnValue(secret),
      } as never,
    );

    const checksum = buildChecksum(payload, secret);
    const response = await controller.receiveEvent(
      {
        ...payload,
        signature: { ...payload.signature, checksum },
      } as never,
      checksum,
    );

    expect(response).toEqual({ accepted: true, processed: true });
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('ignores events with invalid checksum', async () => {
    const commandBus = { execute: jest.fn().mockResolvedValue(undefined) };
    const controller = new WompiWebhookController(
      commandBus as never,
      {
        get: jest.fn().mockReturnValue(secret),
      } as never,
    );

    const response = await controller.receiveEvent(
      {
        ...payload,
        signature: { ...payload.signature, checksum: 'invalid' },
      } as never,
      'invalid',
    );

    expect(response).toEqual({ accepted: true, processed: false });
    expect(commandBus.execute).not.toHaveBeenCalled();
  });
});
