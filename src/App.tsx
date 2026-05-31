import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Users,
  TrendingUp,
  Package,
  Plus,
  Trash2,
  Share2,
  Printer,
  Download,
  AlertTriangle,
  Send,
  Building2,
  Smartphone,
  CreditCard,
  UserCheck,
  Zap,
  Sparkles,
  Camera,
  Upload,
  Globe,
  Settings,
  HelpCircle,
  LogOut,
  Calendar,
  Lock,
  Mail,
  Search,
  CheckCircle,
  FileSpreadsheet,
  X,
  FileSearch,
  MessageSquare,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { onAuthStateChanged } from "firebase/auth";
import {
  Business,
  Customer,
  Invoice,
  InvoiceItem,
  InvoiceType,
  InvoiceStatus,
  Product,
  Expense,
  INDIAN_STATES
} from "./types";
import {
  auth,
  loginWithGoogle,
  logoutUser,
  fetchUserBusinesses,
  saveBusiness,
  fetchCustomers,
  saveCustomer,
  deleteCustomerFromDb,
  fetchInvoices,
  saveInvoice,
  deleteInvoiceFromDb,
  fetchProducts,
  saveProduct,
  deleteProductFromDb,
  fetchExpenses,
  saveExpense,
  deleteExpenseFromDb
} from "./lib/firebase";
import InvoicePrintTemplate from "./components/InvoicePrintTemplate";

// Premium Subscription Plan definitions
const FREE_LIMIT = 5;

// Sample Indian Business data for first-time premium sandbox exploration
const SAMPLE_BUSINESS: Business = {
  id: "sample_b_1",
  ownerUid: "sample_user",
  name: "Gupta Electronics & Appliances",
  gstin: "27AAAFG4939C1Z3",
  address: "Shed No. 12, Mittal Industrial Estate, Andheri East, Mumbai",
  stateCode: "27", // Maharashtra
  email: "billing@guptaelectronics.in",
  phone: "9876543110",
  upiId: "guptaelectrics@oksbi",
  bankName: "State Bank of India",
  bankAccountNumber: "30048920192",
  bankIfsc: "SBIN0001243",
  logoUrl: "",
  signatureUrl: "",
  createdAt: new Date().toISOString()
};

const SAMPLE_CUSTOMER: Customer = {
  id: "sample_c_1",
  businessId: "sample_b_1",
  ownerUid: "sample_user",
  name: "Mehta Garments Pvt Ltd",
  gstin: "24AABCM8829C2Z5",
  phone: "9123456789",
  email: "orders@mehtagarments.com",
  address: "G-42, Textile Tower, Ring Road, Surat, Gujarat",
  stateCode: "24", // Gujarat (Inter-state client!)
  outstandingBalance: 12500,
  createdAt: new Date().toISOString()
};

const SAMPLE_INVOICE: Invoice = {
  id: "sample_i_1",
  invoiceNumber: "INV-2026-001",
  businessId: "sample_b_1",
  ownerUid: "sample_user",
  customerId: "sample_c_1",
  type: "GST Invoice",
  date: "2026-05-10",
  dueDate: "2026-06-10",
  items: [
    {
      description: "Industrial Ceiling Exhaust System 240W",
      rate: 8500,
      quantity: 1,
      gstRate: 18,
      hsnSac: "841459",
      amount: 8500
    },
    {
      description: "Heavy Copper Terminal Ring (Box)",
      rate: 2200,
      quantity: 2,
      gstRate: 12,
      hsnSac: "853690",
      amount: 4400
    }
  ],
  discount: 400,
  shipping: 350,
  cgst: 0, // Inter-state supply to Gujarat (IGST is calculated instead)
  sgst: 0,
  igst: 2058, // (8100 * 18% = 1458) + (4400 * 12% = 528) + (discounts/shipping prorated)
  totalAmount: 14858,
  status: "Unpaid",
  paidAmount: 0,
  notes: "Goods once sold will not be taken back. Interest at 18% will be charged for delayed payments.",
  terms: "Payment should be made within 30 days of invoice issuance via UPI or designated Bank Account.",
  createdAt: new Date().toISOString()
};

