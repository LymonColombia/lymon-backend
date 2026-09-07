import { isUuid } from '@/domain/shared/value-objects/uuid.util';

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
