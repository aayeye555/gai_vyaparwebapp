export interface Business {
  id: string;
  ownerUid: string;
  name: string;
  gstin?: string;
  address?: string;
  stateCode?: string; // 2-digit GST state code
  email?: string;
  phone?: string;
  upiId?: string; // payment VPA (e.g. upi@okaxis)
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  logoUrl?: string;
  signatureUrl?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  businessId: string;
  ownerUid: string;
  name: string;
  gstin?: string;
  phone?: string;
  email?: string;
  address?: string;
  stateCode?: string; // e.g. "27" (Maharashtra)
  outstandingBalance: number;
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  rate: number;
  quantity: number;
  gstRate: number; // e.g. 18, 12, 5, 0
  hsnSac?: string; // Harmonized System Nomenclature (6 digit standard in India)
  amount: number;
}

export type InvoiceType =
  | "GST Invoice"
  | "Proforma Invoice"
  | "Quotation"
  | "Receipt"
  | "Delivery Challan"
  | "Purchase Order"
  | "Credit Note"
  | "Debit Note";

export type InvoiceStatus = "Draft" | "Unpaid" | "Paid" | "Partially Paid" | "Overdue";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  businessId: string;
  ownerUid: string;
  customerId: string;
  type: InvoiceType;
  date: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  items: InvoiceItem[];
  discount: number; // absolute discount in ₹
  shipping: number; // shipping charges in ₹
  cgst: number; // Central GST component in ₹
  sgst: number; // State GST component in ₹
  igst: number; // Integrated GST component in ₹
  totalAmount: number; // calculated total in ₹
  status: InvoiceStatus;
  paidAmount: number; // payments received
  notes?: string;
  ewayBillNumber?: string;
  ewayVehicleNumber?: string;
  ewayTransporter?: string;
  ewayDistance?: number;
  ewayAckNo?: string;
  ewayAckDate?: string;
  ewayIrn?: string;
  ewayQrCodeUrl?: string;
  terms?: string;
  eInvoiceIrn?: string;
  eInvoiceAckNo?: string;
  eInvoiceAckDate?: string;
  eInvoiceQrUrl?: string;
  eInvoiceStatus?: "Generated" | "Draft" | "Failed";
  irnNumber?: string;
  ackNumber?: string;
  ackDate?: string;
  eWayBillNo?: string;
  eWayBillVehicleNo?: string;
  eWayBillTransporter?: string;
  eWayBillDistance?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  businessId: string;
  ownerUid: string;
  name: string;
  description?: string;
  hsnSac?: string;
  unitPrice: number;
  gstRate: number; // e.g., 18
  stock?: number;
  publishToStore?: boolean;
  storeCategory?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  businessId: string;
  ownerUid: string;
  date: string; // YYYY-MM-DD
  description: string;
  category: string;
  amount: number;
  gstPaid?: number;
  paymentMethod: "Cash" | "UPI" | "Bank Transfer" | "Credit Card" | "Cheque";
  billUrl?: string; // scanned bill asset link
  createdAt: string;
}

export interface SubscriptionPlan {
  id: "free" | "premium";
  name: string;
  invoiceLimit: number;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
}

export const INDIAN_STATES = [
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "18", name: "Assam" },
  { code: "10", name: "Bihar" },
  { code: "04", name: "Chandigarh" },
  { code: "22", name: "Chhattisgarh" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "07", name: "Delhi" },
  { code: "30", name: "Goa" },
  { code: "24", name: "Gujarat" },
  { code: "06", name: "Haryana" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "01", name: "Jammu and Kashmir" },
  { code: "20", name: "Jharkhand" },
  { code: "29", name: "Karnataka" },
  { code: "32", name: "Kerala" },
  { code: "38", name: "Ladakh" },
  { code: "31", name: "Lakshadweep" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "27", name: "Maharashtra" },
  { code: "14", name: "Manipur" },
  { code: "17", name: "Meghalaya" },
  { code: "15", name: "Mizoram" },
  { code: "13", name: "Nagaland" },
  { code: "21", name: "Odisha" },
  { code: "34", name: "Puducherry" },
  { code: "03", name: "Punjab" },
  { code: "08", name: "Rajasthan" },
  { code: "11", name: "Sikkim" },
  { code: "33", name: "Tamil Nadu" },
  { code: "36", name: "Telangana" },
  { code: "16", name: "Tripura" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "05", name: "Uttarakhand" },
  { code: "19", name: "West Bengal" }
];
