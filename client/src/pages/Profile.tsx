import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileSettingsSection } from "@/components/settings/sections";

export default function Profile() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your account details, profile photo, role display, and password in one place.</p>
        </div>
        <ProfileSettingsSection />
      </div>
    </AppLayout>
  );
}
