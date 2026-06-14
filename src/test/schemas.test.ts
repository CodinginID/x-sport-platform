import { describe, it, expect } from 'vitest';
import { memberSchema, coachSchema, productSchema, packageSchema } from '@/utils/schemas';

describe('memberSchema', () => {
  it('validates valid member data', () => {
    const result = memberSchema.safeParse({
      full_name: 'John Doe',
      phone_number: '081234567890',
      email: 'john@example.com',
      gender: 'male',
      birth_date: '1990-01-01',
      address: 'Jakarta',
      notes: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty full_name', () => {
    const result = memberSchema.safeParse({
      full_name: '',
      phone_number: '081234567890',
      email: '',
      gender: 'male',
      birth_date: '1990-01-01',
      address: 'Jakarta',
      notes: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone format', () => {
    const result = memberSchema.safeParse({
      full_name: 'John',
      phone_number: 'abc!!',
      email: '',
      gender: 'female',
      birth_date: '1990-01-01',
      address: 'Jakarta',
      notes: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty email', () => {
    const result = memberSchema.safeParse({
      full_name: 'John',
      phone_number: '081234567890',
      email: '',
      gender: 'other',
      birth_date: '1990-01-01',
      address: 'Jakarta',
      notes: '',
    });
    expect(result.success).toBe(true);
  });
});

describe('coachSchema', () => {
  it('validates valid coach data', () => {
    const result = coachSchema.safeParse({
      full_name: 'Coach A',
      phone_number: '081234567890',
      email: 'coach@studio.com',
      commission_regular_pct: 20,
      commission_private_pct: 40,
      notes: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects commission pct > 100', () => {
    const result = coachSchema.safeParse({
      full_name: 'Coach A',
      phone_number: '081234567890',
      email: '',
      commission_regular_pct: 150,
      commission_private_pct: 40,
      notes: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts commission pct as string (coerce)', () => {
    const result = coachSchema.safeParse({
      full_name: 'Coach A',
      phone_number: '081234567890',
      email: '',
      commission_regular_pct: '25',
      commission_private_pct: '30',
      notes: '',
    });
    expect(result.success).toBe(true);
  });
});

describe('productSchema', () => {
  it('validates valid product data', () => {
    const result = productSchema.safeParse({
      product_name: 'Yoga Mat',
      category: 'equipment',
      stock: 10,
      unit: 'pcs',
      selling_price: 100000,
      cost_price: 50000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative stock', () => {
    const result = productSchema.safeParse({
      product_name: 'Yoga Mat',
      category: 'equipment',
      stock: -1,
      unit: 'pcs',
      selling_price: 100000,
      cost_price: 50000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero selling_price', () => {
    const result = productSchema.safeParse({
      product_name: 'Yoga Mat',
      category: 'equipment',
      stock: 10,
      unit: 'pcs',
      selling_price: 0,
      cost_price: 50000,
    });
    expect(result.success).toBe(false);
  });

  it('accepts string numbers (coerce)', () => {
    const result = productSchema.safeParse({
      product_name: 'Yoga Mat',
      category: 'equipment',
      stock: '10',
      unit: 'pcs',
      selling_price: '100000',
      cost_price: '50000',
    });
    expect(result.success).toBe(true);
  });
});

describe('packageSchema', () => {
  it('validates reguler package', () => {
    const result = packageSchema.safeParse({
      package_name: 'Yoga 10x',
      package_category: 'reguler',
      session_count: 10,
      valid_days: 30,
      package_price: 500000,
      description: '10 session yoga',
    });
    expect(result.success).toBe(true);
  });

  it('validates pribadi package', () => {
    const result = packageSchema.safeParse({
      package_name: 'Private Coaching 8x',
      package_category: 'pribadi',
      session_count: 8,
      valid_days: 60,
      package_price: 1600000,
      description: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid category', () => {
    const result = packageSchema.safeParse({
      package_name: 'Bad Package',
      package_category: 'duration',
      session_count: 5,
      valid_days: 30,
      package_price: 100000,
      description: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects valid_days < 1', () => {
    const result = packageSchema.safeParse({
      package_name: 'Bad Package',
      package_category: 'reguler',
      session_count: 5,
      valid_days: 0,
      package_price: 100000,
      description: '',
    });
    expect(result.success).toBe(false);
  });
});
