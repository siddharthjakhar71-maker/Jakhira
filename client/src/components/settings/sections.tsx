import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { api, type AppUser } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MAX_PROFILE_IMAGE_BYTES, formatFileSize } from "@/lib/profile/profile-image";
import { presetPrimaryColors, useTheme, type AppTheme } from "@/lib/theme";
import { usePermissions } from "@/lib/permissions";
import { useUserStore } from "@/stores/user-store";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";

const USER_ROLES = ["Admin", "Viewer"] as const;
const emptyUserForm = { name: "", email: "", phone: "", password: "", role: "Viewer", isActive: true };

export function ProfileSettingsSection() {
  const { userProfile, updateUserProfile, changePassword, logout } = useStore();
  const { toast } = useToast();
  const setUserName = useUserStore((store) => store.setUserName);
  const storedAvatar = useUserStore((store) => store.avatar);
  const setAvatar = useUserStore((store) => store.setAvatar);
  const removeAvatar = useUserStore((store) => store.removeAvatar);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profileData, setProfileData] = useState({ ...userProfile });
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const displayedAvatar = storedAvatar || profileData.avatarUrl || "";

  useEffect(() => {
    setProfileData((prev) => ({ ...prev, ...userProfile, avatarUrl: storedAvatar || userProfile.avatarUrl || "" }));
  }, [storedAvatar, userProfile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingAvatar(true);
      const avatar = await setAvatar(file);
      setProfileData((prev) => ({ ...prev, avatarUrl: avatar }));
      toast({ title: "Photo updated", description: "Your profile image has been updated." });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserName(profileData.name);
    await updateUserProfile({ name: profileData.name, email: profileData.email, phone: profileData.phone, avatarUrl: displayedAvatar });
    toast({ title: "Profile updated", description: "Your account details were saved." });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
    if (result.success) {
      toast({ title: "Password changed", description: "Please sign in again." });
      setTimeout(() => logout(), 1000);
    } else {
      setPasswordError(result.message);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Personal account details for the signed-in user.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleProfileUpdate}>
            <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <UserAvatar name={profileData.name} imageUrl={displayedAvatar} className="h-16 w-16" fallbackClassName="text-lg" />
                <div>
                  <p className="text-sm font-semibold">Profile Photo</p>
                  <p className="text-xs text-muted-foreground">Use a compact square image under {formatFileSize(MAX_PROFILE_IMAGE_BYTES)}.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar}><Upload className="mr-2 h-4 w-4" />{isUploadingAvatar ? "Uploading..." : "Change"}</Button>
                <Button type="button" variant="ghost" size="sm" disabled={!displayedAvatar} onClick={() => { removeAvatar(); setProfileData((prev) => ({ ...prev, avatarUrl: "" })); }}><Trash2 className="mr-2 h-4 w-4" />Remove</Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2"><Label>Name</Label><Input value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Email</Label><Input value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Phone</Label><Input value={profileData.phone || ""} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Role</Label><Input value={profileData.role} disabled /></div>
            </div>
            <Button type="submit">Save Profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your password without affecting the current login flow.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handlePasswordChange}>
            <div className="grid gap-2"><Label>Current Password</Label><Input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} /></div>
            <div className="grid gap-2"><Label>New Password</Label><Input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Confirm Password</Label><Input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} /></div>
            {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
            <Button type="submit">Change Password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function AccessControlSection() {
  const { canView, isAdmin } = usePermissions();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const loadUsers = async () => {
    try {
      setUsers(await api.getUsers());
    } catch (error: any) {
      toast({ title: "Unable to load users", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (isAdmin && canView("Users")) {
      void loadUsers();
    }
  }, [isAdmin, canView]);

  const submitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        await api.updateUser(editingUserId, {
          name: userForm.name,
          email: userForm.email,
          phone: userForm.phone,
          role: userForm.role,
          isActive: userForm.isActive,
          password: userForm.password,
        });
        toast({ title: "User updated" });
      } else {
        await api.createUser(userForm);
        toast({ title: "User created" });
      }
      setUserForm(emptyUserForm);
      setEditingUserId(null);
      await loadUsers();
    } catch (error: any) {
      toast({ title: "Unable to save user", description: error.message, variant: "destructive" });
    }
  };

  const startEditUser = (user: AppUser) => {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: "",
      role: user.role,
      isActive: Boolean(user.isActive),
    });
  };

  const toggleUserActive = async (user: AppUser) => {
    try {
      await api.updateUser(user.id, { isActive: !user.isActive });
      await loadUsers();
    } catch (error: any) {
      toast({ title: "Unable to update status", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Control</CardTitle>
        <CardDescription>Admin-only user and role administration. Supported roles are limited to Admin and Viewer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{editingUserId ? "Edit User" : "Add User"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={submitUser}>
                <div className="grid gap-2"><Label>Name</Label><Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Email</Label><Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Phone</Label><Input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} /></div>
                <div className="grid gap-2"><Label>{editingUserId ? "Reset Password" : "Password"}</Label><Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder={editingUserId ? "Leave blank to keep current password" : "Temporary password"} /></div>
                <div className="grid gap-2"><Label>Role</Label><Select value={userForm.role} onValueChange={(role) => setUserForm({ ...userForm, role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{USER_ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>Status</Label><Select value={userForm.isActive ? "active" : "inactive"} onValueChange={(value) => setUserForm({ ...userForm, isActive: value === "active" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1"><Plus className="mr-2 h-4 w-4" />{editingUserId ? "Update User" : "Add User"}</Button>
                  {editingUserId ? <Button type="button" variant="outline" onClick={() => { setEditingUserId(null); setUserForm(emptyUserForm); }}>Cancel</Button> : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Users</CardTitle>
              <CardDescription>Activate, deactivate, and assign Admin / Viewer roles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex flex-col gap-3 rounded-xl border p-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{user.name}</p>
                      <Badge variant="outline">{user.role}</Badge>
                      <Badge className={user.isActive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-slate-200 text-slate-700 hover:bg-slate-200"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}{user.phone ? ` • ${user.phone}` : ""}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEditUser(user)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => toggleUserActive(user)}>{user.isActive ? "Deactivate" : "Activate"}</Button>
                  </div>
                </div>
              ))}
              {users.length === 0 ? <p className="text-sm text-muted-foreground">No users available.</p> : null}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

export function PreferencesSettingsSection() {
  const { systemSettings } = useStore();
  const { canView, canEdit, canDelete, canApprove } = usePermissions();
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();
  const { toast } = useToast();
  const [backupForm, setBackupForm] = useState({ backupEnabled: "0", backupFrequency: "weekly", backupLocation: "/backups" });

  useEffect(() => {
    if (systemSettings) {
      setBackupForm({
        backupEnabled: String(systemSettings.backupEnabled ?? 0),
        backupFrequency: systemSettings.backupFrequency || "weekly",
        backupLocation: systemSettings.backupLocation || "/backups",
      });
    }
  }, [systemSettings]);

  const saveBackupSettings = async () => {
    try {
      await api.updateSystemSettings({
        backupEnabled: Number(backupForm.backupEnabled),
        backupFrequency: backupForm.backupFrequency,
        backupLocation: backupForm.backupLocation,
      });
      toast({ title: "Preferences saved" });
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Compact theme and brand options.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2"><Label>Theme</Label><Select value={theme} onValueChange={(value: AppTheme) => setTheme(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="light">Light</SelectItem><SelectItem value="dark">Dark</SelectItem><SelectItem value="system">System</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2"><Label>Primary Color</Label><div className="flex items-center gap-3"><Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-16 p-1" /><Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono" /></div><div className="flex flex-wrap gap-2">{presetPrimaryColors.map((color) => <button key={color} type="button" className={cn("h-7 w-7 rounded-full border-2", primaryColor === color ? "border-foreground" : "border-border")} style={{ backgroundColor: color }} onClick={() => setPrimaryColor(color)} />)}</div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Preferences</CardTitle>
          <CardDescription>Backup controls remain available under Preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2"><Label>Auto Backup</Label><Select value={backupForm.backupEnabled} onValueChange={(value) => setBackupForm((prev) => ({ ...prev, backupEnabled: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Enabled</SelectItem><SelectItem value="0">Disabled</SelectItem></SelectContent></Select></div>
            <div className="grid gap-2"><Label>Frequency</Label><Select value={backupForm.backupFrequency} onValueChange={(value) => setBackupForm((prev) => ({ ...prev, backupFrequency: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select></div>
            <div className="grid gap-2"><Label>Backup Location</Label><Input value={backupForm.backupLocation} onChange={(e) => setBackupForm((prev) => ({ ...prev, backupLocation: e.target.value }))} /></div>
          </div>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {canApprove("Settings") ? <Button onClick={() => api.createBackup()}>Create Backup</Button> : null}
            {canView("Settings") ? <Button variant="outline" onClick={() => api.downloadBackup()}>Download Backup</Button> : null}
            {canEdit("Settings") ? <Button variant="secondary" onClick={saveBackupSettings}>Save Preferences</Button> : null}
            {canDelete("Settings") ? <Button variant="destructive" onClick={() => api.resetDemoData(window.prompt("Confirm with your password") || "")}>Reset Demo Data</Button> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
