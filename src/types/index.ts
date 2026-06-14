export interface FeatureEntry {
  status: 'trial' | 'active';
  trial_ends_at?: string;
  trial_used?: boolean;
}

export interface PlatformConfig {
  id: number;
  admin_wa: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  feature_prices: Record<string, number>;
  updated_at?: string;
}

export interface LicenseInfo {
  id: string;
  license_key: string;
  studio_name: string | null;
  studio_address: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  plan: string;
  features: Record<string, FeatureEntry>;
  storage_quota_mb: number;
  storage_used_mb: number;
  expires_at: string;
  grace_period_days: number;
  activated_at: string | null;
  device_fingerprint: string | null;
  last_validated_at: string | null;
  is_active: boolean;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'owner' | 'staff';
  created_at: string;
}

export interface Member {
  member_id: string;
  full_name: string;
  phone_number: string;
  email: string;
  gender: 'male' | 'female' | 'other';
  birth_date: string;
  address: string;
  join_date: string;
  status_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Coach {
  coach_id: string;
  full_name: string;
  phone_number: string;
  email: string;
  active_status: boolean;
  commission_regular_pct: number;
  commission_private_pct: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  product_id: string;
  product_name: string;
  category: string;
  stock: number;
  unit: string;
  selling_price: number;
  cost_price: number;
  active_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface Package {
  package_id: string;
  package_name: string;
  package_category: 'reguler' | 'pribadi';
  session_count: number | null;
  valid_days: number;
  package_price: number;
  description: string;
  active_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberPackage {
  member_package_id: string;
  member_id: string;
  package_id: string;
  purchase_date: string;
  expired_date: string;
  total_sessions: number;
  remaining_sessions: number;
  status: 'active' | 'expired' | 'depleted' | 'pending';
  created_at: string;
}

export interface Booking {
  booking_id: string;
  booking_date: string;
  booking_time: string;
  member_id: string;
  coach_id: string;
  package_id: string;
  member_package_id: string | null;
  training_session_id: string | null;
  package_price: number;
  booking_status: 'booked' | 'attended' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface TrainingSession {
  training_session_id: string;
  session_date: string;
  session_time: string;
  session_category: 'reguler' | 'pribadi';
  capacity: number;
  coach_id: string | null;
  status: 'scheduled' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface ProductSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export type PaymentMethod = 'cash' | 'transfer' | 'qris';

export interface ProductSale {
  transaction_id: string;
  transaction_date: string;
  customer_name: string;
  items: ProductSaleItem[];
  /** Sum of item subtotals before discount. */
  subtotal: number;
  /** Flat discount amount applied to the subtotal (>= 0, <= subtotal). */
  discount: number;
  /** Final amount the customer must pay = subtotal - discount. */
  total: number;
  payment_method: PaymentMethod;
  /** Amount of cash handed by customer. Only relevant when payment_method = 'cash'. */
  cash_received: number;
  /** Change returned to customer = cash_received - total. 0 for non-cash methods. */
  change: number;
  notes: string;
  created_at: string;
}

export interface MemberPayment {
  payment_id: string;
  payment_date: string;
  member_id: string;
  package_id: string;
  amount: number;
  payment_method: PaymentMethod;
  notes: string;
  created_at: string;
}

export interface CoachCommission {
  commission_id: string;
  coach_id: string;
  booking_id: string;
  member_id: string;
  package_price: number;
  commission_percentage: number;
  commission_amount: number;
  date: string;
  created_at: string;
}
