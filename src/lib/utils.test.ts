import { describe, expect, it } from 'vitest';
import { formatPrintedDate } from './utils';

describe('formatPrintedDate', () => {
  it('formats a normal date without leading zeros on day/month', () => {
    expect(formatPrintedDate(new Date(2026, 8, 17))).toBe('17/9/69'); // 17 ก.ย. 2569
  });

  it('handles single-digit day and month without padding', () => {
    expect(formatPrintedDate(new Date(2027, 0, 5))).toBe('5/1/70'); // 5 ม.ค. 2570
  });

  it('pads the Buddhist year to 2 digits when it lands on a century boundary', () => {
    expect(formatPrintedDate(new Date(2057, 0, 1))).toBe('1/1/00'); // พ.ศ. 2600
  });

  it('pads a single-digit Buddhist-year remainder', () => {
    expect(formatPrintedDate(new Date(2058, 0, 1))).toBe('1/1/01'); // พ.ศ. 2601
  });
});
