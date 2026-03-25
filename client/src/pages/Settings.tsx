import { AppLayout } from "@/components/layout/AppLayout";
import { UserAvatar } from "@/components/UserAvatar";
import { useStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UserCircle,
  FileSliders,
  Layout,
  Database,
  Palette,
  Upload,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "@/stores/user-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { presetPrimaryColors, useTheme, type AppTheme } from "@/lib/theme";
import { api, queryKeys, type AuditLog } from "@/lib/api";
import { MAX_PROFILE_IMAGE_BYTES, formatFileSize } from "@/lib/profile/profile-image";
import POTemplateDesigner from "./POTemplateDesigner";
import TemplateStyleDesigner from "./TemplateStyleDesigner";
import { ERP_PERMISSION_MODULES, ERP_ROLE_LIST, ERP_ROLES, isAdminRole } from "@shared/permissions";

type SettingsTab =
  | "general"
  | "appearance"
  | "po-templates"
  | "template-styles"
  | "system-tools"
  | "access-control"
  | "audit-logs";

export default function Settings() {
  const {
    userProfile,
    updateUserProfile,
    changePassword,
    logout,
    systemSettings,
    accessControlUsers,
    createAccessControlUser,
    updateAccessControlUser,
    deleteAccessControlUser,
    can,
    managedRole,
    setManagedRole,
    managedRolePermissionMap,
    updateRolePermissions,
  } = useStore();
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [profileData, setProfileData] = useState(userProfile);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [backupForm, setBackupForm] = useState({
    backupEnabled: "0",
    backupFrequency: "weekly",
    backupLocation: "/backups",
  });
  const storedAvatar = useUserStore((store) => store.avatar);
  const setUserName = useUserStore((store) => store.setUserName);
  const setAvatar = useUserStore((store) => store.setAvatar);
  const removeAvatar = useUserStore((store) => store.removeAvatar);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [newUser, setNewUser] = useState<{
    name: string;
    email: string;
    phone: string;
    password: string;
    role: string;
  }>({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: ERP_ROLES.VIEWER,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isAdminUser = isAdminRole(userProfile.role);
  const [auditFilters, setAuditFilters] = useState({
    userId: "",
    module: "",
    startDate: "",
    endDate: "",
  });
  const [auditPage, setAuditPage] = useState(0);
  const auditPageSize = 50;

  const auditLogsQuery = useQuery({
    queryKey: [queryKeys.auditLogs, auditFilters, auditPage],
    queryFn: () =>
      api.getAuditLogs({
        ...auditFilters,
        userId: auditFilters.userId.trim() || undefined,
        module: auditFilters.module.trim() || undefined,
        startDate: auditFilters.startDate || undefined,
        endDate: auditFilters.endDate || undefined,
        limit: auditPageSize,
        offset: auditPage * auditPageSize,
      }),
    enabled: isAdminUser,
  });
  const auditLogs: AuditLog[] = auditLogsQuery.data || [];
  const auditModuleOptions = useMemo(() => {
    const discovered = new Set<string>([
      ...ERP_PERMISSION_MODULES,
      "Authentication",
      "Access Control",
      "System Tools",
      "PO Templates",
      "Template Styles",
    ]);
    for (const log of auditLogs) {
      if (log.module?.trim()) discovered.add(log.module.trim());
    }
    return Array.from(discovered).sort((a, b) => a.localeCompare(b));
  }, [auditLogs]);

  useEffect(() => {
    setProfileData((prev) => ({
      ...prev,
      ...userProfile,
      name: userProfile.name || prev.name,
      avatarUrl: storedAvatar || userProfile.avatarUrl || "",
    }));
  }, [storedAvatar, userProfile]);

  useEffect(() => {
    if (systemSettings) {
      setBackupForm({
        backupEnabled: String(systemSettings.backupEnabled ?? 0),
        backupFrequency: systemSettings.backupFrequency || "weekly",
        backupLocation: systemSettings.backupLocation || "/backups",
      });
    }
  }, [systemSettings]);

  const displayedAvatar = useMemo(
    () => storedAvatar || profileData.avatarUrl || "",
    [profileData.avatarUrl, storedAvatar],
  );

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const avatar = await setAvatar(file);
      setProfileData((prev) => ({
        ...prev,
        avatarUrl: avatar,
      }));
      toast({
        title: "Photo updated",
        description: "Your avatar is now available across the dashboard.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unable to process this image.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleRemovePhoto = () => {
    removeAvatar();
    setProfileData((prev) => ({
      ...prev,
      avatarUrl: "",
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserName(profileData.name);
    await updateUserProfile({
      name: profileData.name,
      email: profileData.email,
      avatarUrl: displayedAvatar,
    });
    toast({
      title: "Profile updated",
      description: "Your user profile settings have been saved.",
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (passwordData.newPassword !== passwordData.confirmPassword)
      return setPasswordError("Passwords do not match");
    const result = await changePassword(
      passwordData.currentPassword,
      passwordData.newPassword,
    );
    if (result.success) {
      toast({ title: "Password changed", description: "You will be logged out." });
      setTimeout(() => logout(), 1000);
    } else {
      setPasswordError(result.message);
    }
  };

  const handleResetDemoData = async () => {
    if (!window.confirm("This will permanently delete all operational data. Continue?")) return;
    try {
      await api.resetDemoData(resetPasswordConfirm);
      toast({ title: "Demo data reset complete" });
      setResetPasswordConfirm("");
    } catch (error: any) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    }
  };

  const handleBackupSave = async () => {
    try {
      await api.updateSystemSettings({
        backupEnabled: Number(backupForm.backupEnabled),
        backupFrequency: backupForm.backupFrequency,
        backupLocation: backupForm.backupLocation,
      });
      toast({ title: "Backup settings saved" });
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    }
  };

  const tabs = [
    { key: "general" as const, label: "General", icon: UserCircle },
    { key: "appearance" as const, label: "Appearance", icon: Palette },
    { key: "po-templates" as const, label: "PO Templates", icon: FileSliders },
    { key: "template-styles" as const, label: "Template Styles", icon: Layout },
    ...(isAdminUser ? [{ key: "system-tools" as const, label: "System Tools", icon: Database }] : []),
    ...(can("Settings", "view") && isAdminUser
      ? [{ key: "access-control" as const, label: "Access Control", icon: UserCircle }]
      : []),
    ...(isAdminUser ? [{ key: "audit-logs" as const, label: "Audit Logs", icon: FileSliders }] : []),
  ];

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab("general");
    }
  }, [activeTab, tabs]);

  const handleCreateUser = async () => {
    await createAccessControlUser(newUser);
    setNewUser({ name: "", email: "", phone: "", password: "", role: ERP_ROLES.VIEWER });
    toast({ title: "User created" });
  };

  const handleDeleteUser = async (id: number, name: string) => {
    const confirmed = window.confirm(`Delete user "${name}" permanently? This action cannot be undone.`);
    if (!confirmed) return;
    await deleteAccessControlUser(id);
    toast({ title: "User deleted" });
  };

  const handleTogglePermission = async (moduleName: string, action: string) => {
    const next = JSON.parse(JSON.stringify(managedRolePermissionMap || {}));
    next[moduleName] = next[moduleName] || {};
    next[moduleName][action] = !Boolean(next[moduleName][action]);
    await updateRolePermissions(managedRole, next);
    toast({ title: `${managedRole} permissions updated` });
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <Card>
            <CardContent className="p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </CardContent>
          </Card>

          <>
            {activeTab === "general" && (
              <div className="grid items-stretch gap-4 xl:grid-cols-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>User Profile</CardTitle>
                    <CardDescription>
                      Update your profile details shown across the app, including the sidebar.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-full">
                    <form className="flex h-full flex-col space-y-5" onSubmit={handleProfileUpdate}>
                      <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-4">
                            <UserAvatar
                              name={profileData.name}
                              imageUrl={displayedAvatar}
                              className="h-20 w-20 ring-2 ring-primary/10"
                              fallbackClassName="text-lg"
                            />
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-foreground">Profile Photo</p>
                              <p className="text-xs leading-5 text-muted-foreground">
                                Upload a square image for the cleanest result. Images are converted to
                                Base64 and persisted locally for a consistent experience across pages.
                                Keep files under {formatFileSize(MAX_PROFILE_IMAGE_BYTES)}.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleAvatarUpload}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingAvatar}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {isUploadingAvatar ? "Uploading..." : "Change Photo"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRemovePhoto}
                              disabled={!displayedAvatar || isUploadingAvatar}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove Photo
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="profile-display-name">Display Name</Label>
                        <Input
                          id="profile-display-name"
                          value={profileData.name}
                          onChange={(e) =>
                            setProfileData({ ...profileData, name: e.target.value })
                          }
                          placeholder="Enter your display name"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Role</Label>
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                          {userProfile.role || ERP_ROLES.VIEWER}
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="profile-email">Email</Label>
                        <Input
                          id="profile-email"
                          value={profileData.email}
                          onChange={(e) =>
                            setProfileData({ ...profileData, email: e.target.value })
                          }
                        />
                      </div>
                      <div className="mt-auto pt-2">
                        <Button type="submit">Save Profile</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Security</CardTitle>
                  </CardHeader>
                  <CardContent className="h-full">
                    <form className="flex h-full flex-col space-y-2" onSubmit={handlePasswordChange}>
                      <Label>Current Password</Label>
                      <Input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, currentPassword: e.target.value })
                        }
                      />
                      <Label>New Password</Label>
                      <Input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, newPassword: e.target.value })
                        }
                      />
                      <Label>Confirm Password</Label>
                      <Input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                        }
                      />
                      {passwordError && (
                        <p className="text-sm text-destructive">{passwordError}</p>
                      )}
                      <div className="mt-auto pt-2">
                        <Button type="submit">Change Password</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "appearance" && (
              <Card>
                <CardHeader>
                  <CardTitle>Theme & Branding</CardTitle>
                  <CardDescription>
                    Choose light, dark, or system theme and personalize the primary brand color.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid max-w-sm gap-2">
                    <Label>Theme Mode</Label>
                    <Select value={theme} onValueChange={(value: AppTheme) => setTheme(value)}>
                      <SelectTrigger data-testid="select-theme-mode">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System Default</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid max-w-sm gap-3">
                    <Label htmlFor="primary-color-picker">Primary Color</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="primary-color-picker"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-20 p-1"
                        data-testid="input-primary-color"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#2563eb"
                        className="font-mono"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {presetPrimaryColors.map((color) => (
                        <button
                          type="button"
                          key={color}
                          onClick={() => setPrimaryColor(color)}
                          className={cn(
                            "h-7 w-7 rounded-full border-2",
                            primaryColor === color
                              ? "border-foreground"
                              : "border-border",
                          )}
                          style={{ backgroundColor: color }}
                          aria-label={`Select ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isAdminUser && activeTab === "system-tools" && (
              <div className="grid items-stretch gap-4 xl:grid-cols-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Reset Demo Data</CardTitle>
                    <CardDescription>Enter account password to confirm reset.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={resetPasswordConfirm}
                      onChange={(e) => setResetPasswordConfirm(e.target.value)}
                    />
                    <Button
                      variant="destructive"
                      className="w-full md:w-auto"
                      onClick={handleResetDemoData}
                    >
                      Reset Demo Data
                    </Button>
                  </CardContent>
                </Card>
                <Card className="h-full overflow-hidden">
                  <CardHeader>
                    <CardTitle>Database Backup</CardTitle>
                    <CardDescription>
                      Configure backup behavior and manage backup files.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label>Auto Backup</Label>
                      <Select
                        value={backupForm.backupEnabled}
                        onValueChange={(v) =>
                          setBackupForm((prev) => ({ ...prev, backupEnabled: v }))
                        }
                      >
                        <SelectTrigger className="w-full md:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Enabled</SelectItem>
                          <SelectItem value="0">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Label>Frequency</Label>
                      <Select
                        value={backupForm.backupFrequency}
                        onValueChange={(v) =>
                          setBackupForm((prev) => ({ ...prev, backupFrequency: v }))
                        }
                      >
                        <SelectTrigger className="w-full md:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label>Backup Location</Label>
                      <Input
                        value={backupForm.backupLocation}
                        onChange={(e) =>
                          setBackupForm((prev) => ({
                            ...prev,
                            backupLocation: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="flex w-full flex-col flex-wrap items-center justify-between gap-4 md:flex-row">
                      <Button className="w-full md:w-auto" onClick={() => api.createBackup()}>
                        Create Backup
                      </Button>
                      <Button
                        className="w-full md:w-auto"
                        variant="outline"
                        onClick={() => api.downloadBackup()}
                      >
                        Download Database Backup
                      </Button>
                      <Button
                        className="w-full md:w-auto"
                        variant="secondary"
                        onClick={handleBackupSave}
                      >
                        Save Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "po-templates" && <POTemplateDesigner />}
            {activeTab === "template-styles" && <TemplateStyleDesigner />}
            {isAdminUser && activeTab === "access-control" && (
              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>Create and manage users and roles.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <Input placeholder="Name" value={newUser.name} onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))} />
                      <Input placeholder="Email" value={newUser.email} onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))} />
                      <Input placeholder="Phone" value={newUser.phone} onChange={(e) => setNewUser((prev) => ({ ...prev, phone: e.target.value }))} />
                      <Input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={newUser.role} onValueChange={(v: string) => setNewUser((prev) => ({ ...prev, role: v }))}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ERP_ROLE_LIST.map((role) => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleCreateUser}>Create User</Button>
                    </div>

                    <div className="space-y-2">
                      {accessControlUsers.map((user) => (
                        <div key={user.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                          <div>
                            <div className="font-medium">{user.name} ({user.role})</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                          <div className="flex gap-2">
                            <Select value={user.role} onValueChange={(role: string) => updateAccessControlUser(user.id, { role })}>
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ERP_ROLE_LIST.map((role) => (
                                  <SelectItem key={`${user.id}-${role}`} value={role}>{role}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateAccessControlUser(user.id, { isActive: user.isActive ? 0 : 1 })}
                            >
                              {user.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={user.id === userProfile.id}
                              onClick={() => handleDeleteUser(user.id, user.name)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Role Module Permissions</CardTitle>
                    <CardDescription>Toggle module-level actions for the selected role.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="role-permission-target">Role</Label>
                      <Select value={managedRole} onValueChange={(role: string) => setManagedRole(role)}>
                        <SelectTrigger id="role-permission-target" className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ERP_ROLE_LIST.filter((role) => role !== ERP_ROLES.ADMIN).map((role) => (
                            <SelectItem key={`permission-${role}`} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {Object.entries(managedRolePermissionMap || {}).map(([moduleName, actions]) => (
                      <div key={moduleName} className="rounded border p-2">
                        <p className="mb-2 text-sm font-semibold">{moduleName}</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(actions || {}).map(([action, allowed]) => (
                            <Button
                              key={`${moduleName}-${action}`}
                              type="button"
                              size="sm"
                              variant={allowed ? "default" : "outline"}
                              onClick={() => handleTogglePermission(moduleName, action)}
                            >
                              {action}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
            {isAdminUser && activeTab === "audit-logs" && (
              <Card>
                <CardHeader>
                  <CardTitle>Audit Logs</CardTitle>
                  <CardDescription>
                    Track critical ERP actions with actor, module, and timestamp details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 md:grid-cols-5">
                    <Select
                      value={auditFilters.userId || "__all_users__"}
                      onValueChange={(value) => {
                        setAuditPage(0);
                        setAuditFilters((prev) => ({
                          ...prev,
                          userId: value === "__all_users__" ? "" : value,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all_users__">All Users</SelectItem>
                        {accessControlUsers.map((user) => (
                          <SelectItem key={`audit-user-${user.id}`} value={String(user.id)}>
                            {user.name} (#{user.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={auditFilters.module || "__all_modules__"}
                      onValueChange={(value) => {
                        setAuditPage(0);
                        setAuditFilters((prev) => ({
                          ...prev,
                          module: value === "__all_modules__" ? "" : value,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Modules" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all_modules__">All Modules</SelectItem>
                        {auditModuleOptions.map((moduleName) => (
                          <SelectItem key={`audit-module-${moduleName}`} value={moduleName}>
                            {moduleName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={auditFilters.startDate}
                      onChange={(e) => {
                        setAuditPage(0);
                        setAuditFilters((prev) => ({ ...prev, startDate: e.target.value }));
                      }}
                    />
                    <Input
                      type="date"
                      value={auditFilters.endDate}
                      onChange={(e) => {
                        setAuditPage(0);
                        setAuditFilters((prev) => ({ ...prev, endDate: e.target.value }));
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAuditPage(0);
                        setAuditFilters({
                          userId: "",
                          module: "",
                          startDate: "",
                          endDate: "",
                        });
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 text-left">Date / Time</th>
                          <th className="px-3 py-2 text-left">User</th>
                          <th className="px-3 py-2 text-left">Role</th>
                          <th className="px-3 py-2 text-left">Module</th>
                          <th className="px-3 py-2 text-left">Action</th>
                          <th className="px-3 py-2 text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="border-t">
                            <td className="px-3 py-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                            <td className="px-3 py-2">{log.userName || "System"} {log.userId ? `(#${log.userId})` : ""}</td>
                            <td className="px-3 py-2">{log.userRole || "-"}</td>
                            <td className="px-3 py-2">{log.module}</td>
                            <td className="px-3 py-2">{log.action}</td>
                            <td className="px-3 py-2">{log.description}</td>
                          </tr>
                        ))}
                        {!auditLogsQuery.isLoading && auditLogs.length === 0 && (
                          <tr>
                            <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                              No logs found for the selected filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setAuditPage((prev) => Math.max(0, prev - 1))}
                      disabled={auditPage === 0}
                    >
                      Previous
                    </Button>
                    <p className="text-xs text-muted-foreground">Page {auditPage + 1}</p>
                    <Button
                      variant="outline"
                      onClick={() => setAuditPage((prev) => prev + 1)}
                      disabled={auditLogs.length < auditPageSize}
                    >
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        </div>
      </div>
    </AppLayout>
  );
}
