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
      commission_type: 'percentage',
      commission_percentage: 20,
      notes: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects commission_percentage > 100', () => {
    const result = coachSchema.safeParse({
      full_name: 'Coach A',
      phone_number: '081234567890',
      email: '',
      commission_type: 'percentage',
      commission_percentage: 150,
      notes: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts commission_percentage as string (coerce)', () => {
    const result = coachSchema.safeParse({
      full_name: 'Coach A',
      phone_number: '081234567890',
      email: '',
      commission_type: 'fixed',
      commission_percentage: '25',
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
  it('validates session package', () => {
    const result = packageSchema.safeParse({
      package_name: 'Yoga 10x',
      package_type: 'session',
      session_count: 10,
      valid_days: 30,
      package_price: 500000,
      description: '10 session yoga',
    });
    expect(result.success).toBe(true);
  });

  it('validates duration package with null session_count', () => {
    const result = packageSchema.safeParse({
      package_name: 'Monthly Unlimited',
      package_type: 'duration',
      session_count: null,
      valid_days: 30,
      package_price: 1000000,
      description: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects valid_days < 1', () => {
    const result = packageSchema.safeParse({
      package_name: 'Bad Package',
      package_type: 'session',
      session_count: 5,
      valid_days: 0,
      package_price: 100000,
      description: '',
    });
    expect(result.success).toBe(false);
  });
});
