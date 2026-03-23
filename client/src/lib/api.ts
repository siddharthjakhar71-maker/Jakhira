import type { PermissionMap } from "@/lib/permissions";

import { queryOptions } from "@tanstack/react-query";



export type AuthPermissionsResponse = {
  role: string;
  permissions: Array<{ module: string; action: string }>;
  permissionMap: PermissionMap;
};


export type AppUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: number;
  createdAt?: string;
  updatedAt?: string;
};

export type BackupSettings = { id: number; backupEnabled: number; backupFrequency: string; backupLocation: string; updatedAt: string };

export type LedgerEntry = {
  date: string;
  type: "opening_balance" | "bill" | "payment";
  reference: string;
  debit: number;
  credit: number;
  balance: number;
};

export type VendorStatementResponse = {
  vendorName: string;
  month: string;
  openingBalance: number;
  totalBills: number;
  totalPayments: number;
  closingBalance: number;
  transactions: LedgerEntry[];
};

export type VendorPayableResponse = {
  vendorId: number;
  vendorName: string;
  outstanding: number;
};

export type CostAnalysisFilters = {
  siteId?: string;
  vendorId?: string;
  materialId?: string;
  startDate?: string;
  endDate?: string;
};

export type CostAnalysisRow = {
  id: string;
  name: string;
  totalAmount: number;
};

export type CostAnalysisResponse = {
  topMaterialsBySpend: CostAnalysisRow[];
  vendorSpendAnalysis: CostAnalysisRow[];
  siteWisePurchaseCost: CostAnalysisRow[];
  siteVendorCost: { key: string; name: string; totalAmount: number }[];
  vendorMaterialCost: { key: string; name: string; totalAmount: number }[];
  materialBreakdown: { materialId: string; materialName: string; quantity: number; totalCost: number }[];
  totalPurchaseCost: number;
  totalMaterialCost: number;
  totalProjectCost: number;
  totalQuantityPurchased: number;
  averageMaterialRate: number;
  topVendorsBySpend: CostAnalysisRow[];
};

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || "Request failed");
  }
  return res.json();
}


