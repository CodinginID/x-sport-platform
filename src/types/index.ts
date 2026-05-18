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
  package_type: 'session' | 'duration';
  session_count: number | null;
  valid_days: number;
  package_price: number;
  description: string;
  active_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackageCoach {
  package_coach_id: string;
  package_id: string;
  coach_id: string;
  commission_percentage: number;
  created_at: string;
}

export interface MemberPackage {
  member_package_id: string;
  member_id: string;
  package_id: string;
  purchase_date: string;
  expired_date: string;
  total_sessions: number;
  remaining_sessions: number;
  status: 'active' | 'expired' | 'depleted';
  created_at: string;
}

export interface Booking {
  booking_id: string;
  booking_date: string;
  booking_time: string;
  member_id: string;
  coach_id: string;
  package_id: string;
  member_package_id: string;
  package_price: number;
  booking_status: 'booked' | 'attended' | 'cancelled' | 'completed';
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
