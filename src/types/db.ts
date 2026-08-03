export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  monthly_charge: number;
  joining_date: string | null;
  status: "active" | "paused" | "inactive";
  notes: string;
  created_at: string;
}

export type DayStatus = "delivered" | "sunday_off" | "holiday" | "skipped" | "extra";

export interface CalendarDay {
  id: string;
  customer_id: string;
  date: string;
  status: DayStatus;
}

export interface Holiday {
  id: string;
  customer_id: string | null;
  start_date: string;
  end_date: string;
  reason: string;
}

export interface Payment {
  id: string;
  customer_id: string;
  amount: number;
  payment_date: string;
  method: "cash" | "upi" | "other";
  notes: string;
}

export interface MenuItem {
  day_of_week: number;
  item: string;
}

export interface Settings {
  id: boolean;
  sunday_off: boolean;
  business_name: string;
}

export interface CustomerWithMeta extends Customer {
  pending: number;
  due: number;
  paid: number;
}