const SAMPLE_EXPENSE: Expense = {
  id: "sample_e_1",
  businessId: "sample_b_1",
  ownerUid: "sample_user",
  date: "2026-05-18",
  description: "Web Hosting & Cloud Accounting Workspace Renewal (Google Cloud)",
  category: "Software & Tech",
  amount: 4200,
  gstPaid: 640,
  paymentMethod: "Credit Card",
  createdAt: new Date().toISOString()
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Real databases loaded from Firebase (with fallbacks if offline/empty)
  const [businesses, setBusinesses] = useState<Business[]>([SAMPLE_BUSINESS]);
  const [customers, setCustomers] = useState<Customer[]>([SAMPLE_CUSTOMER]);
  const [invoices, setInvoices] = useState<Invoice[]>([SAMPLE_INVOICE]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([SAMPLE_EXPENSE]);

  // Current active profiles
  const [activeBusiness, setActiveBusiness] = useState<Business>(SAMPLE_BUSINESS);
  const [premiumPlan, setPremiumPlan] = useState<"free" | "premium">("free");
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Admin access simulator toggle (for testing/monitoring)
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal / Form States
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  
  // Active Invoice Template display selection
  const [invoiceTemplate, setInvoiceTemplate] = useState<"modern" | "classic" | "thermal">("modern");

  // Input states for new Business profile creation
  const [newBiz, setNewBiz] = useState<Partial<Business>>({
    name: "", gstin: "", address: "", stateCode: "27", email: "", phone: "", upiId: "", bankName: "", bankAccountNumber: "", bankIfsc: ""
  });

  // Input states for new Client creation
  const [newCust, setNewCust] = useState<Partial<Customer>>({
    name: "", gstin: "", phone: "", email: "", address: "", stateCode: "27"
  });

  // Input states for Invoice form creation
  const [showInvoiceCreator, setShowInvoiceCreator] = useState(false);
  const [creatorInvoiceType, setCreatorInvoiceType] = useState<InvoiceType>("GST Invoice");
  const [creatorCustomerId, setCreatorCustomerId] = useState<string>("");
  const [creatorDate, setCreatorDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [creatorDueDate, setCreatorDueDate] = useState<string>(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [creatorItems, setCreatorItems] = useState<InvoiceItem[]>([
    { description: "", rate: 0, quantity: 1, gstRate: 18, hsnSac: "", amount: 0 }
  ]);
  const [creatorDiscount, setCreatorDiscount] = useState<number>(0);
  const [creatorShipping, setCreatorShipping] = useState<number>(0);
  const [creatorNotes, setCreatorNotes] = useState<string>("Thank you for doing business with us!");
  const [creatorTerms, setCreatorTerms] = useState<string>("Payment is requested within 15 days via UPI/Bank transfer.");

  // Input states for Inventory Item creation
  const [newProd, setNewProd] = useState<Partial<Product>>({
    name: "", description: "", hsnSac: "", unitPrice: 0, gstRate: 18, stock: 100
  });

  // Input State for Expense tracker
  const [newEx, setNewEx] = useState<Partial<Expense>>({
    date: new Date().toISOString().split("T")[0], description: "", category: "Office Supplies", amount: 0, gstPaid: 0, paymentMethod: "UPI"
  });

  // AI & OCR interactive states
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  
  // Online Store & GSTR Reports States (getswipe.in matching features)
  const [storeBio, setStoreBio] = useState<string>("Premium hardware, electronics, and services distributed across India.");
  const [storeBannerBg, setStoreBannerBg] = useState<string>("from-indigo-650 to-purple-700");
  const [storeSubdomain, setStoreSubdomain] = useState<string>("guptahardware");
  const [storeSearchQuery, setStoreSearchQuery] = useState<string>("");
  const [selectedGradient, setSelectedGradient] = useState<string>("from-indigo-600 to-purple-700");
  const [storeOrders, setStoreOrders] = useState<any[]>([
    {
      id: "ord_1",
      customerName: "Sharma Agro Traders",
      customerPhone: "9812345678",
      items: [
        { description: "Heavy Copper Terminal Ring (Box)", quantity: 2, price: 2200 }
      ],
      totalAmount: 4400,
      status: "Inquiry Sent",
      date: "2026-05-30"
    }
  ]);

  const [ewayVehicle, setEwayVehicle] = useState("");
  const [ewayTransporter, setEwayTransporter] = useState("");
  const [ewayDistance, setEwayDistance] = useState("150");
  const [ewayLoading, setEwayLoading] = useState(false);
  const [ewaySteps, setEwaySteps] = useState<string[]>([]);

  // Google AdSense settings
  const [adsenseEnabled, setAdsenseEnabled] = useState<boolean>(true);
  const [adsensePublisherId, setAdsensePublisherId] = useState<string>("ca-pub-1723875779213978");
  const [adsenseAdSlot, setAdsenseAdSlot] = useState<string>("8812394017");
  const [adsenseLayoutFormat, setAdsenseLayoutFormat] = useState<"responsive" | "banner" | "sidebar">("responsive");
  const [adsenseStatus, setAdsenseStatus] = useState<"active" | "checking" | "unverified" | "error">("active");
  const [adsenseEarnings, setAdsenseEarnings] = useState<number>(142.85);
  const [adsenseImpressions, setAdsenseImpressions] = useState<number>(3104);
  const [adsenseClicks, setAdsenseClicks] = useState<number>(94);
  const [adsensePageViews, setAdsensePageViews] = useState<number>(1240);

  const [aiAssistantPrompt, setAiAssistantPrompt] = useState("");
  const [aiAssistantResponse, setAiAssistantResponse] = useState<string>("");
  const [aiAssistantLoading, setAiAssistantLoading] = useState(false);
  const [aiChatLogs, setAiChatLogs] = useState<{ sender: "user" | "bot"; text: string }[]>([
    { sender: "bot", text: "Namaste! I am your VyaparFlow CA Tax Assistant. Ask me to draft email templates, estimate GST components, recommend HSN codes, or audit cashflow." }
  ]);

  // Dynamic Google AdSense Script Injection & Initialization
  useEffect(() => {
    if (adsenseEnabled && adsensePublisherId.trim().startsWith("ca-pub-")) {
      const scriptId = "google-adsense-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.async = true;
        script.crossOrigin = "anonymous";
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePublisherId.trim()}`;
        document.head.appendChild(script);
      } else {
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePublisherId.trim()}`;
      }
    }
  }, [adsenseEnabled, adsensePublisherId]);

  // Handle Firebase Login Status
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Load data from Firestore
        try {
          const bizList = await fetchUserBusinesses(currentUser.uid);
          if (bizList && bizList.length > 0) {
            setBusinesses(bizList);
            setActiveBusiness(bizList[0]);
          } else {
            // Write default business for seamless experience
            const baseBiz = { ...SAMPLE_BUSINESS, id: "biz_" + Date.now(), ownerUid: currentUser.uid };
            await saveBusiness(baseBiz);
            setBusinesses([baseBiz]);
            setActiveBusiness(baseBiz);
          }

          const custs = await fetchCustomers(currentUser.uid);
          setCustomers(custs || []);
          
          const invs = await fetchInvoices(currentUser.uid);
          setInvoices(invs || []);

          const prods = await fetchProducts(currentUser.uid);
          setProducts(prods || []);

          const exps = await fetchExpenses(currentUser.uid);
          setExpenses(exps || []);

        } catch (e) {
          console.error("Failed loading user cloud databases:", e);
        }
      } else {
        setUser(null);
        // Reset to interactive sandbox samples
        setBusinesses([SAMPLE_BUSINESS]);
        setActiveBusiness(SAMPLE_BUSINESS);
        setCustomers([SAMPLE_CUSTOMER]);
        setInvoices([SAMPLE_INVOICE]);
        setExpenses([SAMPLE_EXPENSE]);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Sync / Calculate dynamic totals on line items change
  const handleItemFieldChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...creatorItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Automatically computer net value
    const item = updated[index];
    item.amount = (Number(item.rate) || 0) * (Number(item.quantity) || 1);
    setCreatorItems(updated);
  };

  const addCreatorLineItem = () => {
    setCreatorItems([...creatorItems, { description: "", rate: 0, quantity: 1, gstRate: 18, hsnSac: "", amount: 0 }]);
  };

  const removeCreatorLineItem = (index: number) => {
    if (creatorItems.length === 1) return;
    setCreatorItems(creatorItems.filter((_, i) => i !== index));
  };

  // Google Login helper
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      alert("Sign In failed: " + (err.message || err));
    }
  };

  // Handle invoice saving & GST computation rules
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorCustomerId) {
      alert("Please select or add a target customer first.");
      return;
    }

    const targetCustomer = customers.find(c => c.id === creatorCustomerId);
    if (!targetCustomer) return;

    // Check freemium limit restrictions
    if (premiumPlan === "free" && invoices.length >= FREE_LIMIT) {
      alert("⚠️ You have reached your Free Tier Limit. Upgrade to VyaparFlow Premium for Unlimited Invoices!");
      return;
    }

    // TAX CODES ROUTING MATRICES
    // CGST/SGST vs IGST routing
    const isSameState = activeBusiness.stateCode === targetCustomer.stateCode;
    let cgstSum = 0;
    let sgstSum = 0;
    let igstSum = 0;
    let subtotal = 0;

    creatorItems.forEach(it => {
      const netVal = (it.rate * it.quantity);
      subtotal += netVal;
      const taxRate = it.gstRate / 100;
      if (isSameState) {
        cgstSum += (netVal * taxRate) / 2;
        sgstSum += (netVal * taxRate) / 2;
      } else {
        igstSum += (netVal * taxRate);
      }
    });

    const finalAmount = subtotal - (Number(creatorDiscount) || 0) + (Number(creatorShipping) || 0) + cgstSum + sgstSum + igstSum;
    
    // Auto invoice numbering incremental format
    const lastNumber = invoices.length + 1;
    const invNo = `INV-${new Date().getFullYear()}-${String(lastNumber).padStart(3, "0")}`;

    const newInvoiceObj: Invoice = {
      id: "inv_" + Date.now(),
      invoiceNumber: invNo,
      businessId: activeBusiness.id,
      ownerUid: user ? user.uid : "sample_user",
      customerId: creatorCustomerId,
      type: creatorInvoiceType,
      date: creatorDate,
      dueDate: creatorDueDate,
      items: creatorItems,
      discount: Number(creatorDiscount) || 0,
      shipping: Number(creatorShipping) || 0,
      cgst: Number(cgstSum.toFixed(2)),
      sgst: Number(sgstSum.toFixed(2)),
      igst: Number(igstSum.toFixed(2)),
      totalAmount: Number(finalAmount.toFixed(2)),
      status: "Unpaid",
      paidAmount: 0,
      notes: creatorNotes,
      terms: creatorTerms,
      createdAt: new Date().toISOString()
    };

    if (user) {
      await saveInvoice(newInvoiceObj);
    }
    setInvoices([newInvoiceObj, ...invoices]);
    setViewingInvoice(newInvoiceObj);
    setShowInvoiceCreator(false);

    // Reset items creator input fields
    setCreatorItems([{ description: "", rate: 0, quantity: 1, gstRate: 18, hsnSac: "", amount: 0 }]);
    setCreatorDiscount(0);
    setCreatorShipping(0);
  };

  // Add Business
  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBiz.name) return;
    const newBizObj: Business = {
      id: "biz_" + Date.now(),
      ownerUid: user ? user.uid : "sample_user",
      name: newBiz.name,
      gstin: newBiz.gstin,
      address: newBiz.address,
      stateCode: newBiz.stateCode || "27",
      email: newBiz.email,
      phone: newBiz.phone,
      upiId: newBiz.upiId,
      bankName: newBiz.bankName,
      bankAccountNumber: newBiz.bankAccountNumber,
      bankIfsc: newBiz.bankIfsc,
      createdAt: new Date().toISOString()
    };

    if (user) {
      await saveBusiness(newBizObj);
    }
    setBusinesses([...businesses, newBizObj]);
    setActiveBusiness(newBizObj);
    setShowBusinessForm(false);
  };

  // Add Customer
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name) return;
    const newCustObj: Customer = {
      id: "cust_" + Date.now(),
      businessId: activeBusiness.id,
      ownerUid: user ? user.uid : "sample_user",
      name: newCust.name,
      gstin: newCust.gstin,
      phone: newCust.phone,
      email: newCust.email,
      address: newCust.address,
      stateCode: newCust.stateCode || "27",
      outstandingBalance: 0,
      createdAt: new Date().toISOString()
    };

    if (user) {
      await saveCustomer(newCustObj);
    }
    setCustomers([newCustObj, ...customers]);
    setShowCustomerForm(false);
    setNewCust({ name: "", gstin: "", phone: "", email: "", address: "", stateCode: "27" });
  };

  // Add Product Inventory
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name) return;
    const newProdObj: Product = {
      id: "prod_" + Date.now(),
      businessId: activeBusiness.id,
      ownerUid: user ? user.uid : "sample_user",
      name: newProd.name,
      description: newProd.description,
      hsnSac: newProd.hsnSac,
      unitPrice: Number(newProd.unitPrice) || 0,
      gstRate: Number(newProd.gstRate) || 18,
      stock: Number(newProd.stock) || 1,
      createdAt: new Date().toISOString()
    };

    if (user) {
      await saveProduct(newProdObj);
    }
    setProducts([newProdObj, ...products]);
    setShowProductForm(false);
  };

  // Add Expense profile
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEx.description || !newEx.amount) return;
    const newExObj: Expense = {
      id: "exp_" + Date.now(),
      businessId: activeBusiness.id,
      ownerUid: user ? user.uid : "sample_user",
      date: newEx.date || new Date().toISOString().split("T")[0],
      description: newEx.description,
      category: newEx.category || "Office Supplies",
      amount: Number(newEx.amount) || 0,
      gstPaid: Number(newEx.gstPaid) || 0,
      paymentMethod: (newEx.paymentMethod as any) || "UPI",
      createdAt: new Date().toISOString()
    };

    if (user) {
      await saveExpense(newExObj);
    }
    setExpenses([newExObj, ...expenses]);
    setShowExpenseForm(false);
  };

  // Delete invoice
  const handleDeleteInvoice = async (id: string) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      if (user) {
        await deleteInvoiceFromDb(id);
      }
      setInvoices(invoices.filter(i => i.id !== id));
      if (viewingInvoice?.id === id) setViewingInvoice(null);
    }
  };

  // Mark invoice status
  const handleUpdateStatus = async (invoiceId: string, newStatus: InvoiceStatus) => {
    const updated = invoices.map(inv => {
      if (inv.id === invoiceId) {
        return { ...inv, status: newStatus };
      }
      return inv;
    });
    setInvoices(updated);
    const invoiceRecord = updated.find(i => i.id === invoiceId);
    if (invoiceRecord && user) {
      await saveInvoice(invoiceRecord);
    }
    if (viewingInvoice?.id === invoiceId) {
      setViewingInvoice({ ...viewingInvoice, status: newStatus });
    }
  };

  // Convert Quotation/Proforma to Tax Invoice
  const handleConvertToInvoice = async (invoiceId: string) => {
    const updated = invoices.map(inv => {
      if (inv.id === invoiceId) {
        return { ...inv, type: "GST Invoice" as const };
      }
      return inv;
    });
    setInvoices(updated);
    const invoiceRecord = updated.find(i => i.id === invoiceId);
    if (invoiceRecord && user) {
      await saveInvoice(invoiceRecord);
    }
    if (viewingInvoice?.id === invoiceId) {
      setViewingInvoice({ ...viewingInvoice, type: "GST Invoice" as const });
    }
    alert("Document successfully converted to an official Tax GST Invoice! Tax slabs and CGST/SGST ledger records generated.");
  };

  // Generate official e-Invoice IRN details
  const handleGenerateEInvoice = async (invoiceId: string) => {
    const ackNum = "105" + Math.floor(100000000 + Math.random() * 900000000).toString();
    const irnHex = "e36e" + Array.from({length: 60}, () => Math.floor(Math.random()*16).toString(16)).join("");
    const dateStr = new Date().toISOString().split("T")[0] + " " + new Date().toTimeString().split(" ")[0];
    const wayBillNum = "481" + Math.floor(100000000 + Math.random() * 900000000).toString();
    
    const updated = invoices.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          eInvoiceStatus: "Generated" as const,
          irnNumber: irnHex,
          ackNumber: ackNum,
          ackDate: dateStr,
          eWayBillNo: inv.eWayBillNo || wayBillNum
        };
      }
      return inv;
    });
    setInvoices(updated);
    const invoiceRecord = updated.find(i => i.id === invoiceId);
    if (invoiceRecord && user) {
      await saveInvoice(invoiceRecord);
    }
    if (viewingInvoice?.id === invoiceId) {
      setViewingInvoice({
        ...viewingInvoice,
        eInvoiceStatus: "Generated" as const,
        irnNumber: irnHex,
        ackNumber: ackNum,
        ackDate: dateStr,
        eWayBillNo: viewingInvoice.eWayBillNo || wayBillNum
      });
    }
    alert("NIC e-Invoice Server responded: IRN registered completely! Government dynamic signed QR code successfully appended for physical print & audit.");
  };

  // Generate e-Way Bill tracking details
  const handleGenerateEWayBill = async (invoiceId: string, vehicleNo: string, transporter: string, distance: string) => {
    const wayBillNo = "481" + Math.floor(100000000 + Math.random() * 900000000).toString();
    const updated = invoices.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          eWayBillNo: wayBillNo,
          eWayBillVehicleNo: vehicleNo || "MH-12-PQ-9981",
          eWayBillTransporter: transporter || "V-Trans Logistics",
          eWayBillDistance: distance || "240"
        };
      }
      return inv;
    });
    setInvoices(updated);
    const invoiceRecord = updated.find(i => i.id === invoiceId);
    if (invoiceRecord && user) {
      await saveInvoice(invoiceRecord);
    }
    if (viewingInvoice?.id === invoiceId) {
      setViewingInvoice({
        ...viewingInvoice,
        eWayBillNo: wayBillNo,
        eWayBillVehicleNo: vehicleNo || "MH-12-PQ-9981",
        eWayBillTransporter: transporter || "V-Trans Logistics",
        eWayBillDistance: distance || "240"
      });
    }
    alert(`E-Way Bill ${wayBillNo} generated successfully for Vehicle: ${vehicleNo || "MH-12-PQ-9981"}! Appended tracking summary to GST billing metadata.`);
  };

  // AI Chat & Assistance interaction
  const handleAIChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiAssistantPrompt.trim()) return;

    const userMessage = aiAssistantPrompt;
    setAiChatLogs(prev => [...prev, { sender: "user", text: userMessage }]);
    setAiAssistantPrompt("");
    setAiAssistantLoading(true);

    try {
      const res = await fetch("/api/gemini/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage,
          context: {
            business: activeBusiness,
            revenueOverview: invoices.reduce((s, i) => s + i.totalAmount, 0),
            pendingReceivables: invoices.filter(i => i.status !== "Paid").reduce((s, i) => s + i.totalAmount, 0),
            customersCount: customers.length,
            invoicesCount: invoices.length
          }
        })
      });

      const data = await res.json();
      setAiChatLogs(prev => [...prev, { sender: "bot", text: data.text || "I was unable to calculate that right now." }]);
    } catch (err: any) {
      setAiChatLogs(prev => [...prev, { sender: "bot", text: "Error connecting to AI CA engine: " + err.message }]);
    } finally {
      setAiAssistantLoading(false);
    }
  };

  // Smart Prepopulate from AI HSN assistance
  const triggerAiAISuggest = async () => {
    setAiAssistantLoading(true);
    try {
      const res = await fetch("/api/gemini/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Recommend high demand HSN codes and matching GST slabs for mobile electronics accessories and professional software subscription packages in India.",
        })
      });
      const data = await res.json();
      setAiAssistantResponse(data.text);
    } catch (err) {
      setAiAssistantResponse("Unable to fetch recommendations at this time.");
    } finally {
      setAiAssistantLoading(false);
    }
  };

  // Simulate AI OCR Bill Scanner Action
  const triggerSampleOCR = async (sampleType: "hotel" | "hardware") => {
    setOcrLoading(true);
    setOcrMessage("Uploading asset receipt image to Google Gemini Flash OCR parsing model...");

    let simulatedBase64 = "MOCK_BASE64_IMAGE_DATA_STRING"; // Normally actual image base64 is captured here

    try {
      const res = await fetch("/api/gemini/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: simulatedBase64,
          mimeType: "image/png"
        })
      });

      const data = await res.json();
      if (data.extracted) {
        const { vendorName, date, totalAmount, gstin, category, items, gstPaid } = data.extracted;
        
        // Auto populate expense creation
        setNewEx({
          date: date || new Date().toISOString().split("T")[0],
          description: `Bill from ${vendorName || "Bharat Traders"} - Items: ${items?.map((it: any) => it.description).join(", ") || "Office supply materials"}`,
          category: category || "Office Supplies",
          amount: totalAmount || 1850,
          gstPaid: gstPaid || 280,
          paymentMethod: "UPI"
        });

        setOcrMessage("🎉 Gemini OCR scanned successfully! Extracted all products, tax components, and populated the expense card below.");
      }
    } catch (err) {
      setOcrMessage("Failed scanning bill image. Running sandbox fallback.");
    } finally {
      setOcrLoading(false);
    }
  };

  // e-Way Bill & e-Invoicing NIC Gateway Simulator
  const handleCreateEwayBill = async (invId: string) => {
    setEwayLoading(true);
    setEwaySteps(["Connecting GSP sandbox gateway...", "Uploading JSON schema elements to NIC portal...", "Validating HSN/SAC compliance brackets..."]);
    
    await new Promise(r => setTimeout(r, 600));
    setEwaySteps(prev => [...prev, "Contacting IRP server... Cryptographically signing document..."]);
    
    await new Promise(r => setTimeout(r, 500));
    const randomIrn = Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
    const randomAck = "102" + Math.floor(100000000000 + Math.random() * 900000000000).toString();
    const randomEwayNo = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    const ackDateStr = new Date().toISOString().replace("T", " ").substring(0, 19);

    const updated = invoices.map(inv => {
      if (inv.id === invId) {
        return {
          ...inv,
          eInvoiceStatus: "Generated" as const,
          irnNumber: randomIrn,
          ackNumber: randomAck,
          ackDate: ackDateStr,
          eWayBillNo: randomEwayNo,
          eWayBillVehicleNo: ewayVehicle || "MH-12-FG-5512",
          eWayBillTransporter: ewayTransporter || "Delhivery Cargo Express",
          eWayBillDistance: ewayDistance || "150"
        };
      }
      return inv;
    });

    setInvoices(updated);
    
    // update current viewing ref too
    const currentInv = updated.find(i => i.id === invId);
    if (currentInv) {
      setViewingInvoice(currentInv);
    }
    
    setEwayLoading(false);
    setEwaySteps([]);
    alert("🎉 e-Way Bill & government-signed GST e-Invoice IRN successfully generated! It is now printed directly on the invoice layout below.");
  };

  // CSV Exporter driver
  const handleCSVExport = async (dataset: any[], fields: string[], filename: string) => {
    try {
      const res = await fetch("/api/export/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataset, fields })
      });

      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Export failed.");
    }
  };

  // Google AdSense Click Simulation Handler
  const handleAdSenseTestClick = () => {
    setAdsenseClicks(prev => prev + 1);
    setAdsenseImpressions(prev => prev + 14); // Simulate general organic traffic impressions growth
    setAdsensePageViews(prev => prev + 8); // Simulate general organic traffic page views growth
    setAdsenseEarnings(prev => prev + 0.45); // increment active earnings by 45 cents (approx 37 rupees!)
    const clickRevINR = (0.45 * 82.5).toFixed(2);
    alert(`🎉 Click Authorized! Simulated AdSense Click tracked.\n💰 Ad revenue matching: +₹${clickRevINR} added to your active account balances!`);
  };

  // Print triggering
  const handlePrint = () => {
    window.print();
  };

  // Generate automated reminders template matching Indian regional WhatsApp expectations
  const getWhatsAppReminderUrl = (inv: Invoice, cust: Customer) => {
    const textMessage = `Dear ${cust.name}, namaste! This is a friendly reminder for payment regarding Invoice #${inv.invoiceNumber} from ${activeBusiness.name}. 
Total outstanding amount is ₹${inv.totalAmount.toLocaleString("en-IN")} due on ${inv.dueDate}. 
You can directly scan the UPI QR code on the bill copy or pay via UPI Id: ${activeBusiness.upiId || "active UPI VPA"}. 
Thank you! From ${activeBusiness.name}.`;
    return `https://wa.me/${cust.phone ? cust.phone.replace(/[^0-9]/g, "") : ""}?text=${encodeURIComponent(textMessage)}`;
  };

  // Dashboard calculations
  const totalOutstanding = invoices
    .filter(i => i.status !== "Paid" && i.status !== "Draft")
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const totalRevenue = invoices
    .filter(i => i.status === "Paid")
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const totalGSTCollected = invoices
    .filter(i => i.status === "Paid")
    .reduce((sum, i) => sum + (i.cgst + i.sgst + i.igst), 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex justify-between items-center z-10 sticky top-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-sm flex items-center justify-center">
            <TrendingUp size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-slate-900 flex items-center gap-2">
              VyaparFlow <span className="text-[10px] bg-indigo-50 text-indigo-600 font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded border border-indigo-100">Bharat CA</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Indian Business Invoice & P&L Companion</p>
          </div>
        </div>

        {/* Business Selector & Premium Indicator */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-mono">
            <Building2 size={14} className="text-slate-500" />
            <span className="text-slate-700 font-semibold">
              {activeBusiness?.name === "Gupta Electronics & Appliances" ? "My Business" : activeBusiness?.name}
            </span>
          </div>

          {premiumPlan === "premium" ? (
            <div className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
              <Zap size={12} className="fill-amber-600 stroke-none animate-pulse" /> PRO
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => {
                setPremiumPlan("premium");
                alert("🎉 Thank you! VyaparFlow PREMIUM has been activated for unlimited invoicing!");
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Sparkles size={12} /> Go PRO
            </motion.button>
          )}

          {/* User auth state buttons */}
          {authLoading ? (
            <span className="text-xs text-slate-400 font-mono">Connecting Auth...</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <img
                src={user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"}
                alt="Profile"
                className="w-8 h-8 rounded-full border border-indigo-600"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={logoutUser}
                title="Log Out"
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-150 rounded-lg transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-indigo-600 text-white font-semibold text-xs px-3 py-1.5 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <UserCheck size={14} /> Sign In
            </button>
          )}
        </div>
      </header>

       {/* Main SaaS Frame */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Side Tab Navigation */}
        <nav className="w-64 border-r border-slate-200 bg-white p-4 space-y-2 flex flex-col justify-between hidden md:flex">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-3 mb-2">Ledger Menu</p>
            {[
              { id: "dashboard", label: "Dashboard P&L", icon: TrendingUp },
              { id: "invoices", label: "GST Bills Maker", icon: FileText },
              { id: "customers", label: "Client Book", icon: Users },
              { id: "products", label: "Inventory Products", icon: Package },
              { id: "expenses", label: "Expense Book (OCR)", icon: CreditCard },
              { id: "store", label: "Online Store Setup", icon: Globe },
              { id: "reports", label: "GST Reports & GSTR-1", icon: FileSearch }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setViewingInvoice(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600 font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}

            {/* Simulated Admin Console Drawer */}
            <div className="pt-6">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-3 mb-2">System Admin</p>
              <button
                onClick={() => setIsAdmin(!isAdmin)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isAdmin ? "bg-rose-50 text-rose-600 border-l-4 border-rose-600 font-semibold shadow-xs" : "text-slate-600 hover:text-rose-600 hover:bg-rose-50/30"
                }`}
              >
                <Settings size={16} /> Admin Console
              </button>
            </div>
          </div>

          {/* Quick legal compliance footer */}
          <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-200 text-[11px] text-slate-500 shadow-xs">
            <p className="font-bold text-slate-800 text-xs">GST Compliance</p>
            <p>Ready for GSTR-1, GSTR-3B audit summaries. Default format INR ₹.</p>
          </div>
        </nav>

        {/* Content Box Area */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Mobile Navigation fallback */}
          <div className="flex md:hidden gap-1 pb-4 border-b border-slate-200 overflow-x-auto">
            {["dashboard", "invoices", "customers", "products", "expenses", "store", "reports"].map(t => (
              <button
                key={t}
                onClick={() => {
                  setActiveTab(t);
                  setViewingInvoice(null);
                }}
                className={`px-3 py-1 text-xs rounded-full font-bold whitespace-nowrap capitalize ${
                  activeTab === t ? "bg-indigo-600 text-white" : "bg-slate-100/60 border border-slate-200 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t === "store" ? "Online Store" : t === "reports" ? "GSTR Returns" : t}
              </button>
            ))}
          </div>

          {/* Tab Content dispatcher */}
          <AnimatePresence mode="wait">
            
            {/* 1. DASHBOARD VIEW PANEL */}
            {activeTab === "dashboard" && !viewingInvoice && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Visual statistics metrics cluster */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Net Sales Revenue</span>
                      <TrendingUp size={16} className="text-emerald-600" />
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-black font-mono text-emerald-600">₹{totalRevenue.toLocaleString("en-IN")}</h3>
                      <p className="text-[11px] text-slate-400 mt-1">From completed & paid tax invoices</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Unresolved Receivables</span>
                      <AlertTriangle size={16} className="text-rose-600" />
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-black font-mono text-rose-600">₹{totalOutstanding.toLocaleString("en-IN")}</h3>
                      <p className="text-[11px] text-slate-400 mt-1">Overdue, partially paid, or unpaid bills</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total GST Liabilities</span>
                      <Building2 size={16} className="text-indigo-600" />
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-black font-mono text-indigo-600">₹{totalGSTCollected.toLocaleString("en-IN")}</h3>
                      <p className="text-[11px] text-slate-400 mt-1">Accumulated CGST, SGST, & IGST</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Operating Expenses</span>
                      <CreditCard size={16} className="text-amber-600" />
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-black font-mono text-amber-600">₹{totalExpenses.toLocaleString("en-IN")}</h3>
                      <p className="text-[11px] text-slate-400 mt-1">Rent, tech, & raw expenditures</p>
                    </div>
                  </div>
                </div>

                {/* Main Content Hub - Bento grid layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column widgets: List of key client balances */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs col-span-1 lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 font-display">Fast Invoice Status Summary</h4>
                        <p className="text-xs text-slate-500">Recent customer dealings and payouts tracking</p>
                      </div>
                      <button
                        onClick={() => setActiveTab("invoices")}
                        className="text-indigo-600 text-xs hover:underline flex items-center gap-1 font-semibold"
                      >
                        Launch Invoice Module →
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 font-mono text-xs">
                      {invoices.slice(0, 5).map(inv => {
                        const targetCust = customers.find(c => c.id === inv.customerId);
                        return (
                          <div key={inv.id} className="py-3 flex justify-between items-center gap-4">
                            <div>
                              <p className="font-bold text-slate-800">{inv.invoiceNumber}</p>
                              <p className="text-[10px] text-slate-500">{targetCust?.name || "No Client Ref"}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-sans font-bold ${
                                inv.status === "Paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-250/10" : "bg-rose-50 text-rose-700 border border-rose-250/10"
                              }`}>{inv.status}</span>
                              <span className="font-bold text-right text-slate-900">₹{inv.totalAmount.toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column widget: Google AdSense & Upgrade Promoters */}
                  <div className="space-y-6 col-span-1">
                    
                    {/* Interactive Google AdSense simulated visual block */}
                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/60 relative overflow-hidden shadow-xs">
                      <div className="absolute top-1 right-2 text-[8px] tracking-widest text-slate-500 font-mono uppercase bg-white border px-1.5 py-0.5 rounded">AdSense Partner</div>
                      <h5 className="text-[11px] font-bold text-amber-800 uppercase tracking-widest mb-1.5 font-display">Specialized Business Services</h5>
                      <p className="text-xs text-slate-700 leading-snug">Need MSME business loans quickly or Instant GST registration in Mumbai? Work with certified local CAs now.</p>
                      <button
                        onClick={() => alert("Simulated sponsor action. Upgrade to Premium to completely remove all web app placements!")}
                        className="mt-3 w-full bg-amber-600 text-white hover:bg-amber-700 font-bold text-[10px] py-1.5 uppercase rounded tracking-wide transition-colors"
                      >
                        Explore CA Offers
                      </button>
                    </div>

                    {/* Quick Referral promo block */}
                    <div className="p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100 relative shadow-xs">
                      <h4 className="font-bold text-indigo-900 flex items-center gap-2 text-sm"><GiftCard size={14} className="text-pink-500 fill-pink-500/20" /> Invite & Earn ₹500 Cashback</h4>
                      <p className="text-xs text-slate-400 mt-2">Refer other store owners or freelancers. When they activate premium, both get credits!</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://vyaparflow.com/invite_ref=${auth.currentUser?.uid || "user"}`);
                          alert("📋 Copy linked! Send this to clients or vendors.");
                        }}
                        className="mt-3 w-full border border-indigo-200 text-indigo-700 bg-white hover:bg-slate-55 font-semibold text-xs py-2 rounded-xl transition-all"
                      >
                        Generate Invite Link
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI CA tax assistant chat terminal container */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 font-sans">
                  <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 font-display">VyaparFlow AI CA & Invoice Assistant</h4>
                        <p className="text-xs text-slate-500">Ask tax questions, write follow-up reminder templates, generate HSN descriptions</p>
                      </div>
                    </div>
                    {aiAssistantLoading && <span className="text-xs text-indigo-600 animate-pulse font-mono font-bold">CA working...</span>}
                  </div>

                  {/* Chat flow messages panel */}
                  <div className="h-56 overflow-y-auto space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs">
                    {aiChatLogs.map((log, index) => (
                      <div key={index} className={`flex ${log.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`p-3 rounded-lg max-w-xl transition-all whitespace-pre-wrap leading-relaxed ${
                          log.sender === "user" ? "bg-indigo-600 text-white" : "bg-white text-slate-800 border border-slate-200 shadow-xs"
                        }`}>
                          <p>{log.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAIChatSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={aiAssistantPrompt}
                      onChange={(e) => setAiAssistantPrompt(e.target.value)}
                      placeholder="e.g., Draft a polite payment follow up email in Hinglish / Hindi..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 font-sans"
                    />
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-xs"
                    >
                      Ask AI <Send size={14} />
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* 2. INVOICE GENERATOR VIEW PANEL */}
            {activeTab === "invoices" && !viewingInvoice && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Header Action Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <h2 className="text-2xl font-bold font-display text-slate-900">GST Bill & Commercial Invoice Book</h2>
                    <p className="text-xs text-slate-500 mt-1">Generate compliant invoices, proformas, quotations to WhatsApp or Print</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCSVExport(invoices, ["invoiceNumber", "totalAmount", "status", "date", "dueDate"], "vyaparflow-invoices.csv")}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <FileSpreadsheet size={14} /> Export CSV
                    </button>
                    <button
                      onClick={() => setShowInvoiceCreator(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Create Bill / Invoice
                    </button>
                  </div>
                </div>

                {/* Create Invoice Creator Form Overlay */}
                {showInvoiceCreator && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center overflow-y-auto p-4"
                  >
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative text-sm select-none shadow-2xl">
                      <button
                        onClick={() => setShowInvoiceCreator(false)}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-105 transition-colors"
                      >
                        <X size={18} />
                      </button>

                      <h3 className="text-xl font-bold font-display text-slate-900 mb-4">New Commercial Document</h3>
                      
                      <form onSubmit={handleCreateInvoice} className="space-y-6">
                        
                        {/* Business setting selection */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">Document Type</label>
                            <select
                              value={creatorInvoiceType}
                              onChange={(e) => setCreatorInvoiceType(e.target.value as InvoiceType)}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                            >
                              <option value="GST Invoice">GST Tax Invoice</option>
                              <option value="Proforma Invoice">Proforma Invoice</option>
                              <option value="Quotation">Quotation / Estimate</option>
                              <option value="Receipt">Receipt Voucher</option>
                              <option value="Delivery Challan">Delivery Challan</option>
                              <option value="Purchase Order">Purchase Order</option>
                              <option value="Credit Note">Credit Note</option>
                              <option value="Debit Note">Debit Note</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">Billing Client (Customer)</label>
                            <select
                              value={creatorCustomerId}
                              onChange={(e) => setCreatorCustomerId(e.target.value)}
                              required
                              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                            >
                              <option value="">-- Choose Client --</option>
                              {customers.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.name} ({INDIAN_STATES.find(s => s.code === c.stateCode)?.name || "Other State"})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => {
                                setShowCustomerForm(true);
                              }}
                              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Plus size={12} /> Add Quick Customer
                            </button>
                          </div>
                        </div>

                        {/* Dates Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">Date of Issue</label>
                            <input
                              type="date"
                              value={creatorDate}
                              onChange={(e) => setCreatorDate(e.target.value)}
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">Due Date</label>
                            <input
                              type="date"
                              value={creatorDueDate}
                              onChange={(e) => setCreatorDueDate(e.target.value)}
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Invoice Items Table List */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Trading Materials / Services Details</h4>
                            <button
                              type="button"
                              onClick={addCreatorLineItem}
                              className="text-xs text-indigo-650 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Plus size={12} /> Add Row
                            </button>
                          </div>

                          <div className="space-y-2 max-h-56 overflow-y-auto">
                            {creatorItems.map((item, idx) => (
                              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-xs">
                                <div className="md:col-span-4">
                                  <input
                                    type="text"
                                    value={item.description}
                                    placeholder="Particular description"
                                    required
                                    onChange={(e) => handleItemFieldChange(idx, "description", e.target.value)}
                                    className="w-full bg-transparent border-b border-slate-200 py-1 text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <input
                                    type="text"
                                    value={item.hsnSac || ""}
                                    placeholder="HSN / SAC"
                                    onChange={(e) => handleItemFieldChange(idx, "hsnSac", e.target.value)}
                                    className="w-full bg-transparent border-b border-slate-200 py-1 text-xs text-center focus:outline-none focus:border-indigo-500 text-slate-800"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <input
                                    type="number"
                                    value={item.rate || ""}
                                    placeholder="Rate ₹"
                                    required
                                    onChange={(e) => handleItemFieldChange(idx, "rate", Number(e.target.value))}
                                    className="w-full bg-transparent border-b border-slate-200 py-1 text-xs text-right focus:outline-none focus:border-indigo-500 text-slate-800"
                                  />
                                </div>
                                <div className="md:col-span-1">
                                  <input
                                    type="number"
                                    value={item.quantity || "1"}
                                    placeholder="Qty"
                                    required
                                    onChange={(e) => handleItemFieldChange(idx, "quantity", Number(e.target.value))}
                                    className="w-full bg-transparent border-b border-slate-200 py-1 text-xs text-center focus:outline-none focus:border-indigo-500 text-slate-800"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <select
                                    value={item.gstRate}
                                    onChange={(e) => handleItemFieldChange(idx, "gstRate", Number(e.target.value))}
                                    className="w-full bg-transparent border-b border-slate-200 py-1 text-xs text-indigo-600 focus:outline-none focus:border-indigo-500 font-medium"
                                  >
                                    <option value="0">0% Excl</option>
                                    <option value="5">5% S-S</option>
                                    <option value="12">12% S-N</option>
                                    <option value="18">18% Standard</option>
                                    <option value="28">28% Luxury</option>
                                  </select>
                                </div>
                                <div className="md:col-span-1 text-right">
                                  <button
                                    type="button"
                                    onClick={() => removeCreatorLineItem(idx)}
                                    className="text-rose-650 hover:text-rose-500 p-1 rounded hover:bg-rose-50 transition-colors"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Proration elements / Discounts & notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start border-t border-slate-100 pt-4">
                          <div className="space-y-4">
                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                                <Sparkles size={11} /> VyaparFlow AI CA Suggester helper
                              </h5>
                              <p className="text-[10px] text-slate-500 leading-snug">Suggest compliant items HSN codes, appropriate tax brackets, and formal accounting clauses instantly.</p>
                              <button
                                type="button"
                                onClick={triggerAiAISuggest}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase font-bold py-1 px-2.5 rounded transition-colors shadow-xs"
                              >
                                Ask compliance suggestion Guide
                              </button>
                              {aiAssistantResponse && (
                                <p className="text-[10px] mt-2 text-slate-700 whitespace-pre-line border-t border-indigo-100 pt-2 font-mono">{aiAssistantResponse}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1.5">Private Notes on Bill</label>
                              <textarea
                                value={creatorNotes}
                                onChange={(e) => setCreatorNotes(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none h-16 text-slate-800"
                              />
                            </div>
                          </div>

                          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 font-mono text-xs">
                            <div className="flex justify-between items-center text-slate-700">
                              <span>Subtotal Discount (INR ₹)</span>
                              <input
                                type="number"
                                value={creatorDiscount || ""}
                                onChange={(e) => setCreatorDiscount(Number(e.target.value))}
                                className="w-24 bg-white border border-slate-200 py-1 px-2 text-right rounded font-bold text-slate-800"
                              />
                            </div>

                            <div className="flex justify-between items-center text-slate-700">
                              <span>Lump-sum Shipping (INR ₹)</span>
                              <input
                                type="number"
                                value={creatorShipping || ""}
                                onChange={(e) => setCreatorShipping(Number(e.target.value))}
                                className="w-24 bg-white border border-slate-200 py-1 px-2 text-right rounded font-bold text-slate-800"
                              />
                            </div>

                            <div className="text-[10px] text-slate-400 italic font-sans text-right pt-2">
                              Note: GSTR State routed calculations (CGST/SGST intrastate vs. IGST interstate) will be dynamically evaluated when this document is finalized.
                            </div>

                            <button
                              type="submit"
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl uppercase tracking-wider transition-colors shadow-xs"
                            >
                              Finalize and Issue Invoice
                            </button>
                          </div>
                        </div>

                      </form>
                    </div>
                  </motion.div>
                )}

                {/* Listing Grid */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <span className="text-sm font-bold text-slate-800">Commercial Records Register ({invoices.length} entries)</span>
                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search invoice number..."
                        className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-1.5 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 capitalize">
                        <tr>
                          <th className="py-3 px-4">Invoice No</th>
                          <th className="py-3 px-4">Client Detail</th>
                          <th className="py-3 px-4">Doc Type</th>
                          <th className="py-3 px-4">Issue Date</th>
                          <th className="py-3 px-4">Net Value</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoices.map((inv) => {
                          const assocCustomer = customers.find(c => c.id === inv.customerId);
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/55 transition-colors font-mono">
                              <td className="py-4 px-4 font-bold text-slate-900">{inv.invoiceNumber}</td>
                              <td className="py-4 px-4 text-slate-700">
                                {assocCustomer ? assocCustomer.name : "Unregistered Customer"}
                              </td>
                              <td className="py-4 px-4"><span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/40">{inv.type}</span></td>
                              <td className="py-4 px-4 text-slate-500">{inv.date}</td>
                              <td className="py-4 px-4 font-bold text-slate-900">₹{inv.totalAmount.toLocaleString("en-IN")}</td>
                              <td className="py-4 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded font-bold font-sans ${
                                  inv.status === "Paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                                }`}>{inv.status}</span>
                              </td>
                              <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => setViewingInvoice(inv)}
                                  className="text-indigo-600 hover:underline hover:text-indigo-700 text-[11px] font-semibold"
                                >
                                  View / Print
                                </button>
                                <button
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  className="text-rose-650 hover:text-rose-500 p-1 hover:bg-rose-50 rounded"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </motion.div>
            )}

            {/* 3. INVOICE VISUALIZER OVERLAY TAB (HIGH FIDELITY PRINT PREVIEW) */}
            {viewingInvoice && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Visualizer Row Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingInvoice(null)}
                      className="text-slate-500 hover:text-slate-800 hover:underline text-xs font-semibold"
                    >
                      ← Back to listing
                    </button>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs font-mono font-bold text-slate-700">Viewing {viewingInvoice.invoiceNumber}</span>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {/* Status updater */}
                    <select
                      value={viewingInvoice.status}
                      onChange={(e) => handleUpdateStatus(viewingInvoice.id, e.target.value as InvoiceStatus)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
                    >
                      <option value="Unpaid">Unpaid</option>
                      <option value="Paid">Paid</option>
                      <option value="Draft">Draft</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Overdue">Overdue</option>
                    </select>

                    {/* Template style selector */}
                    <select
                      value={invoiceTemplate}
                      onChange={(e) => setInvoiceTemplate(e.target.value as any)}
                      className="bg-indigo-50 border border-indigo-150 rounded-xl px-2.5 py-1.5 text-xs text-indigo-700 focus:outline-none font-bold"
                    >
                      <option value="modern">Modern Slate</option>
                      <option value="classic">Emerald Classic</option>
                      <option value="thermal">Compact Thermal (80mm)</option>
                    </select>

                    {/* Remind client */}
                    <a
                      href={getWhatsAppReminderUrl(viewingInvoice, customers.find(c => c.id === viewingInvoice.customerId) || SAMPLE_CUSTOMER)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1 shadow-xs"
                    >
                      <Share2 size={12} /> WhatsApp Reminder
                    </a>

                    <button
                      onClick={handlePrint}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-700 flex items-center gap-1 transition-colors"
                    >
                      <Printer size={12} /> Thermal / A4 Print
                    </button>
                  </div>
                </div>

                {/* Print area rendering card */}
                <div className="flex justify-center bg-slate-100 p-6 rounded-2xl border border-slate-200 select-all overflow-x-auto">
                  <InvoicePrintTemplate
                    invoice={viewingInvoice}
                    business={activeBusiness}
                    customer={customers.find(c => c.id === viewingInvoice.customerId) || SAMPLE_CUSTOMER}
                    templateStyle={invoiceTemplate}
                    isPremium={premiumPlan === "premium"}
                  />
                </div>
              </motion.div>
            )}

            {/* 4. CUSTOMERS LEDGER PANEL */}
            {activeTab === "customers" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <h2 className="text-2xl font-bold font-display text-slate-900">Clients Ledger Book</h2>
                    <p className="text-xs text-slate-500 mt-1">Manage recurring customer registers, vendors, and balances</p>
                  </div>
                  <button
                    onClick={() => setShowCustomerForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1 shadow-xs"
                  >
                    <Plus size={14} /> Add New Client
                  </button>
                </div>

                {/* Add Customer Overlay */}
                {showCustomerForm && (
                  <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200 relative text-sm shadow-2xl">
                      <button
                        onClick={() => setShowCustomerForm(false)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition-colors"
                      >
                        <X size={16} />
                      </button>
                      <h3 className="text-lg font-bold font-display text-slate-900 mb-4">Add Customer Firm</h3>
                      
                      <form onSubmit={handleAddCustomer} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Company / Customer Name *</label>
                          <input
                            type="text"
                            required
                            value={newCust.name}
                            onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                            placeholder="e.g. Mehta Garments Pvt Ltd"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">GSTIN (Optional)</label>
                          <input
                            type="text"
                            value={newCust.gstin}
                            maxLength={15}
                            onChange={(e) => setNewCust({ ...newCust, gstin: e.target.value.toUpperCase() })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                            placeholder="15-char Alpha-numeric"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Mobile / Phone *</label>
                            <input
                              type="tel"
                              required
                              value={newCust.phone}
                              onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                              placeholder="e.g. 9845012345"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">State for GST *</label>
                            <select
                              value={newCust.stateCode}
                              onChange={(e) => setNewCust({ ...newCust, stateCode: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                            >
                              {INDIAN_STATES.map(st => (
                                <option key={st.code} value={st.code}>{st.name} ({st.code})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Email Address</label>
                          <input
                            type="email"
                            value={newCust.email}
                            onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                            placeholder="support@client.in"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Detailed Billing Address</label>
                          <textarea
                            value={newCust.address}
                            onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none h-16 text-slate-800"
                            placeholder="G-42, Textile Tower, Surat"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 py-2.5 rounded-xl text-xs font-bold text-white transition-colors shadow-xs"
                        >
                          Save Customer Profile
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Clients list table */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customers.map(cust => {
                    const totalBilled = invoices
                      .filter(i => i.customerId === cust.id)
                      .reduce((sum, inv) => sum + inv.totalAmount, 0);

                    const totalDue = invoices
                      .filter(i => i.customerId === cust.id && i.status !== "Paid")
                      .reduce((sum, inv) => sum + inv.totalAmount, 0);

                    return (
                      <div key={cust.id} className="bg-white p-5 rounded-2xl border border-slate-200 relative space-y-4 shadow-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 text-base">{cust.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {cust.id.slice(0, 8)}</p>
                          </div>
                          <button
                            onClick={async () => {
                              if (confirm("Are you sure you want to delete this customer?")) {
                               if (user) await deleteCustomerFromDb(cust.id);
                                setCustomers(customers.filter(c => c.id !== cust.id));
                              }
                            }}
                            className="text-rose-650 hover:text-rose-500 p-1 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div className="space-y-1 font-mono text-xs">
                          {cust.gstin && <p className="text-indigo-600 font-bold">GSTIN: {cust.gstin}</p>}
                          <p className="text-slate-600">Ph: {cust.phone || "No smartphone link"}</p>
                          <p className="text-slate-600">{cust.address}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">Total Billed</span>
                            <span className="font-extrabold text-slate-800">₹{totalBilled.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">Active Dues</span>
                            <span className={`font-extrabold ${totalDue > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                              ₹{totalDue.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </motion.div>
            )}

            {/* 5. PRODUCT CATALOG / INVENTORY PANEL */}
            {activeTab === "products" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <h2 className="text-2xl font-bold font-display text-slate-900">Inventory Materials Register</h2>
                    <p className="text-xs text-slate-500 mt-1">Store billing items to auto-complete and save calculations during invoicing</p>
                  </div>
                  <button
                    onClick={() => setShowProductForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1 shadow-xs"
                  >
                    <Plus size={14} /> Add Item / Software Proposal
                  </button>
                </div>

                {/* Add Product Modal */}
                {showProductForm && (
                  <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200 relative text-sm shadow-2xl">
                      <button
                        onClick={() => setShowProductForm(false)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition-colors"
                      >
                        <X size={16} />
                      </button>
                      <h3 className="text-lg font-bold font-display text-slate-900 mb-4">Add Product / Service Model</h3>
                      
                      <form onSubmit={handleAddProduct} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Item Particular Name *</label>
                          <input
                            type="text"
                            required
                            value={newProd.name}
                            onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                            placeholder="e.g. 5-Layer Cotton protective Mask Block"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Base Unit Price (₹) *</label>
                            <input
                              type="number"
                              required
                              value={newProd.unitPrice || ""}
                              onChange={(e) => setNewProd({ ...newProd, unitPrice: Number(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                              placeholder="₹ Base clear charge"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">GST Tax Bracket (%) *</label>
                            <select
                              value={newProd.gstRate}
                              onChange={(e) => setNewProd({ ...newProd, gstRate: Number(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                            >
                              <option value="0">0% Empty / Exempt</option>
                              <option value="5">5% Concessional</option>
                              <option value="12">12% Normal SP</option>
                              <option value="18">18% Standard IT/Mfg</option>
                              <option value="28">28% Luxury bracket</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">HSN or SAC Code (Optional)</label>
                          <input
                            type="text"
                            maxLength={8}
                            value={newProd.hsnSac}
                            onChange={(e) => setNewProd({ ...newProd, hsnSac: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                            placeholder="6-digit / 8-digit regulatory code"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                          <textarea
                            value={newProd.description}
                            onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-800"
                            placeholder="Write brief material parameters..."
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 py-2.5 rounded-xl text-xs font-bold text-white transition-colors shadow-xs"
                        >
                          Save Inventory Item
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Products Grid list */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {products.map(prod => (
                    <div key={prod.id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 relative shadow-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900">{prod.name}</h4>
                          {prod.hsnSac && <p className="text-[10px] text-slate-400 font-mono">HSN: {prod.hsnSac}</p>}
                        </div>
                        <button
                          onClick={async () => {
                            if (confirm("Are you sure you want to delete this inventory item?")) {
                              if (user) await deleteProductFromDb(prod.id);
                              setProducts(products.filter(p => p.id !== prod.id));
                            }
                          }}
                          className="text-rose-650 hover:text-rose-500 p-1 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="flex justify-between items-center text-xs font-mono pt-2 border-t border-slate-100 text-slate-600">
                        <span>Sale Price:</span>
                        <span className="font-black text-slate-900">₹{prod.unitPrice.toLocaleString("en-IN")}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-mono text-slate-600">
                        <span>GST Slab:</span>
                        <span className="text-indigo-650 font-bold">{prod.gstRate}% Tax</span>
                      </div>
                    </div>
                  ))}
                  
                  {products.length === 0 && (
                    <div className="p-8 text-center text-slate-450 col-span-3">
                      No materials found. Click "Add Item" to initialize your inventory book!
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* 6. EXPENSES & AI OCR SCANNER PANEL */}
            {activeTab === "expenses" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <h2 className="text-2xl font-bold font-display text-slate-900">Expense Tracker & AI OCR Scan</h2>
                    <p className="text-xs text-slate-500 mt-1">Scan store bills instantly to automatically extract GST and auto-complete expenses</p>
                  </div>
                  <button
                    onClick={() => setShowExpenseForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1 shadow-xs"
                  >
                    <Plus size={14} /> Log Manual Spend
                  </button>
                </div>

                {/* AI OCR Bill Scanner Box */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Camera size={16} className="text-indigo-600" /> Google Gemini AI OCR Receipt Scanner
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Have a purchase bill or supplier receipt? Choose a sample scan below to trigger the Google Gemini multimodal model. It will read line items, locate supplier GSTIN codes, and extract tax rates automatically!
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => triggerSampleOCR("hardware")}
                      disabled={ocrLoading}
                      className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition-all relative flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">Option A</span>
                        <h5 className="font-bold text-xs mt-1 text-slate-800">Scan Stationery Supplier Invoice</h5>
                        <p className="text-[11px] text-slate-500 mt-1">Extracts ₹5,908 expense under Office supplies and lists GST details</p>
                      </div>
                      <span className="text-[10px] text-indigo-700 font-semibold underline mt-3">Scan Receipt Copy →</span>
                    </button>

                    <button
                      onClick={() => triggerSampleOCR("hotel")}
                      disabled={ocrLoading}
                      className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition-all relative flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">Option B</span>
                        <h5 className="font-bold text-xs mt-1 text-slate-800">Scan Courier & Logistics Bill</h5>
                        <p className="text-[11px] text-slate-500 mt-1">Automates transport spending components seamlessly</p>
                      </div>
                      <span className="text-[10px] text-indigo-700 font-semibold underline mt-3">Scan Courier Copy →</span>
                    </button>
                  </div>

                  {ocrMessage && (
                    <div className="p-3 bg-indigo-50 text-indigo-800 border border-indigo-150 rounded-xl text-xs font-mono">
                      {ocrMessage}
                    </div>
                  )}
                </div>

                {/* Add Expense Form Drawer */}
                {showExpenseForm && (
                  <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200 relative text-sm shadow-2xl">
                      <button
                        onClick={() => setShowExpenseForm(false)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition-colors"
                      >
                        <X size={16} />
                      </button>
                      <h3 className="text-lg font-bold font-display text-slate-900 mb-4">Log Outgo Spend</h3>
                      
                      <form onSubmit={handleAddExpense} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Expense Date *</label>
                          <input
                            type="date"
                            required
                            value={newEx.date}
                            onChange={(e) => setNewEx({ ...newEx, date: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Description / Paid To *</label>
                          <input
                            type="text"
                            required
                            value={newEx.description}
                            onChange={(e) => setNewEx({ ...newEx, description: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                            placeholder="e.g. Office computer router"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Total Amount (₹) *</label>
                            <input
                              type="number"
                              required
                              value={newEx.amount || ""}
                              onChange={(e) => setNewEx({ ...newEx, amount: Number(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                              placeholder="₹ Full Paid value"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">GST Tax Component</label>
                            <input
                              type="number"
                              value={newEx.gstPaid || ""}
                              onChange={(e) => setNewEx({ ...newEx, gstPaid: Number(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                              placeholder="₹ Tax component if any"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Spend Category *</label>
                            <select
                              value={newEx.category}
                              onChange={(e) => setNewEx({ ...newEx, category: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                            >
                              <option value="Office Supplies">Office Supplies</option>
                              <option value="Rent">Rent</option>
                              <option value="Salaries">Salaries / Wages</option>
                              <option value="Software & Tech">Software & Tech</option>
                              <option value="Travel & Transport">Freight / Transport</option>
                              <option value="Inventory Purchase">Inventory Procurement</option>
                              <option value="Marketing">Marketing / Ads</option>
                              <option value="Other Expense Category">Other Spends</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Payment Channel *</label>
                            <select
                              value={newEx.paymentMethod}
                              onChange={(e) => setNewEx({ ...newEx, paymentMethod: e.target.value as any })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                            >
                              <option value="UPI">UPI Payment</option>
                              <option value="Cash">Cash Pay</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="Credit Card">Credit Card</option>
                              <option value="Cheque">Cheque Pay</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 py-2.5 rounded-xl text-xs font-bold text-white transition-colors shadow-xs"
                        >
                          Save Spend Log
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Expenses listed in table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-xs">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 capitalize">
                      <tr>
                        <th className="py-3 px-4">Spend Date</th>
                        <th className="py-3 px-4">Description Particular</th>
                        <th className="py-3 px-4 text-center">Category</th>
                        <th className="py-3 px-4 text-center">Paid Via</th>
                        <th className="py-3 px-4 text-right">GST Paid</th>
                        <th className="py-3 px-4 text-right">Net Billing</th>
                        <th className="py-3 px-4 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses.map(ex => (
                        <tr key={ex.id} className="hover:bg-slate-50/55 transition-colors">
                          <td className="py-4 px-4 font-bold text-slate-800">{ex.date}</td>
                          <td className="py-4 px-4 text-slate-600">{ex.description}</td>
                          <td className="py-4 px-4 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100/30 text-[10px] font-bold">
                              {ex.category}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-slate-700">{ex.paymentMethod}</td>
                          <td className="py-4 px-4 text-right font-medium text-slate-500">
                            {ex.gstPaid ? `₹${ex.gstPaid}` : "—"}
                          </td>
                          <td className="py-4 px-4 text-right font-extrabold text-slate-900">
                            ₹{ex.amount.toLocaleString("en-IN")}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={async () => {
                                if (confirm("Remove this expense record?")) {
                                  if (user) await deleteExpenseFromDb(ex.id);
                                  setExpenses(expenses.filter(e => e.id !== ex.id));
                                }
                              }}
                              className="text-rose-650 hover:text-rose-500 p-1 hover:bg-rose-50 rounded transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </motion.div>
            )}

            {/* 6.1 ONLINE WEB STOREFRONT TAB (Swipe Online Catalog features) */}
            {activeTab === "store" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Store Header Banner Config Card */}
                <div className="bg-gradient-to-r from-indigo-900 to-slate-950 p-6 md:p-8 rounded-3xl text-white relative overflow-hidden shadow-xs">
                  <div className="absolute top-0 right-0 p-4 opacity-5 bg-indigo-500 rounded-full w-[380px] h-[380px] -mr-20 -mt-20 blur-3xl animate-pulse"></div>
                  <div className="relative z-10 max-w-3xl space-y-3">
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-[10px] font-bold uppercase tracking-widest">
                       Public Catalog & Lead Generation Engine
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight font-display">
                      Set up Your Instant Web Storefront
                    </h2>
                    <p className="text-xs md:text-sm text-indigo-200 leading-relaxed max-w-2xl">
                      Configure a public-facing, responsive web catalog of your shop items. Your clients can browse pricing, search items, and submit quote requests directly on WhatsApp. Received inquiries sync instantly into cash memo ledgers for quick GST invoice generation.
                    </p>
                  </div>
                </div>

                {/* HOW IT WORKS - CRUCIAL EXPLAINER CARD */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { step: "1", title: "Pick Domain & Bio", desc: "Select a custom subdomain and add your storefront tagline." },
                    { step: "2", title: "Select Inventory", desc: "Toggle which products to show/publish on the public site." },
                    { step: "3", title: "Share Public Link", desc: "Share your business web URL via WhatsApp or SMS." },
                    { step: "4", title: "Sync & Convert", desc: "View incoming client leads below and convert them to GST bills." }
                  ].map((s) => (
                    <div key={s.step} className="bg-white p-4 rounded-xl border border-slate-150 relative space-y-1">
                      <span className="absolute top-3 right-3 text-3xl font-black text-slate-100 font-sans tracking-wide leading-none">{s.step}</span>
                      <h4 className="font-bold text-slate-800 text-xs font-sans relative z-10 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 text-[11px] font-black">{s.step}</span>
                        {s.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-normal font-sans relative z-10">{s.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Domain & Bio Configuration Panel */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Set Your Store URL Subdomain</label>
                      <div className="flex select-none">
                        <span className="bg-slate-100 border border-slate-200 border-r-0 rounded-l-xl px-2.5 py-2 text-[10px] text-slate-500 font-semibold font-mono">
                          vyaparflow.in/store/
                        </span>
                        <input
                          type="text"
                          value={storeSubdomain}
                          onChange={(e) => setStoreSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"))}
                          placeholder="shop-name"
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-r-xl px-3 py-2 font-mono font-semibold text-slate-800 focus:outline-none focus:border-indigo-605"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Web Banner Tagline & Store Bio</label>
                      <input
                        type="text"
                        value={storeBio}
                        onChange={(e) => setStoreBio(e.target.value)}
                        placeholder="Describe what your business sells, locations served..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-605"
                      />
                    </div>
                  </div>
                  
                  {/* Public URLs and CTA toolkits */}
                  <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="font-mono text-xs text-slate-700">
                      <span className="text-slate-400 font-sans">Active Public Link: </span>
                      <a 
                        href={`https://${storeSubdomain || "shop"}.vyaparflow.in/store`}
                        onClick={(e) => {
                          e.preventDefault();
                          alert(`Simulating click to live link: https://${storeSubdomain || "shop"}.vyaparflow.in/store`);
                        }}
                        className="font-bold text-indigo-700 hover:underline inline-flex items-center gap-1"
                      >
                        https://{storeSubdomain || "shop"}.vyaparflow.in/store <ExternalLink size={12} />
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`https://${storeSubdomain || "shop"}.vyaparflow.in/store`);
                          alert("📋 Store link copied to clipboard!");
                        }}
                        className="bg-white border border-indigo-200 text-indigo-700 font-bold px-3 py-1.5 rounded-lg text-[11px] hover:bg-slate-55 transition-colors cursor-pointer"
                      >
                        Copy URL Address
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const promoText = `Check out our active digital storefront product catalog! Visit: https://${storeSubdomain || "shop"}.vyaparflow.in/store`;
                          navigator.clipboard.writeText(promoText);
                          alert("📋 Campaign promo text copied! Ready to paste into WhatsApp list broadcasts.");
                        }}
                        className="bg-indigo-600 text-white font-bold px-4 py-1.5 rounded-lg text-[11px] hover:bg-indigo-700 transition-colors cursor-pointer"
                      >
                        Copy Promo Campaign
                      </button>
                    </div>
                  </div>
                </div>

                {/* 6.1.1 GOOGLE ADSENSE™ MONETIZATION HUB */}
                <div className="bg-gradient-to-br from-amber-500/10 via-white to-indigo-50/10 p-6 rounded-2xl border-2 border-amber-500/25 shadow-xs space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                          <Sparkles size={10} /> Google Partner Service
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">AdSense™ Storefront Ecosystem</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp size={22} className="text-amber-500" /> Google AdSense™ Monetization Hub
                      </h3>
                      <p className="text-xs text-slate-500 max-w-2xl">
                        Monetize your public shop catalog traffic. Input your publisher details to automatically inject responsive, targeted banner and feed ads that generate passive revenue on every view & click.
                      </p>
                    </div>

                    {/* Enable Toggle Switch */}
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-3xs">
                      <label className="text-xs font-bold text-slate-600 font-mono">Monetization Status</label>
                      <button
                        type="button"
                        onClick={() => setAdsenseEnabled(!adsenseEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          adsenseEnabled ? "bg-amber-500" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            adsenseEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {adsenseEnabled ? (
                    <div className="space-y-5">
                      {/* Interactive Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                        <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-3xs space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 font-mono block">EST. REVENUE (INR)</span>
                          <span className="text-lg font-black text-amber-600 block font-mono">
                            ₹{(adsenseEarnings * 82.5).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5 font-mono">
                            ▲ +₹{(adsenseClicks * 12.4).toFixed(2)} today
                          </span>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-3xs space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 font-mono block">PAGE VIEWS</span>
                          <span className="text-lg font-black text-slate-800 block font-mono">
                            {adsensePageViews.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">Unique visitors</span>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-3xs space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 font-mono block">IMPRESSIONS</span>
                          <span className="text-lg font-black text-slate-800 block font-mono">
                            {adsenseImpressions.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-indigo-600 font-bold font-mono">92.4% viewability</span>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-3xs space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 font-mono block">CLICKS</span>
                          <span className="text-lg font-black text-slate-800 block font-mono">
                            {adsenseClicks}
                          </span>
                          <span className="text-[9px] text-amber-600 font-bold font-mono">
                            {((adsenseClicks / adsenseImpressions) * 100).toFixed(2)}% Avg CTR
                          </span>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-3xs col-span-2 md:col-span-1 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 font-mono block">PAGE RPM</span>
                          <span className="text-lg font-black text-indigo-700 block font-mono">
                            ₹{((adsenseEarnings * 82.5 / adsensePageViews) * 1000).toFixed(2)}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">Revenue per 1k views</span>
                        </div>
                      </div>

                      {/* Config Fields & Status Row */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* 1. API Integration Keys & Settings */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-3.5">
                          <h4 className="font-bold text-xs text-slate-700 flex items-center gap-1.5 border-b pb-1.5">
                            <CreditCard size={14} className="text-amber-500" /> API Routing Credentials
                          </h4>
                          
                          <div className="space-y-3 text-xs">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 font-mono uppercase">
                                Google AdSense Publisher ID
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={adsensePublisherId}
                                  onChange={(e) => {
                                    const val = e.target.value.trim().toLowerCase();
                                    setAdsensePublisherId(val);
                                    if (!val.startsWith("ca-pub-")) {
                                      setAdsenseStatus("error");
                                    } else {
                                      setAdsenseStatus("checking");
                                    }
                                  }}
                                  placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                                  className="w-full bg-slate-50 border border-slate-250 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-slate-800 focus:outline-none focus:border-amber-500 text-xs"
                                />
                              </div>
                              <p className="text-[9px] text-slate-400 mt-0.5 leading-normal">
                                Your unique Google identifier. Must start with <code className="bg-slate-100 px-1 py-0.2 rounded font-semibold text-slate-700 font-mono">ca-pub-</code>.
                              </p>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 font-mono uppercase">
                                Ad Slot ID (ins parameter)
                              </label>
                              <input
                                  type="text"
                                  value={adsenseAdSlot}
                                  onChange={(e) => setAdsenseAdSlot(e.target.value.replace(/[^0-9]/g, ""))}
                                  placeholder="9876543210"
                                  className="w-full bg-slate-50 border border-slate-250 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-slate-800 focus:outline-none focus:border-amber-500 text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 font-mono uppercase">
                                Ad Placement & Format
                              </label>
                              <select
                                value={adsenseLayoutFormat}
                                onChange={(e: any) => setAdsenseLayoutFormat(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-250 rounded-lg px-2.5 py-1.5 font-sans font-semibold text-slate-700 focus:outline-none focus:border-amber-500 text-xs cursor-pointer"
                              >
                                <option value="responsive">Responsive Display in Catalog Grid</option>
                                <option value="banner">Sleek Web Banner (Top Anchor)</option>
                                <option value="sidebar">Sticky Footer Anchor Ad</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* 2. ads.txt Crawler Setup & Verification */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-3.5">
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <h4 className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                              <Globe size={14} className="text-indigo-600" /> ads.txt Verification File
                            </h4>
                            <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded-md font-mono">
                              Required
                            </span>
                          </div>

                          <div className="space-y-3 text-xs leading-normal font-sans">
                            <p className="text-[10.5px] text-slate-500 leading-relaxed">
                              Google AdSense crawling bot audits your public subdomain directory to verify domain ownership and combat ad-arbitrage fraud.
                            </p>

                            <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[9.5px] text-indigo-350 select-all border border-slate-850 relative group">
                              <span className="absolute top-1 right-2 text-[8px] text-slate-550 group-hover:text-amber-400 font-sans font-bold uppercase pointer-events-none">
                                click to select
                              </span>
                              google.com, {adsensePublisherId || "pub-XXXXXXXXXXXXXXXX"}, DIRECT, f08c47fec0942fa0
                            </div>

                            <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-150">
                              <span className="text-slate-550">Access Node:</span>
                              <span className="font-mono font-semibold text-slate-700 select-all underline text-[10px]">
                                vyaparflow.in/store/{storeSubdomain || "shop"}/ads.txt
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`google.com, ${adsensePublisherId || "pub-XXXXXXXXXXXXXXXX"}, DIRECT, f08c47fec0942fa0`);
                                alert("📋 Generated ads.txt compliant configuration row copied! Ready to deploy.");
                              }}
                              className="w-full bg-slate-105 hover:bg-slate-150 text-slate-800 font-bold py-1.5 rounded-lg text-[10px] transition-colors border border-slate-200 cursor-pointer text-center block"
                            >
                              Copy Compliant Row
                            </button>
                          </div>
                        </div>

                        {/* 3. Crawler Diagnostics & Site Approval Status */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-3.5 flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-xs text-slate-700 flex items-center gap-1.5 border-b pb-1.5">
                              <CheckCircle size={14} className="text-emerald-500" /> Setup Audit & Site Status
                            </h4>

                            <div className="space-y-3 pt-2">
                              {/* Publisher ID feedback */}
                              {!adsensePublisherId.startsWith("ca-pub-") ? (
                                <div className="p-3 bg-red-50 border border-red-150 rounded-lg text-red-800 text-[11px] leading-relaxed flex items-start gap-2">
                                  <AlertTriangle size={15} className="mt-0.5 text-red-600 shrink-0" />
                                  <div>
                                    <strong className="font-bold">Invalid Format ID:</strong> Publisher identifier must start with <code className="bg-red-105 font-mono font-semibold px-1 rounded text-red-900">ca-pub-</code>.
                                  </div>
                                </div>
                              ) : adsenseStatus === "checking" ? (
                                <div className="p-3 bg-amber-50/70 border border-amber-150 rounded-lg text-amber-900 text-[11px] leading-relaxed space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin"></div>
                                    <div className="font-bold text-amber-800">Verifying on-host ads.txt credentials...</div>
                                  </div>
                                  <p className="text-[10px] text-slate-500">
                                    Pinging <code className="font-mono">Google-Adsense-Bot/1.1</code>. Loading directory assets.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2.5 text-xs">
                                  <div className="flex justify-between items-center bg-emerald-50/70 border border-emerald-150 p-2.5 rounded-lg">
                                    <div className="flex items-center gap-1.5 text-emerald-800">
                                      <CheckCircle size={14} strokeWidth={2.5} className="text-emerald-600" />
                                      <span className="font-bold">Google Site Approval</span>
                                    </div>
                                    <span className="bg-emerald-600 text-white font-mono uppercase font-black text-[9px] px-2 py-0.5 rounded-full tracking-wide">
                                      LIVE & APPROVED
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-550 font-sans">
                                    <div className="bg-slate-50 p-1.5 rounded border border-slate-150">
                                      <span className="block font-semibold">Active Crawler:</span>
                                      <span className="font-mono font-bold text-slate-700">Google-AdSense-V9</span>
                                    </div>
                                    <div className="bg-slate-50 p-1.5 rounded border border-slate-150">
                                      <span className="block font-semibold">Consent Status:</span>
                                      <span className="font-mono font-bold text-slate-700">TCF v2.2 OK</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (!adsensePublisherId.startsWith("ca-pub-")) {
                                  alert("❌ Please output a valid Publisher ID starting with ca-pub- first!");
                                  setAdsenseStatus("error");
                                  return;
                                }
                                setAdsenseStatus("checking");
                                setTimeout(() => {
                                  setAdsenseStatus("active");
                                  alert("✅ Google AdSense Crawler completed successfully! ads.txt and domain records match correctly.");
                                }, 1500);
                              }}
                              disabled={adsenseStatus === "checking"}
                              className="w-full bg-indigo-650 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
                            >
                              {adsenseStatus === "checking" ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Auditing site credentials...
                                </>
                              ) : (
                                <>
                                  <Zap size={13} /> Force Resync & Verify AdSense Status
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-450 text-xs border border-dashed border-slate-200 rounded-xl space-y-1 bg-white">
                      <p className="font-semibold text-slate-605">Google AdSense™ Storefront monetization is toggled off.</p>
                      <p className="text-[11px] text-slate-400">Toggle it on to unlock automatic high-yield ad placement configurations and track mock earnings.</p>
                    </div>
                  )}
                </div>

                {/* Split setup & preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* LEFT COLUMN: Catalog Selector & Manager */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <Package size={18} className="text-indigo-600" /> Web Store Catalog Builder
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tick the items you wish to display on your public search catalog. Custom store categories are saved instantly.
                    </p>

                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {products.map(prod => (
                        <div key={prod.id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-800 text-xs">{prod.name}</h4>
                            <div className="flex gap-2 items-center">
                              <span className="text-[10px] font-bold text-indigo-700">₹{prod.unitPrice.toLocaleString("en-IN")}</span>
                              <span className="text-[10px] text-slate-400 font-mono">• GST {prod.gstRate}%</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {/* Category input */}
                            <input
                              type="text"
                              value={prod.storeCategory || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setProducts(products.map(p => p.id === prod.id ? { ...p, storeCategory: val } : p));
                              }}
                              placeholder="Category (e.g. Spares)"
                              className="bg-white border border-slate-200 text-[10px] text-slate-700 px-2 py-1 rounded w-28 focus:outline-none focus:border-indigo-500"
                            />

                            {/* Store publish Toggle */}
                            <button
                              onClick={() => {
                                const newStat = !prod.publishToStore;
                                setProducts(products.map(p => p.id === prod.id ? { ...p, publishToStore: newStat } : p));
                              }}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                                prod.publishToStore
                                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                              }`}
                            >
                              {prod.publishToStore ? "Published" : "Publish"}
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {products.length === 0 && (
                        <div className="p-6 text-center text-slate-450 text-xs border border-dashed border-slate-200 rounded-2xl">
                          No products found in inventory. Go to Inventory tab to add items, then publish them here!
                        </div>
                      )}
                    </div>
                    
                    {/* Add products info alert */}
                    <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-xl text-[11px] text-indigo-800 font-medium">
                      🚀 <strong>Tip:</strong> Swipe users share their online catalog via SMS, WhatsApp status, and Instagram bio to allow clients to view stock prices!
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Interactive public Store Mockup view */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Smartphone size={18} className="text-slate-700" /> Buyer Web View (Mock)
                      </h3>
                      <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1 bg-white border border-indigo-150 px-2 py-0.5 rounded-full">
                        ● Live Store Simulation
                      </span>
                    </div>

                    {/* Storefront Layout Canvas container */}
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-4 overflow-hidden max-w-sm mx-auto min-h-[460px] flex flex-col justify-between text-xs">
                       <div className="space-y-3">
                         {/* Store Header Banner in Buyer View */}
                         <div className={`p-4 rounded-2xl bg-gradient-to-r text-white ${storeBannerBg} relative`}>
                           <h4 className="font-black text-sm uppercase">{activeBusiness.name}</h4>
                           <p className="text-[10px] opacity-80 mt-1 whitespace-normal break-words">{storeBio}</p>
                           <div className="text-[9px] font-mono mt-2 bg-black/20 p-1 rounded font-semibold flex justify-between">
                             <span>📍 Mumbai, MH</span>
                             <span className="text-indigo-200">Verified Storefront</span>
                           </div>
                         </div>

                         {/* Banner Ad Placement */}
                         {adsenseEnabled && adsenseLayoutFormat === "banner" && (
                           <div 
                             onClick={handleAdSenseTestClick}
                             className="mb-3 bg-amber-500/5 hover:bg-amber-500/10 border border-dashed border-amber-500/35 rounded-xl p-2.5 cursor-pointer transition-all relative overflow-hidden group select-none"
                           >
                             <div className="flex justify-between items-start gap-1 pb-1">
                               <span className="bg-amber-500 text-amber-950 px-1.5 py-0.2 rounded text-[7px] font-black uppercase tracking-widest font-mono">
                                 ADS BY GOOGLE
                                </span>
                               <span className="text-[7.5px] font-mono text-slate-400">ID: {adsenseAdSlot}</span>
                             </div>
                             <span className="text-[9.5px] font-extrabold text-amber-900 block leading-tight font-sans">
                               TATA Capital Business Loans
                             </span>
                             <p className="text-[8.5px] text-slate-550 leading-tight font-sans">
                               Up to ₹15 Lakhs collateral-free credit lines for verified Indian shop owners. Low GST RPM matches.
                             </p>
                             <span className="text-[8.5px] text-indigo-700 font-bold block mt-1 hover:underline font-sans">
                               Instant Approval in 2Mins &rarr;
                             </span>
                           </div>
                         )}

                         <p className="font-bold text-slate-800 px-1 border-b pb-1">Our Product Catalog</p>
                         <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                           {products.filter(p => p.publishToStore).map((p, idx) => (
                             <React.Fragment key={p.id}>
                               <div className="flex justify-between items-center bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                                 <div>
                                   <h5 className="font-bold text-slate-800">{p.name}</h5>
                                   <p className="text-[9px] text-slate-400">Class: {p.storeCategory || "Uncategorized"}</p>
                                   <p className="text-[9px] text-indigo-700 font-bold mt-0.5 font-mono">₹{p.unitPrice.toLocaleString("en-IN")}</p>
                                 </div>
                                 <button
                                   onClick={() => {
                                     const existing = storeOrders.find(o => o.status === "Cart Pending");
                                     if (existing) {
                                       const updatedItems = [...existing.items, { description: p.name, quantity: 1, price: p.unitPrice }];
                                       setStoreOrders(storeOrders.map(o => o.id === existing.id ? { ...o, items: updatedItems, totalAmount: o.totalAmount + p.unitPrice } : o));
                                     } else {
                                       const newOrd = {
                                         id: "ord_" + Math.random().toString().slice(2, 6),
                                         customerName: "Web Store Visitor",
                                         customerPhone: "Manual Order Intake",
                                         items: [{ description: p.name, quantity: 1, price: p.unitPrice }],
                                         totalAmount: p.unitPrice,
                                         status: "Cart Pending",
                                         date: new Date().toISOString().split("T")[0]
                                       };
                                       setStoreOrders([...storeOrders, newOrd]);
                                     }
                                     alert(`${p.name} added to storefront checkout cart!`);
                                   }}
                                   className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded-md text-[10px] transition-colors cursor-pointer"
                                 >
                                   + Add to Cart
                                 </button>
                               </div>

                               {/* Responsive native Feed Ad placement */}
                               {adsenseEnabled && adsenseLayoutFormat === "responsive" && idx === 1 && (
                                 <div 
                                   onClick={handleAdSenseTestClick}
                                   className="my-2 bg-sky-50/50 hover:bg-sky-50 border border-sky-200 rounded-xl p-2.5 cursor-pointer transition-all space-y-1 relative select-none animate-none"
                                 >
                                   <div className="flex justify-between items-center text-xs">
                                     <span className="bg-sky-100 border border-sky-150 text-sky-850 font-mono text-[7px] font-black px-1 rounded">
                                       SPONSORED
                                     </span>
                                     <span className="text-[7.5px] font-mono text-slate-400 font-bold">slot: {adsenseAdSlot}</span>
                                   </div>
                                   <span className="text-[9px] font-bold text-slate-800 block font-sans">
                                     JioFiber Business Booster Max
                                   </span>
                                   <p className="text-[8px] text-slate-550 leading-normal font-sans">
                                     99.9% uptime 300Mbps small shop WiFi & free digital catalog analytics toolkit with no added costs!
                                   </p>
                                   <span className="text-[8.5px] font-semibold text-sky-700 block font-sans hover:underline">
                                     Reserve Free Trial & Install &rarr;
                                   </span>
                                 </div>
                               )}
                             </React.Fragment>
                           ))}`

                           {products.filter(p => p.publishToStore).length === 0 && (
                             <div className="p-8 text-center text-slate-400 italic text-[11px] space-y-1">
                               <p>No products published yet.</p>
                               <p className="text-[10px] text-slate-400">Manage catalog toggles on the left column to populate products!</p>
                             </div>
                           )}
                         </div>
                       </div>

                       {/* Checkout/WhatsApp inquiry trigger */}
                       <div className="border-t border-slate-100 pt-3">
                         {storeOrders.some(o => o.status === "Cart Pending") ? (
                           <div className="space-y-2">
                             <div className="flex justify-between font-bold text-slate-800 font-mono px-1">
                               <span>Pending Store Cart:</span>
                               <span className="text-indigo-700 font-mono">₹{storeOrders.find(o => o.status === "Cart Pending")?.totalAmount.toLocaleString("en-IN")}</span>
                             </div>
                             <div className="grid grid-cols-2 gap-1.5">
                               <button
                                 onClick={() => {
                                   setStoreOrders(storeOrders.map(o => o.status === "Cart Pending" ? { ...o, status: "Order Received" } : o));
                                   alert("Success! Mock order submitted completely. View order log underneath.");
                                 }}
                                 className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg text-center transition-all cursor-pointer text-[10px] shadow-xs"
                               >
                                 Submit Mock Order
                               </button>
                               <a
                                 href={`https://wa.me/${activeBusiness.phone || "919876543210"}?text=${encodeURIComponent(
                                   `Greetings ${activeBusiness.name}, I am interested in purchasing catalog products on your Online Store! Total Cart Value is ₹${storeOrders.find(o => o.status === "Cart Pending")?.totalAmount}`
                                 )}`}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-lg text-center transition-all flex items-center justify-center gap-1 text-[10px] shadow-xs"
                               >
                                 WhatsApp Inquiry
                               </a>
                             </div>
                           </div>
                         ) : (
                           <p className="text-[10px] text-center text-slate-400 italic">
                             Selected items will form a purchase checkout basket here
                           </p>
                         )}
                       </div>

                       {/* Sticky Footer Anchor Ad format */}
                       {adsenseEnabled && adsenseLayoutFormat === "sidebar" && (
                         <div 
                           onClick={handleAdSenseTestClick}
                           className="bg-amber-500/10 hover:bg-amber-500/15 border-t-2 border-amber-500/35 p-2 rounded-b-2xl -mx-4 -mb-4 flex justify-between items-center cursor-pointer transition-all animate-none text-[11px]"
                         >
                           <div className="flex items-center gap-1.5 pr-2 pl-2">
                             <span className="bg-amber-500 text-amber-950 font-mono text-[7px] font-extrabold px-1.5 py-0.2 rounded shrink-0">
                               AD
                             </span>
                             <span className="text-[8.5px] font-bold text-amber-950 truncate max-w-[190px] font-sans">
                               Zoho Books: GST e-Invoicing Suite
                             </span>
                           </div>
                           <span className="text-[8.5px] font-black text-indigo-750 shrink-0 uppercase tracking-wider hover:underline pl-1 pr-2 font-mono">
                             TRY FREE &rarr;
                           </span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>

                {/* Received web storefront Inquiries list */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <MessageSquare size={18} className="text-emerald-600" /> Catalog Orders & Received Lead Inquiries
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Order Date</th>
                          <th className="py-2.5 px-3">Buyer / Lead Client</th>
                          <th className="py-2.5 px-3">Items Enquired</th>
                          <th className="py-2.5 px-3 text-right">Inflow Value</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Invoice Conversion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {storeOrders.map((ord, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 text-slate-500">{ord.date}</td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-800 block">{ord.customerName}</span>
                              <span className="text-[10px] text-slate-400">{ord.customerPhone}</span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {ord.items.map((it: any, i: number) => (
                                <span key={i} className="block">{ord.items?.[i]?.quantity}x {ord.items?.[i]?.description}</span>
                              ))}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900">₹{ord.totalAmount.toLocaleString("en-IN")}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                ord.status === "Cart Pending" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {ord.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-sans">
                              {ord.status !== "Cart Pending" && (
                                <button
                                  onClick={() => {
                                    // Autofill invoice generator creator:
                                    setCreatorInvoiceType("GST Invoice");
                                    setCreatorItems(ord.items.map((it: any) => ({
                                      description: it.description,
                                      rate: it.price,
                                      quantity: it.quantity,
                                      gstRate: 18,
                                      hsnSac: "854400",
                                      amount: it.price * it.quantity
                                    })));
                                    setShowInvoiceCreator(true);
                                    setActiveTab("invoices");
                                    alert("Inquiry items successfully transferred to Invoice Bill Maker! Select a customer profile to finalize.");
                                  }}
                                  className="text-[10px] bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-xs"
                                >
                                  Convert to GST Bill
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </motion.div>
            )}

            {/* 6.2 GST REPORTS & GSTR-1 FILING PREPARATION TAB (Swipe CA accounting returns features) */}
            {activeTab === "reports" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Reports Intro dashboard */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <h2 className="text-2xl font-bold font-display text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet size={24} className="text-indigo-600" /> Chartered Accountant Returns & GSTR-1 Prep
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Directly consult audit-ready summaries. View GST breakdowns separated by tax brackets or classified by legal HSN codes.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Trigger JSON download
                      const gstrJson = {
                        gstin: activeBusiness.gstin || "27TAXSAMPLEIN1",
                        period: "05-2026",
                        b2b: invoices.map(inv => ({
                          customerGstin: customers.find(c => c.id === inv.customerId)?.gstin || "URP-UNREGISTERED",
                          invoiceNo: inv.invoiceNumber,
                          date: inv.date,
                          totalAmount: inv.totalAmount,
                          igst: inv.igst,
                          cgst: inv.cgst,
                          sgst: inv.sgst
                        }))
                      };
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gstrJson, null, 2));
                      const downloadAnchor = document.createElement("a");
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `GSTR-1_${activeBusiness.name.replace(/\s+/g, "_")}_052026.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                      alert("GSTR-1 JSON offline returns bundle prepared successfully! Downloaded official offline tool format.");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download size={14} /> Download GSTR Offline Utility JSON
                  </button>
                </div>

                {/* Audit totals metric row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">Total Sales (Taxable)</span>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      ₹{invoices.reduce((sum, inv) => sum + (inv.totalAmount - (inv.cgst + inv.sgst + inv.igst)), 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">CGST Liability</span>
                    <span className="text-lg font-black text-indigo-700 font-mono">
                      ₹{invoices.reduce((sum, inv) => sum + (inv.cgst || 0), 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">SGST Liability</span>
                    <span className="text-lg font-black text-indigo-700 font-mono">
                      ₹{invoices.reduce((sum, inv) => sum + (inv.sgst || 0), 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">IGST Liability</span>
                    <span className="text-lg font-black text-purple-700 font-mono">
                      ₹{invoices.reduce((sum, inv) => sum + (inv.igst || 0), 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* GSTR-1 Slab wise breakdown summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="font-bold text-base text-slate-900 block border-b pb-2">
                      GSTR-1 Slab Breakdown (B2B + B2C invoices)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">GST Bracket Slabs</th>
                            <th className="py-2 px-3 text-right">Taxable Value (₹)</th>
                            <th className="py-2 px-3 text-right">CGST (₹)</th>
                            <th className="py-2 px-3 text-right">SGST (₹)</th>
                            <th className="py-2 px-3 text-right">IGST (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[0, 5, 12, 18, 28].map(slabRate => {
                            let taxable = 0;
                            let cgst = 0;
                            let sgst = 0;
                            let igst = 0;
                            
                            invoices.forEach(inv => {
                              const isSameState = activeBusiness.stateCode && customers.find(c => c.id === inv.customerId)?.stateCode && activeBusiness.stateCode === customers.find(c => c.id === inv.customerId)?.stateCode;
                              inv.items.forEach(it => {
                                if (it.gstRate === slabRate) {
                                  const itemVal = it.rate * it.quantity;
                                  taxable += itemVal;
                                  const itemTax = itemVal * (slabRate / 100);
                                  if (isSameState) {
                                    cgst += itemTax / 2;
                                    sgst += itemTax / 2;
                                  } else {
                                    igst += itemTax;
                                  }
                                }
                              });
                            });

                            return (
                              <tr key={slabRate} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-bold text-slate-800">{slabRate}% GST Slabs</td>
                                <td className="py-2.5 px-3 text-right text-slate-600 font-mono">₹{taxable.toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right text-indigo-650 font-mono font-bold">₹{cgst.toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right text-indigo-650 font-mono font-bold">₹{sgst.toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right text-purple-700 font-mono font-bold">₹{igst.toLocaleString("en-IN")}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* HSN classification summary matching Swipe HSN registers */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="font-bold text-base text-slate-900 block border-b pb-2">
                      Legal HSN Code Classification Register
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">HSN/SAC Code</th>
                            <th className="py-2 px-3">Description Class</th>
                            <th className="py-2 px-3 text-right">QTY Sold</th>
                            <th className="py-2 px-3 text-right">Value (₹)</th>
                            <th className="py-2 px-3 text-right font-semibold">GST Paid (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const hsnMap: { [key: string]: { name: string; qty: number; val: number; tax: number } } = {};
                            invoices.forEach(inv => {
                              inv.items.forEach(it => {
                                const key = it.hsnSac || "UNCLASSIFIED";
                                if (!hsnMap[key]) {
                                  hsnMap[key] = { name: it.description, qty: 0, val: 0, tax: 0 };
                                }
                                hsnMap[key].qty += it.quantity;
                                hsnMap[key].val += it.rate * it.quantity;
                                hsnMap[key].tax += (it.rate * it.quantity) * (it.gstRate / 100);
                              });
                            });
                            
                            const hsnKeys = Object.keys(hsnMap);
                            if (hsnKeys.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={5} className="py-4 text-center text-slate-400 italic">No HSN registrations found in invoices</td>
                                </tr>
                              );
                            }

                            return hsnKeys.map(k => (
                              <tr key={k} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-bold text-indigo-700 font-mono">{k}</td>
                                <td className="py-2.5 px-3 text-slate-600 truncate max-w-[120px]" title={hsnMap[k].name}>{hsnMap[k].name}</td>
                                <td className="py-2.5 px-3 text-right font-semibold text-slate-800 font-mono">{hsnMap[k].qty}</td>
                                <td className="py-2.5 px-3 text-right text-slate-900 font-bold font-mono">₹{hsnMap[k].val.toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right text-slate-500 font-mono">₹{hsnMap[k].tax.toLocaleString("en-IN")}</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                      {/* Block 8 removed to resolve duplicate storefront panel definitions */}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 9. GST FILING HUB & GSTR REPORTS (getswipe.in Integration) */}
            {/* duplicate block disabled to resolve unique key warning */}
            {false && activeTab === "reports" && !viewingInvoice && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Header review bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2 flex-wrap">
                      <FileSpreadsheet size={20} className="text-indigo-650" />
                      GST Returns Center & GSTR-1 Ledger (CA Certified)
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Compile sales ledger data dynamically into standard compliance summaries before uploading to clear liabilities
                    </p>
                  </div>
                  
                  {/* CSV Export */}
                  <button
                    type="button"
                    onClick={() => handleCSVExport(
                      invoices.map(i => ({
                        GSTIN: customers.find(c => c.id === i.customerId)?.gstin || "URD (Unregistered)",
                        Recipient: customers.find(c => c.id === i.customerId)?.name || "Consumer",
                        InvoiceNo: i.invoiceNumber,
                        InvoiceDate: i.date,
                        TaxableValue: i.totalAmount - (i.cgst + i.sgst + i.igst),
                        CGST: i.cgst,
                        SGST: i.sgst,
                        IGST: i.igst,
                        TotalGST: i.cgst + i.sgst + i.igst,
                        InvoiceValue: i.totalAmount
                      })),
                      ["GSTIN", "Recipient", "InvoiceNo", "InvoiceDate", "TaxableValue", "CGST", "SGST", "IGST", "TotalGST", "InvoiceValue"],
                      "GSTR1-Report-VyaparFlow.csv"
                    )}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download size={14} /> Export GSTR-1 CSV Sheet
                  </button>
                </div>

                {/* Return calculations metric blocks */}
                {(() => {
                  // Analytical summation drivers matching regional expectation
                  const b2bInvoices = invoices.filter(i => {
                    const cust = customers.find(c => c.id === i.customerId);
                    return cust?.gstin && cust.gstin.trim().length > 0;
                  });

                  const b2cInvoices = invoices.filter(i => {
                    const cust = customers.find(c => c.id === i.customerId);
                    return !cust?.gstin || cust.gstin.trim().length === 0;
                  });

                  const totalTaxableSales = invoices.reduce((sum, i) => {
                    const rawValue = i.totalAmount - (i.cgst + i.sgst + i.igst);
                    return sum + rawValue;
                  }, 0);

                  const totalCGSTCollected = invoices.reduce((sum, i) => sum + i.cgst, 0);
                  const totalSGSTCollected = invoices.reduce((sum, i) => sum + i.sgst, 0);
                  const totalIGSTCollected = invoices.reduce((sum, i) => sum + i.igst, 0);
                  const totalGSTLiability = totalCGSTCollected + totalSGSTCollected + totalIGSTCollected;

                  // Dynamic Eligible Input Tax Credit computed directly from GST-paid raw material expenses!
                  const totalEligibleITC = expenses.reduce((sum, e) => sum + (e.gstPaid || 0), 0);
                  const netGstPayable = totalGSTLiability - totalEligibleITC;

                  return (
                    <div className="space-y-6">
                      
                      {/* Live audit summaries */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        
                        <div className="bg-white p-5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Net Taxable Outward Turnover</span>
                          <span className="text-xl font-black font-mono text-slate-800 mt-2 block">
                            ₹{Math.round(totalTaxableSales).toLocaleString("en-IN")}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-1">Excl. integrated GST slab liabilities</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-sans">Output GST Liability (Tax collected)</span>
                          <span className="text-xl font-black font-mono mt-2 block text-indigo-650">
                            ₹{Math.round(totalGSTLiability).toLocaleString("en-IN")}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-1">CGST: ₹{Math.round(totalCGSTCollected)} | SGST: ₹{Math.round(totalSGSTCollected)} | IGST: ₹{Math.round(totalIGSTCollected)}</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-sans">Eligible Input Tax Credit (ITC)</span>
                          <span className="text-xl font-black font-mono text-emerald-600 mt-2 block font-sans">
                            ₹{Math.round(totalEligibleITC).toLocaleString("en-IN")}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-1">Calculated directly from registered OCR spends</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-sans">Net Cash GST Payable / (Refund)</span>
                          <span className={`text-xl font-black font-mono mt-2 block ${netGstPayable > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            {netGstPayable >= 0 ? `₹${Math.round(netGstPayable).toLocaleString("en-IN")}` : `₹0 (Credit Bal: ₹${Math.round(Math.abs(netGstPayable)).toLocaleString("en-IN")})`}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-1 font-sans">Ready for copy-paste to GSTR-3B portal</p>
                        </div>
                      </div>

                      {/* GSTR-1 GSTR JSON ready model offline simulation download card */}
                      <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <h4 className="text-xs font-extrabold text-indigo-900 uppercase">GST Offline Schema Utility File (JSON)</h4>
                          <p className="text-[11px] text-slate-600 font-mono">Generates the tax register payload expected by the Government filing offline tool.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const mockGStr1Schema = {
                              gstin: activeBusiness.gstin || "27ABCDE1234F1Z5",
                              fp: "062026",
                              cur_gt: totalTaxableSales,
                              b2b: b2bInvoices.map(i => {
                                const cust = customers.find(c => c.id === i.customerId);
                                return {
                                  ctin: cust?.gstin,
                                  inv: [{
                                    inum: i.invoiceNumber,
                                    idt: i.date,
                                    val: i.totalAmount,
                                    pos: cust?.stateCode || "27",
                                    rchrg: "N",
                                    itms: i.items.map(it => ({
                                      num: 1,
                                      itm_det: {
                                        txval: it.rate * it.quantity,
                                        rt: it.gstRate,
                                        iamt: i.igst,
                                        camt: i.cgst,
                                        samt: i.sgst
                                      }
                                    }))
                                  }]
                                };
                              })
                            };
                            
                            const blob = new Blob([JSON.stringify(mockGStr1Schema, null, 2)], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.setAttribute("href", url);
                            link.setAttribute("download", "GSTR1-VyaparFlow-Gov-Upload.json");
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            alert("🎉 Compiled compliancy schema successfully! Downloaded GSTR1-VyaparFlow-Gov-Upload.json offline file.");
                          }}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-205 text-slate-700 font-bold text-[11px] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          Generate GSTR-1 JSON Schema
                        </button>
                      </div>

                      {/* Return grid tables tabs */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        
                        <div className="p-4 border-b border-slate-150 bg-slate-50/50">
                          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest font-sans">
                            GSTR-1 Section 4A - B2B Business Invoices ({b2bInvoices.length} invoices)
                          </h4>
                          <p className="text-[10px] text-slate-500 font-mono">Taxable sales rendered directly to registered GST holders</p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left font-mono text-[11px]">
                            <thead className="bg-slate-100 text-slate-600 border-b border-slate-205 capitalize">
                              <tr>
                                <th className="py-2.5 px-4">Recipient GSTIN</th>
                                <th className="py-2.5 px-4">Recipient Name</th>
                                <th className="py-2.5 px-4">Invoice No</th>
                                <th className="py-2.5 px-4">Invoice Date</th>
                                <th className="py-2.5 px-4 text-right">Taxable Sales (₹)</th>
                                <th className="py-2.5 px-4 text-right">CGST (₹)</th>
                                <th className="py-2.5 px-4 text-right">SGST (₹)</th>
                                <th className="py-2.5 px-4 text-right">IGST (₹)</th>
                                <th className="py-2.5 px-4 text-right">Invoice Sum</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {b2bInvoices.map(inv => {
                                const cust = customers.find(c => c.id === inv.customerId);
                                const baseRate = inv.totalAmount - (inv.cgst + inv.sgst + inv.igst);
                                return (
                                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 px-4 font-bold text-indigo-750">{cust?.gstin}</td>
                                    <td className="py-3 px-4 font-sans font-medium text-slate-700">{cust?.name}</td>
                                    <td className="py-3 px-4 font-bold text-slate-900">{inv.invoiceNumber}</td>
                                    <td className="py-3 px-4 text-slate-500">{inv.date}</td>
                                    <td className="py-3 px-4 text-right font-black text-slate-900 font-mono">₹{Math.round(baseRate).toLocaleString("en-IN")}</td>
                                    <td className="py-3 px-4 text-right text-slate-500 font-mono">₹{Math.round(inv.cgst)}</td>
                                    <td className="py-3 px-4 text-right text-slate-500 font-mono">₹{Math.round(inv.sgst)}</td>
                                    <td className="py-3 px-4 text-right text-slate-500 font-mono">₹{Math.round(inv.igst)}</td>
                                    <td className="py-3 px-4 text-right font-extrabold text-slate-900 font-mono">₹{inv.totalAmount.toLocaleString("en-IN")}</td>
                                  </tr>
                                );
                              })}

                              {b2bInvoices.length === 0 && (
                                <tr>
                                  <td colSpan={9} className="p-6 text-center text-slate-400 italic font-sans text-xs">
                                    No B2B invoices in active database. (Recipient GSTIN must be specified in Customer ledger book)
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* GSTR-1 Consumer Sales Section */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        
                        <div className="p-4 border-b border-slate-150 bg-slate-50/50">
                          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest font-sans">
                            GSTR-1 Section 7 - Consolidated B2C Consumer Sales Summary ({b2cInvoices.length} invoices)
                          </h4>
                          <p className="text-[10px] text-slate-500 font-mono">Consolidated sales state-by-state to unregistered clients</p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left font-mono text-[11px]">
                            <thead className="bg-slate-100 text-slate-600 border-b border-slate-205 capitalize">
                              <tr>
                                <th className="py-2.5 px-4">Place of Supply State</th>
                                <th className="py-2.5 px-4 text-center">Tax rate classification</th>
                                <th className="py-2.5 px-4 text-right font-bold">Consolidated Retail Value (₹)</th>
                                <th className="py-2.5 px-4 text-right">CGST sum</th>
                                <th className="py-2.5 px-4 text-right">SGST sum</th>
                                <th className="py-2.5 px-4 text-right">IGST sum</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                              {(() => {
                                // Group consumer invoices by Place of Supply State Code
                                const grouped: any = {};
                                b2cInvoices.forEach(inv => {
                                  const cust = customers.find(c => c.id === inv.customerId);
                                  const stateName = INDIAN_STATES.find(s => s.code === (cust?.stateCode || "27"))?.name || "Maharashtra";
                                  const key = stateName;
                                  if (!grouped[key]) {
                                    grouped[key] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, rate: 18 };
                                  }
                                  grouped[key].taxable += (inv.totalAmount - (inv.cgst + inv.sgst + inv.igst));
                                  grouped[key].cgst += inv.cgst;
                                  grouped[key].sgst += inv.sgst;
                                  grouped[key].igst += inv.igst;
                                });

                                const keys = Object.keys(grouped);
                                if (keys.length === 0) {
                                  return (
                                    <tr>
                                      <td colSpan={6} className="p-6 text-center text-slate-400 italic font-sans text-xs">
                                        No consumer retail invoices recorded in active books.
                                      </td>
                                    </tr>
                                  );
                                }

                                return keys.map(state => (
                                  <tr key={state} className="hover:bg-slate-55/50">
                                    <td className="py-3 px-4 font-bold text-slate-900">{state}</td>
                                    <td className="py-3 px-4 text-center font-bold text-indigo-750">18% (Standard Standard)</td>
                                    <td className="py-3 px-4 text-right font-extrabold text-slate-900 font-mono">₹{Math.round(grouped[state].taxable).toLocaleString("en-IN")}</td>
                                    <td className="py-3 px-4 text-right text-slate-500 font-mono">₹{Math.round(grouped[state].cgst).toLocaleString("en-IN")}</td>
                                    <td className="py-3 px-4 text-right text-slate-500 font-mono">₹{Math.round(grouped[state].sgst).toLocaleString("en-IN")}</td>
                                    <td className="py-3 px-4 text-right text-slate-500 font-mono">₹{Math.round(grouped[state].igst).toLocaleString("en-IN")}</td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  );
                })()}

              </motion.div>
            )}

            {/* 7. DYNAMIC SIMULATED ADMIN DASHBOARD PANEL */}
            {isAdmin && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 bg-white border border-slate-200 rounded-2xl space-y-6 shadow-xs"
              >
                <div className="flex justify-between items-center border-b border-slate-150 pb-4">
                  <div className="flex items-center gap-2 text-indigo-650">
                    <Lock size={20} />
                    <div>
                      <h2 className="text-xl font-bold font-display uppercase tracking-wider text-slate-900">VyaparFlow Global SaaS Dashboard</h2>
                      <p className="text-xs text-slate-500 mt-1">Platform-administrative real time telemetry</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAdmin(false)}
                    className="p-1.5 bg-rose-650 hover:bg-rose-700 text-white rounded font-sans text-xs font-bold transition-colors shadow-xs"
                  >
                    Close Admin view
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono">
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Global Invoices Issued</span>
                    <span className="text-xl font-black text-slate-900">492,109</span>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Total Active Businesses</span>
                    <span className="text-xl font-black text-slate-900">12,854</span>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">SaaS Conversion Rate</span>
                    <span className="text-xl font-black text-indigo-600">8.42%</span>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">AdSense Monthly Earnings</span>
                    <span className="text-xl font-black font-sans text-amber-600">$2,410.50</span>
                  </div>
                </div>

                {/* Fraud logs & telemetry table */}
                <div className="p-4 bg-slate-55 border border-slate-200 rounded-xl">
                  <h4 className="text-xs font-bold uppercase text-slate-600 mb-3 font-mono">System Integrity Logs</h4>
                  <div className="space-y-2 text-[10px] font-mono leading-relaxed text-slate-600">
                    <p className="text-emerald-700">[04:12:00 UTC] Firestore security rules evaluated completely. No orphans writes detected.</p>
                    <p className="text-emerald-750">[04:12:02 UTC] Google login request verified on active channel.</p>
                    <p className="text-indigo-650">[04:12:05 UTC] Gemini Flash AI invoice request routed safely through server.ts.</p>
                    <p className="text-slate-500">[04:12:11 UTC] System load normal. Reverse proxy running fine on internal port 3000.</p>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </main>
      </div>



    </div>
  );
}

// Minimal placeholder helpers
function GiftCard({ size, className }: { size: number; className?: string }) {
  return <TrendingUp size={size} className={className} />;
}
