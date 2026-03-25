import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys, type AccessControlUser, type AccessPermissionMap } from './api';
import { buildRolePermissionMap, canAccess, ERP_ROLES, isAdminRole, type PermissionAction, type PermissionMap, type PermissionModule } from '@shared/permissions';
import { userStore } from '@/stores/user-store';

export type Site = { id: number; siteName: string; projectName: string; siteCode: string; poPrefix?: string; billingCode?: string; address: string; city: string; state: string; pincode: string; contactPerson: string; phone: string; status: string; createdAt?: string; name: string; location: string; billingName?: string; billTo?: string; shipTo?: string };
export type Vendor = { id: number; name: string; gst: string | null; contactPerson: string | null; phone: string | null; address: string | null; email: string | null; openingBalance: number; openingDate: string; };
export type Material = { id: number; name: string; category: string | null; unit: string | null; defaultRate: number | null; };
export type POItem = { materialId: string; qty: number; rate: number; amount: number; taxPercent?: number; };
export type PO = { id: number; displayId: string; poNumber?: string; siteId?: string; vendorId: string; date: string; expectedDelivery?: string; status: string; items: POItem[]; totalAmount: number; estimatedCartage?: number; estimatedLoadingAmount?: number; otherEstimatedCharges?: number; gstAmount?: number; subTotal?: number; freightAmount?: number; freightGstMode?: 'include' | 'exclude'; billingName?: string; billTo?: string; shippingName?: string; shipTo?: string; runningNumber?: number; financialYear?: string; prefix?: string; siteCode?: string; billingCode?: string; };
export type GRNItem = { materialId: string; orderedQty: number; receivedQty: number; };
export type GRN = { id: number; displayId: string; grnNumber?: string; siteId?: string; poId: string; date: string; items: GRNItem[]; status: string; runningNumber?: number; financialYear?: string; siteCode?: string; billingCode?: string; };
export type Bill = { id: number; displayId: string; vendorInvoiceNo?: string; siteId?: string; grnId?: string; poId: string; vendorId: string; date: string; dueDate?: string; amount: number; materialAmount?: number; actualCartage?: number; loadingAmount?: number; otherCharges?: number; gstAmount?: number; subTotal?: number; paidAmount?: number; status: string; };
export type Payment = { id: number; displayId: string; siteId?: string; billId?: string; vendorId: string; date: string; paymentDate?: string; amount: number; notes?: string; mode?: string; reference?: string; };
export type POTemplateColumn = { key: string; label: string; visible: boolean; align: 'left' | 'center' | 'right' };
export type POTemplateConfig = {
  style?: 'professional';
  header: { companyName: string; subtitle: string; contactDetails: string; showContactDetails: boolean; showLogo?: boolean; logoUrl?: string };
  sections: { poDetailsTitle: string; vendorDetailsTitle: string; billToTitle: string; shipToTitle: string; termsTitle: string };
  columns: POTemplateColumn[];
  visibility: { gst: boolean; billingName: boolean; shipTo: boolean; billTo: boolean; vendorGst: boolean; vendorContact: boolean; vendorPhone: boolean; vendorEmail: boolean; deliveryDate: boolean; poStatus: boolean };
  totals?: { showSubtotal: boolean; showGstBreakup: boolean; showDiscount: boolean; discountLabel?: string; showRoundOff: boolean; showAmountInWords: boolean; enableFreight?: boolean; freightGstMode?: 'include' | 'exclude' };
  footer: { terms: string[]; showSignature: boolean; signatureLeftLabel: string; signatureRightLabel: string; footerNote: string; showStampBlock?: boolean; stampBlockLabel?: string; signatureImageUrl?: string };
};
export type POTemplate = { id: number; name: string; isDefault: string; config: POTemplateConfig };
export type LayoutBlock = { id: string; label: string; row: number; col: number; colSpan: number; visible: boolean };
export type TemplateStyleConfig = { blocks: LayoutBlock[]; linkedTemplateId?: number };
export type TemplateStyle = { id: number; name: string; isDefault: string; config: TemplateStyleConfig };
export type UserProfile = { id: number; name: string; email: string; phone: string; role: string; isActive?: number; createdAt?: string; updatedAt?: string; company: string; avatarUrl?: string; password?: string };
export type SystemSettings = { id: number; backupEnabled: number; backupFrequency: string; backupLocation: string; updatedAt: string };

