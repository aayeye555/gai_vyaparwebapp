import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocFromServer
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json" assert { type: "json" };

// Initialize App
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standard test connection on load
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}
testConnection();

// --- Firestore Insufficient Permission Handler ---
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write"
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error Detailed Object: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Dynamic Query Helper Wrappers ---

export async function fetchUserBusinesses(userId: string) {
  const colPath = "businesses";
  try {
    const q = query(collection(db, colPath), where("ownerUid", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, colPath);
  }
}

export async function saveBusiness(businessData: any) {
  const colPath = "businesses";
  try {
    const ref = doc(db, colPath, businessData.id);
    await setDoc(ref, businessData);
    return businessData;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

export async function deleteBusiness(id: string) {
  const colPath = `businesses/${id}`;
  try {
    await deleteDoc(doc(db, "businesses", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, colPath);
  }
}

export async function fetchCustomers(userId: string) {
  const colPath = "customers";
  try {
    const q = query(collection(db, colPath), where("ownerUid", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, colPath);
  }
}

export async function saveCustomer(customerData: any) {
  const colPath = "customers";
  try {
    const ref = doc(db, colPath, customerData.id);
    await setDoc(ref, customerData);
    return customerData;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

export async function deleteCustomerFromDb(id: string) {
  const colPath = `customers/${id}`;
  try {
    await deleteDoc(doc(db, "customers", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, colPath);
  }
}

export async function fetchInvoices(userId: string) {
  const colPath = "invoices";
  try {
    const q = query(collection(db, colPath), where("ownerUid", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, colPath);
  }
}

export async function saveInvoice(invoiceData: any) {
  const colPath = "invoices";
  try {
    const ref = doc(db, colPath, invoiceData.id);
    await setDoc(ref, invoiceData);
    return invoiceData;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

export async function deleteInvoiceFromDb(id: string) {
  const colPath = `invoices/${id}`;
  try {
    await deleteDoc(doc(db, "invoices", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, colPath);
  }
}

export async function fetchProducts(userId: string) {
  const colPath = "products";
  try {
    const q = query(collection(db, colPath), where("ownerUid", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, colPath);
  }
}

export async function saveProduct(productData: any) {
  const colPath = "products";
  try {
    const ref = doc(db, colPath, productData.id);
    await setDoc(ref, productData);
    return productData;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

export async function deleteProductFromDb(id: string) {
  const colPath = `products/${id}`;
  try {
    await deleteDoc(doc(db, "products", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, colPath);
  }
}

export async function fetchExpenses(userId: string) {
  const colPath = "expenses";
  try {
    const q = query(collection(db, colPath), where("ownerUid", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, colPath);
  }
}

export async function saveExpense(expenseData: any) {
  const colPath = "expenses";
  try {
    const ref = doc(db, colPath, expenseData.id);
    await setDoc(ref, expenseData);
    return expenseData;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

export async function deleteExpenseFromDb(id: string) {
  const colPath = `expenses/${id}`;
  try {
    await deleteDoc(doc(db, "expenses", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, colPath);
  }
}

// Auth Actions
export async function loginWithGoogle() {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (err) {
    console.error("Google Signin Failed:", err);
    throw err;
  }
}

export async function logoutUser() {
  await signOut(auth);
}
