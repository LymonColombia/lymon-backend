import { isUuid, uuidv7 } from '@/domain/shared/value-objects/uuid.util';

describe('uuidv7', () => {
  it('is a version 7, RFC 9562 variant uuid carrying the current millisecond', () => {
    const before = Date.now();
    const id = uuidv7();
    const after = Date.now();

    expect(isUuid(id)).toBe(true);
    expect(id[14]).toBe('7');
    expect('89ab').toContain(id[19]);
    const ms = parseInt(id.replace(/-/g, '').slice(0, 12), 16);
    expect(ms).toBeGreaterThanOrEqual(before);
    expect(ms).toBeLessThanOrEqual(after);
  });

  it('sorts by creation time across milliseconds', () => {
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValueOnce(1_700_000_000_000).mockReturnValueOnce(1_700_000_000_001);
    const [first, second] = [uuidv7(), uuidv7()];
    now.mockRestore();

    expect(first < second).toBe(true);
  });
});

describe('isUuid', () => {
  it('accepts a canonical uuid in either case', () => {
    expect(isUuid('0f8fad5b-d9cb-469f-a165-70867728950e')).toBe(true);
    expect(isUuid('0F8FAD5B-D9CB-469F-A165-70867728950E')).toBe(true);
  });

  it('rejects anything Postgres would refuse as a uuid', () => {
    for (const value of [
      '',
      'not-an-id',
      '65f1a1a2b3c4d5e6f7a8b9c2', // the 24-char hex ObjectId this replaces
      '0f8fad5b-d9cb-469f-a165-70867728950', // one char short
      '0f8fad5bd9cb469fa16570867728950e', // unhyphenated
      '0f8fad5b-d9cb-469f-a165-70867728950z',
    ]) {
      expect(isUuid(value)).toBe(false);
    }
  });
});
