/**
 * Tests document expected SDK response envelopes — swap in MSW or nock for HTTP-level tests.
 */
import { mockAccountList, mockAffordability, mockTransactions } from '../__mocks__/generators';

describe('Buffr SDK integration shapes (mocked)', () => {
  it('accounts list returns data array + meta', () => {
    const res = mockAccountList();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data[0]).toHaveProperty('id');
  });

  it('transactions list returns rows', () => {
    const res = mockTransactions();
    expect(res.data[0]).toMatchObject({ amount: expect.any(Number) });
  });

  it('affordability returns decision fields', () => {
    const res = mockAffordability();
    expect(res.data).toHaveProperty('eligible');
  });
});