async function fetchFormDataJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, { ...options, credentials: "include", headers: { ...((options && options.headers) || {}) } });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || "Request failed");
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    fetchJSON("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => fetchJSON("/api/auth/logout", { method: "POST" }),
  me: () => fetchJSON("/api/auth/me"),
  getPermissions: (): Promise<AuthPermissionsResponse> => fetchJSON("/api/auth/permissions"),
  getProfile: () => fetchJSON("/api/auth/profile"),
  updateProfile: (data: any) =>
    fetchJSON("/api/auth/profile", { method: "PATCH", body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    fetchJSON("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),

  getSites: () => fetchJSON("/api/sites"),
  createSite: (data: any) => fetchJSON("/api/sites", { method: "POST", body: JSON.stringify(data) }),
  createSitesBatch: (data: any[]) => fetchJSON("/api/sites/batch", { method: "POST", body: JSON.stringify(data) }),
  updateSite: (id: number, data: any) => fetchJSON(`/api/sites/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSite: (id: number) => fetchJSON(`/api/sites/${id}`, { method: "DELETE" }),

  getVendors: () => fetchJSON("/api/vendors"),
  createVendor: (data: any) => fetchJSON("/api/vendors", { method: "POST", body: JSON.stringify(data) }),
  createVendorsBatch: (data: any[]) => fetchJSON("/api/vendors/batch", { method: "POST", body: JSON.stringify(data) }),
  updateVendor: (id: number, data: any) => fetchJSON(`/api/vendors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteVendor: (id: number) => fetchJSON(`/api/vendors/${id}`, { method: "DELETE" }),

  getMaterials: () => fetchJSON("/api/materials"),
  createMaterial: (data: any) => fetchJSON("/api/materials", { method: "POST", body: JSON.stringify(data) }),
  createMaterialsBatch: (data: any[]) => fetchJSON("/api/materials/batch", { method: "POST", body: JSON.stringify(data) }),
  updateMaterial: (id: number, data: any) => fetchJSON(`/api/materials/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMaterial: (id: number) => fetchJSON(`/api/materials/${id}`, { method: "DELETE" }),

  getPOTemplates: () => fetchJSON("/api/po-templates"),
  createPOTemplate: (data: any) => fetchJSON("/api/po-templates", { method: "POST", body: JSON.stringify(data) }),
  updatePOTemplate: (id: number, data: any) => fetchJSON(`/api/po-templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePOTemplate: (id: number) => fetchJSON(`/api/po-templates/${id}`, { method: "DELETE" }),

  getTemplateStyles: () => fetchJSON("/api/template-styles"),
  createTemplateStyle: (data: any) => fetchJSON("/api/template-styles", { method: "POST", body: JSON.stringify(data) }),
  updateTemplateStyle: (id: number, data: any) => fetchJSON(`/api/template-styles/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTemplateStyle: (id: number) => fetchJSON(`/api/template-styles/${id}`, { method: "DELETE" }),

  getPOs: () => fetchJSON("/api/pos"),
  createPO: (data: any) => fetchJSON("/api/pos", { method: "POST", body: JSON.stringify(data) }),
  updatePO: (id: number, data: any) => fetchJSON(`/api/pos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePO: (id: number) => fetchJSON(`/api/pos/${id}`, { method: "DELETE" }),

  getGRNs: () => fetchJSON("/api/grns"),
  createGRN: (data: any) => fetchJSON("/api/grns", { method: "POST", body: JSON.stringify(data) }),
  updateGRN: (id: number, data: any) => fetchJSON(`/api/grns/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteGRN: (id: number) => fetchJSON(`/api/grns/${id}`, { method: "DELETE" }),

  getBills: () => fetchJSON("/api/bills"),
  createBill: (data: any) => fetchJSON("/api/bills", { method: "POST", body: JSON.stringify(data) }),
  updateBill: (id: number, data: any) => fetchJSON(`/api/bills/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBill: (id: number) => fetchJSON(`/api/bills/${id}`, { method: "DELETE" }),

  getPayments: () => fetchJSON("/api/payments"),
  getUsers: (): Promise<AppUser[]> => fetchJSON("/api/users"),
  createUser: (data: any) => fetchJSON("/api/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: number, data: any) => fetchJSON(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  getVendorLedger: (vendorId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const query = params.toString();
    return fetchJSON(`/api/vendor-ledger/${vendorId}${query ? `?${query}` : ""}`);
  },

  getVendorStatement: (vendorId: string, month: string) => fetchJSON(`/api/vendor-statement/${vendorId}?month=${month}`),
  getVendorPayables: (): Promise<VendorPayableResponse[]> => fetchJSON("/api/vendor-payables"),
  getCostAnalysis: (filters?: CostAnalysisFilters): Promise<CostAnalysisResponse> => {
    const params = new URLSearchParams();
    if (filters?.siteId) params.set("siteId", filters.siteId);
    if (filters?.vendorId) params.set("vendorId", filters.vendorId);
    if (filters?.materialId) params.set("materialId", filters.materialId);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);
    const query = params.toString();
    return fetchJSON(`/api/cost-analysis${query ? `?${query}` : ""}`);
  },
  createPayment: (data: any) => fetchJSON("/api/payments", { method: "POST", body: JSON.stringify(data) }),
  updatePayment: (id: number, data: any) => fetchJSON(`/api/payments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePayment: (id: number) => fetchJSON(`/api/payments/${id}`, { method: "DELETE" }),


  getMaterialIssues: () => fetchJSON("/api/material-issues"),
  createMaterialIssue: (data: any) => fetchJSON("/api/material-issues", { method: "POST", body: JSON.stringify(data) }),
  updateMaterialIssue: (id: number, data: any) => fetchJSON(`/api/material-issues/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMaterialIssue: (id: number) => fetchJSON(`/api/material-issues/${id}`, { method: "DELETE" }),

  getSiteStocks: () => fetchJSON("/api/site-stock"),
  updateSiteStock: (data: any) => fetchJSON("/api/site-stock/update", { method: "POST", body: JSON.stringify(data) }),

  getRateHistory: () => fetchJSON("/api/rate-history"),
  createRateHistory: (data: any) => fetchJSON("/api/rate-history", { method: "POST", body: JSON.stringify(data) }),

  getVendorMaterialRates: () => fetchJSON("/api/vendor-material-rates"),
  getVendorMaterialRatesByVendor: (vendorId: string) => fetchJSON(`/api/vendor-material-rates/${vendorId}`),
  upsertVendorMaterialRate: (data: any) => fetchJSON("/api/vendor-material-rates", { method: "POST", body: JSON.stringify(data) }),
  deleteVendorMaterialRate: (id: number) => fetchJSON(`/api/vendor-material-rates/${id}`, { method: "DELETE" }),
  resetDemoData: (adminPassword: string) => fetchJSON('/api/system-tools/reset-demo-data', { method: 'POST', body: JSON.stringify({ adminPassword }) }),
  getSystemSettings: (): Promise<BackupSettings> => fetchJSON("/api/system-tools/settings"),
  updateSystemSettings: (data: any): Promise<BackupSettings> => fetchJSON("/api/system-tools/settings", { method: "PATCH", body: JSON.stringify(data) }),
  createBackup: () => fetchJSON("/api/system-tools/backup", { method: "POST" }),
  downloadBackup: () => window.open('/api/system-tools/backup/download', '_blank'),
  importVendorRates: (fileDataBase64: string, fileName: string) =>
    fetchFormDataJSON("/api/vendor-rate-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileDataBase64, fileName }),
    }),
};

export const queryKeys = {
  sites: ["sites"] as const,
  vendors: ["vendors"] as const,
  materials: ["materials"] as const,
  poTemplates: ["poTemplates"] as const,
  templateStyles: ["templateStyles"] as const,
  pos: ["pos"] as const,
  grns: ["grns"] as const,
  bills: ["bills"] as const,
  payments: ["payments"] as const,
  profile: ["profile"] as const,

  materialIssues: ["materialIssues"] as const,
  siteStock: ["siteStock"] as const,
  rateHistory: ["rateHistory"] as const,
  vendorMaterialRates: ["vendorMaterialRates"] as const,
  vendorLedger: ["vendorLedger"] as const,
  systemSettings: ["systemSettings"] as const,
};