export type MaterialIssueItem = { materialId: string; qty: number };
export type MaterialIssue = { id: number; displayId: string; siteId: string; date: string; items: MaterialIssueItem[]; notes?: string };

export type SiteStockEntry = { id: number; siteId: string; materialId: string; receivedQty: number; issuedQty: number };

export type RateHistoryEntry = { id: number; materialId: string; vendorId: string; rate: number; date: string; poDisplayId?: string; quotationDisplayId?: string };

export type VendorMaterialRateEntry = { id: number; vendorId: string; materialId: string; rate: number; updatedAt: string };


type StoreContextType = {
  isAuthenticated: boolean; isAuthLoading: boolean; login: (email: string, password: string) => Promise<boolean>; logout: () => Promise<void>;
  searchQuery: string; setSearchQuery: (q: string) => void;
  userProfile: UserProfile; updateUserProfile: (p: Partial<UserProfile>) => Promise<UserProfile>; changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  systemSettings: SystemSettings | null;
  sites: Site[]; addSite: (s: Omit<Site, 'id'>) => void; updateSite: (id: number, s: Partial<Site>) => void; deleteSite: (id: number) => void; addSites: (s: Omit<Site, 'id'>[]) => void;
  vendors: Vendor[]; addVendor: (v: Omit<Vendor, 'id'>) => void; updateVendor: (id: number, v: Partial<Vendor>) => void; deleteVendor: (id: number) => void; addVendors: (v: Omit<Vendor, 'id'>[]) => void;
  materials: Material[]; addMaterial: (m: Omit<Material, 'id'>) => void; updateMaterial: (id: number, m: Partial<Material>) => void; deleteMaterial: (id: number) => void; addMaterials: (m: Omit<Material, 'id'>[]) => void;
  poTemplates: POTemplate[]; addPOTemplate: (t: any) => Promise<void>; updatePOTemplate: (id: number, t: any) => Promise<void>; deletePOTemplate: (id: number) => Promise<void>;
  templateStyles: TemplateStyle[]; addTemplateStyle: (s: any) => Promise<void>; updateTemplateStyle: (id: number, s: any) => Promise<void>; deleteTemplateStyle: (id: number) => Promise<void>;
  pos: PO[]; addPO: (po: any) => void; updatePO: (id: number, po: Partial<PO>) => void; deletePO: (id: number) => void; updatePOStatus: (id: number, status: string) => void;
  grns: GRN[]; addGRN: (grn: any) => void; updateGRN: (id: number, grn: Partial<GRN>) => void; deleteGRN: (id: number) => void;
  bills: Bill[]; addBill: (bill: any) => void; updateBill: (id: number, bill: Partial<Bill>) => void; deleteBill: (id: number) => void; updateBillStatus: (id: number, status: string) => void;
  payments: Payment[]; addPayment: (payment: any) => void; updatePayment: (id: number, payment: Partial<Payment>) => void; deletePayment: (id: number) => void;
  materialIssues: MaterialIssue[]; addMaterialIssue: (issue: any) => void; updateMaterialIssue: (id: number, issue: any) => void; deleteMaterialIssue: (id: number) => void;
  siteStocks: SiteStockEntry[]; updateSiteStock: (siteId: string, materialId: string, receivedDelta: number, issuedDelta: number) => void;
  rateHistory: RateHistoryEntry[]; addRateHistory: (entry: any) => void;
  vendorMaterialRates: VendorMaterialRateEntry[]; upsertVendorMaterialRate: (vendorId: string, materialId: string, rate: number) => void; deleteVendorMaterialRate: (id: number) => void;
  accessControlUsers: AccessControlUser[]; createAccessControlUser: (user: Partial<AccessControlUser> & { password: string }) => Promise<void>; updateAccessControlUser: (id: number, user: Partial<AccessControlUser> & { password?: string }) => Promise<void>; deleteAccessControlUser: (id: number) => Promise<void>;
  permissionMap: PermissionMap; permissionMapLoading: boolean; managedRole: string; setManagedRole: (role: string) => void; managedRolePermissionMap: PermissionMap; can: (module: PermissionModule, action: PermissionAction) => boolean; updateRolePermissions: (role: string, map: AccessPermissionMap) => Promise<void>;
  isLoading: boolean;
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const defaultProfile: UserProfile = {
  id: 0,
  name: 'Siddharth Jakhar',
  email: 'siddharthjakhar71@gmail.com',
  phone: '+91 88004 47427',
  role: 'Admin',
  isActive: 1,
  company: 'JAKHIRA',
  avatarUrl: '',
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: api.me,
    retry: false,
    staleTime: 0,
  });

  const isAuthenticated = Boolean(meQuery.data?.user);
  const isAuthLoading = meQuery.isLoading;
  const currentRole = String(meQuery.data?.user?.role || defaultProfile.role);

  const sitesQuery = useQuery({ queryKey: queryKeys.sites, queryFn: api.getSites, enabled: isAuthenticated });
  const vendorsQuery = useQuery({ queryKey: queryKeys.vendors, queryFn: api.getVendors, enabled: isAuthenticated });
  const materialsQuery = useQuery({ queryKey: queryKeys.materials, queryFn: api.getMaterials, enabled: isAuthenticated });
  const poTemplatesQuery = useQuery({ queryKey: queryKeys.poTemplates, queryFn: api.getPOTemplates, enabled: isAuthenticated });
  const templateStylesQuery = useQuery({ queryKey: queryKeys.templateStyles, queryFn: api.getTemplateStyles, enabled: isAuthenticated });
  const posQuery = useQuery({ queryKey: queryKeys.pos, queryFn: api.getPOs, enabled: isAuthenticated });
  const grnsQuery = useQuery({ queryKey: queryKeys.grns, queryFn: api.getGRNs, enabled: isAuthenticated });
  const billsQuery = useQuery({ queryKey: queryKeys.bills, queryFn: api.getBills, enabled: isAuthenticated });
  const paymentsQuery = useQuery({ queryKey: queryKeys.payments, queryFn: api.getPayments, enabled: isAuthenticated });
  const profileQuery = useQuery({ queryKey: queryKeys.profile, queryFn: api.getProfile, enabled: isAuthenticated, select: (data: any) => data.profile ?? data.user });
  const materialIssuesQuery = useQuery({ queryKey: queryKeys.materialIssues, queryFn: api.getMaterialIssues, enabled: isAuthenticated });
  const siteStockQuery = useQuery({ queryKey: queryKeys.siteStock, queryFn: api.getSiteStocks, enabled: isAuthenticated });
  const rateHistoryQuery = useQuery({ queryKey: queryKeys.rateHistory, queryFn: api.getRateHistory, enabled: isAuthenticated });
  const vendorMaterialRatesQuery = useQuery({ queryKey: queryKeys.vendorMaterialRates, queryFn: api.getVendorMaterialRates, enabled: isAuthenticated });
  const systemSettingsQuery = useQuery({ queryKey: queryKeys.systemSettings, queryFn: api.getSystemSettings, enabled: isAuthenticated && isAdminRole(currentRole) });
  const [managedRole, setManagedRole] = useState<string>(ERP_ROLES.MANAGER);
  const accessControlUsersQuery = useQuery({ queryKey: ['access-control', 'users'], queryFn: api.getAccessControlUsers, enabled: isAuthenticated && isAdminRole(currentRole) });
  const rolePermissionsQuery = useQuery({ queryKey: ['access-control', 'permissions', currentRole], queryFn: () => api.getRolePermissions(currentRole), enabled: isAuthenticated });
  const managedRolePermissionsQuery = useQuery({ queryKey: ['access-control', 'permissions', managedRole], queryFn: () => api.getRolePermissions(managedRole), enabled: isAuthenticated && isAdminRole(currentRole) });

  const sites: Site[] = sitesQuery.data || [];
  const vendors: Vendor[] = vendorsQuery.data || [];
  const materials: Material[] = materialsQuery.data || [];
  const poTemplates: POTemplate[] = poTemplatesQuery.data || [];
  const templateStyles: TemplateStyle[] = templateStylesQuery.data || [];
  const pos: PO[] = posQuery.data || [];
  const grns: GRN[] = grnsQuery.data || [];
  const bills: Bill[] = billsQuery.data || [];
  const payments: Payment[] = paymentsQuery.data || [];
  const userProfile: UserProfile = useMemo(() => ({ ...defaultProfile, ...(profileQuery.data || meQuery.data?.user || {}) }), [meQuery.data?.user, profileQuery.data]);
  const materialIssues: MaterialIssue[] = materialIssuesQuery.data || [];
  const siteStocks: SiteStockEntry[] = siteStockQuery.data || [];
  const rateHistory: RateHistoryEntry[] = rateHistoryQuery.data || [];
  const vendorMaterialRates: VendorMaterialRateEntry[] = vendorMaterialRatesQuery.data || [];
  const systemSettings: SystemSettings | null = systemSettingsQuery.data || null;
  const accessControlUsers: AccessControlUser[] = accessControlUsersQuery.data || [];
  const permissionMap: PermissionMap = useMemo(() => {
    const mapFromServer = rolePermissionsQuery.data?.map as PermissionMap | undefined;
    if (mapFromServer) return mapFromServer;
    return buildRolePermissionMap(userProfile.role || ERP_ROLES.VIEWER);
  }, [rolePermissionsQuery.data?.map, userProfile.role]);
  const managedRolePermissionMap: PermissionMap = useMemo(() => {
    const mapFromServer = managedRolePermissionsQuery.data?.map as PermissionMap | undefined;
    if (mapFromServer) return mapFromServer;
    return buildRolePermissionMap(managedRole);
  }, [managedRole, managedRolePermissionsQuery.data?.map]);
  const permissionMapLoading = isAuthenticated && rolePermissionsQuery.isLoading;

  const isLoading = sitesQuery.isLoading || vendorsQuery.isLoading || materialsQuery.isLoading || posQuery.isLoading || grnsQuery.isLoading || billsQuery.isLoading || paymentsQuery.isLoading;
  const can = (moduleName: PermissionModule, action: PermissionAction) => canAccess(permissionMap, userProfile.role, moduleName, action);
  const assertCan = (moduleName: PermissionModule, action: PermissionAction) => {
    if (!can(moduleName, action)) {
      throw new Error(`Permission denied: ${moduleName}.${action}`);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await api.login(email, password);
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // no-op: clear local app state even if the server session is already gone.
    }
    userStore.getState().resetUserState();
    queryClient.setQueryData(['auth', 'me'], { user: null });
    queryClient.removeQueries({ queryKey: queryKeys.profile });
    queryClient.removeQueries({ queryKey: queryKeys.sites });
    queryClient.removeQueries({ queryKey: queryKeys.vendors });
    queryClient.removeQueries({ queryKey: queryKeys.materials });
    queryClient.removeQueries({ queryKey: queryKeys.pos });
    queryClient.removeQueries({ queryKey: queryKeys.grns });
    queryClient.removeQueries({ queryKey: queryKeys.bills });
    queryClient.removeQueries({ queryKey: queryKeys.payments });
  };

  const updateUserProfile = async (p: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await api.updateProfile(p);
    const nextProfile = response.profile as UserProfile;
    queryClient.setQueryData(queryKeys.profile, { profile: nextProfile });
    void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    return nextProfile;
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await api.changePassword(currentPassword, newPassword);
      return { success: true, message: result.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to change password' };
    }
  };

  const invalidate = (key: readonly string[]) => queryClient.invalidateQueries({ queryKey: key });

  const addSite = async (s: Omit<Site, 'id'>) => { assertCan("Sites", "create"); await api.createSite(s); invalidate(queryKeys.sites); };
  const updateSite = async (id: number, s: Partial<Site>) => { assertCan("Sites", "edit"); await api.updateSite(id, s); invalidate(queryKeys.sites); };
  const deleteSite = async (id: number) => { assertCan("Sites", "delete"); await api.deleteSite(id); invalidate(queryKeys.sites); };
  const addSites = async (newSites: Omit<Site, 'id'>[]) => { await api.createSitesBatch(newSites); invalidate(queryKeys.sites); };

  const addVendor = async (v: Omit<Vendor, 'id'>) => { assertCan("Vendors", "create"); await api.createVendor(v); invalidate(queryKeys.vendors); };
  const updateVendor = async (id: number, v: Partial<Vendor>) => { assertCan("Vendors", "edit"); await api.updateVendor(id, v); invalidate(queryKeys.vendors); };
  const deleteVendor = async (id: number) => { assertCan("Vendors", "delete"); await api.deleteVendor(id); invalidate(queryKeys.vendors); };
  const addVendors = async (newVendors: Omit<Vendor, 'id'>[]) => { await api.createVendorsBatch(newVendors); invalidate(queryKeys.vendors); };

  const addMaterial = async (m: Omit<Material, 'id'>) => { assertCan("Materials", "create"); await api.createMaterial(m); invalidate(queryKeys.materials); };
  const updateMaterial = async (id: number, m: Partial<Material>) => { assertCan("Materials", "edit"); await api.updateMaterial(id, m); invalidate(queryKeys.materials); };
  const deleteMaterial = async (id: number) => { assertCan("Materials", "delete"); await api.deleteMaterial(id); invalidate(queryKeys.materials); };
  const addMaterials = async (newMaterials: Omit<Material, 'id'>[]) => { await api.createMaterialsBatch(newMaterials); invalidate(queryKeys.materials); };

  const addPOTemplate = async (t: any) => { await api.createPOTemplate(t); invalidate(queryKeys.poTemplates); };
  const updatePOTemplate = async (id: number, t: any) => { await api.updatePOTemplate(id, t); invalidate(queryKeys.poTemplates); };
  const deletePOTemplate = async (id: number) => { await api.deletePOTemplate(id); invalidate(queryKeys.poTemplates); };

  const addTemplateStyle = async (s: any) => { await api.createTemplateStyle(s); invalidate(queryKeys.templateStyles); };
  const updateTemplateStyle = async (id: number, s: any) => { await api.updateTemplateStyle(id, s); invalidate(queryKeys.templateStyles); };
  const deleteTemplateStyle = async (id: number) => { await api.deleteTemplateStyle(id); invalidate(queryKeys.templateStyles); };

  const addPO = async (po: any) => {
    assertCan("Purchase Orders", "create");
    const createdPO = await api.createPO({ ...po, status: 'Pending' });
    if (po.items && po.vendorId) {
      for (const item of po.items) {
        await api.createRateHistory({
          materialId: item.materialId,
          vendorId: po.vendorId,
          rate: item.rate,
          date: po.date || new Date().toISOString().split('T')[0],
          poDisplayId: createdPO.displayId,
          quotationDisplayId: '',
        });
      }
    }
    invalidate(queryKeys.pos);
    invalidate(queryKeys.rateHistory);
  };
  const updatePO = async (id: number, po: Partial<PO>) => { assertCan("Purchase Orders", "edit"); await api.updatePO(id, po); invalidate(queryKeys.pos); };
  const deletePO = async (id: number) => { assertCan("Purchase Orders", "delete"); await api.deletePO(id); invalidate(queryKeys.pos); };
  const updatePOStatus = async (id: number, status: string) => { assertCan("Purchase Orders", "approve"); await api.updatePO(id, { status }); invalidate(queryKeys.pos); };

  const updatePOStatusBasedOnGRN = async (poDisplayId: string, currentGrns: GRN[]) => {
    const po = pos.find(p => p.displayId === poDisplayId);
    if (!po) return;

    const allGrnsForPo = currentGrns.filter(g => g.poId === poDisplayId);
    let allCompleted = true;
    let anyReceived = false;

    po.items.forEach(poItem => {
      const receivedQty = allGrnsForPo.reduce((acc, g) => {
        const grnItem = g.items.find(i => i.materialId === poItem.materialId);
        return acc + (grnItem ? grnItem.receivedQty : 0);
      }, 0);
      if (receivedQty < poItem.qty) allCompleted = false;
      if (receivedQty > 0) anyReceived = true;
    });

    const newStatus = allCompleted ? 'Completed' : anyReceived ? 'Partial' : 'Pending';
    await api.updatePO(po.id, { status: newStatus });
  };

  const addGRN = async (grn: any) => {
    assertCan("GRN", "create");
    const newGrn = await api.createGRN({ ...grn, status: 'Pending Bill' });
    const updatedGrns = [...grns, newGrn];
    await updatePOStatusBasedOnGRN(grn.poId, updatedGrns);
    invalidate(queryKeys.grns);
    invalidate(queryKeys.pos);
    invalidate(queryKeys.siteStock);
  };

  const updateGRN = async (id: number, grn: Partial<GRN>) => {
    assertCan("GRN", "edit");
    await api.updateGRN(id, grn);
    const targetGrn = grns.find(g => g.id === id);
    if (targetGrn) {
      const updatedGrns = grns.map(x => x.id === id ? { ...x, ...grn } : x);
      await updatePOStatusBasedOnGRN(targetGrn.poId, updatedGrns);
    }
    invalidate(queryKeys.grns);
    invalidate(queryKeys.pos);
  };

  const deleteGRN = async (id: number) => {
    assertCan("GRN", "delete");
    const grn = grns.find(g => g.id === id);
    await api.deleteGRN(id);
    if (grn) {
      const updatedGrns = grns.filter(x => x.id !== id);
      await updatePOStatusBasedOnGRN(grn.poId, updatedGrns);
    }
    invalidate(queryKeys.grns);
    invalidate(queryKeys.pos);
  };

  const addBill = async (bill: any) => {
    assertCan("Bills", "create");
    await api.createBill({ ...bill, status: 'pending', paidAmount: 0 });
    if (bill.grnId) {
      const grn = grns.find(g => g.displayId === bill.grnId);
      if (grn) await api.updateGRN(grn.id, { status: 'Billed' });
    }
    invalidate(queryKeys.bills);
    invalidate(queryKeys.grns);
  };

  const updateBill = async (id: number, bill: Partial<Bill>) => { assertCan("Bills", "edit"); await api.updateBill(id, bill); invalidate(queryKeys.bills); };

  const deleteBill = async (id: number) => {
    assertCan("Bills", "delete");
    const bill = bills.find(b => b.id === id);
    await api.deleteBill(id);
    if (bill?.grnId) {
      const grn = grns.find(g => g.displayId === bill.grnId);
      if (grn) await api.updateGRN(grn.id, { status: 'Pending Bill' });
    }
    invalidate(queryKeys.bills);
    invalidate(queryKeys.grns);
  };

  const updateBillStatus = async (id: number, status: string) => { assertCan("Bills", "approve"); await api.updateBill(id, { status }); invalidate(queryKeys.bills); };

  const addPayment = async (payment: any) => {
    assertCan("Payments", "create");
    await api.createPayment(payment);
    invalidate(queryKeys.payments);
    invalidate(queryKeys.bills);
  };

  const updatePayment = async (id: number, payment: Partial<Payment>) => { assertCan("Payments", "edit"); await api.updatePayment(id, payment); invalidate(queryKeys.payments); };

  const deletePayment = async (id: number) => {
    assertCan("Payments", "delete");
    await api.deletePayment(id);
    invalidate(queryKeys.payments);
    invalidate(queryKeys.bills);
  };

  const getNextIssueDisplayId = () => {
    const maxNum = materialIssues.reduce((max, i) => {
      const num = parseInt(i.displayId.replace('ISS-', '')) || 0;
      return num > max ? num : max;
    }, 0);
    return `ISS-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const addMaterialIssue = async (issue: any) => {
    assertCan("Stock", "create");
    const displayId = getNextIssueDisplayId();
    await api.createMaterialIssue({ ...issue, displayId });
    invalidate(queryKeys.materialIssues);
    invalidate(queryKeys.siteStock);
  };
  const updateMaterialIssue = async (id: number, issue: any) => {
    assertCan("Stock", "edit");
    await api.updateMaterialIssue(id, issue);
    invalidate(queryKeys.materialIssues);
  };
  const deleteMaterialIssue = async (id: number) => {
    assertCan("Stock", "delete");
    await api.deleteMaterialIssue(id);
    invalidate(queryKeys.materialIssues);
    invalidate(queryKeys.siteStock);
  };

  const updateSiteStock = async (siteId: string, materialId: string, receivedDelta: number, issuedDelta: number) => {
    assertCan("Stock", "edit");
    await api.updateSiteStock({ siteId, materialId, receivedDelta, issuedDelta });
    invalidate(queryKeys.siteStock);
  };

  const addRateHistory = async (entry: any) => {
    await api.createRateHistory(entry);
    invalidate(queryKeys.rateHistory);
  };

  const upsertVendorMaterialRate = async (vendorId: string, materialId: string, rate: number) => {
    assertCan("Vendors", "edit");
    await api.upsertVendorMaterialRate({ vendorId, materialId, rate });
    invalidate(queryKeys.vendorMaterialRates);
  };
  const deleteVendorMaterialRate = async (id: number) => {
    assertCan("Vendors", "delete");
    await api.deleteVendorMaterialRate(id);
    invalidate(queryKeys.vendorMaterialRates);
  };

  const createAccessControlUser = async (user: Partial<AccessControlUser> & { password: string }) => {
    assertCan("Settings", "edit");
    await api.createAccessControlUser(user);
    await queryClient.invalidateQueries({ queryKey: ['access-control', 'users'] });
  };

  const updateAccessControlUser = async (id: number, user: Partial<AccessControlUser> & { password?: string }) => {
    assertCan("Settings", "edit");
    await api.updateAccessControlUser(id, user);
    await queryClient.invalidateQueries({ queryKey: ['access-control', 'users'] });
  };

  const deleteAccessControlUser = async (id: number) => {
    assertCan("Settings", "delete");
    await api.deleteAccessControlUser(id);
    await queryClient.invalidateQueries({ queryKey: ['access-control', 'users'] });
  };

  const updateRolePermissions = async (role: string, map: AccessPermissionMap) => {
    assertCan("Settings", "edit");
    await api.updateRolePermissions(role, map);
    await queryClient.invalidateQueries({ queryKey: ['access-control', 'permissions', role] });
    if (role === currentRole) {
      await queryClient.invalidateQueries({ queryKey: ['access-control', 'permissions', currentRole] });
    }
  };

  return (
    <StoreContext.Provider value={{
      isAuthenticated, login, logout,
      searchQuery, setSearchQuery,
      userProfile, updateUserProfile, changePassword,
      isAuthLoading,
      systemSettings,
      sites, addSite, updateSite, deleteSite, addSites,
      vendors, addVendor, updateVendor, deleteVendor, addVendors,
      materials, addMaterial, updateMaterial, deleteMaterial, addMaterials,
      poTemplates, addPOTemplate, updatePOTemplate, deletePOTemplate,
      templateStyles, addTemplateStyle, updateTemplateStyle, deleteTemplateStyle,
      pos, addPO, updatePO, deletePO, updatePOStatus,
      grns, addGRN, updateGRN, deleteGRN,
      bills, addBill, updateBill, deleteBill, updateBillStatus,
      payments, addPayment, updatePayment, deletePayment,
      materialIssues, addMaterialIssue, updateMaterialIssue, deleteMaterialIssue,
      siteStocks, updateSiteStock,
      rateHistory, addRateHistory,
      vendorMaterialRates, upsertVendorMaterialRate, deleteVendorMaterialRate,
      accessControlUsers, createAccessControlUser, updateAccessControlUser, deleteAccessControlUser,
      permissionMap, permissionMapLoading, managedRole, setManagedRole, managedRolePermissionMap, can, updateRolePermissions,
      isLoading,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}
