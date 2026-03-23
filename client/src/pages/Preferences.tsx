import { AppLayout } from "@/components/layout/AppLayout";
import { PreferencesSettingsSection } from "@/components/settings/sections";

export default function Preferences() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Preferences</h1>
          <p className="text-sm text-muted-foreground">Adjust ERP appearance and system preference settings without affecting existing modules.</p>
        </div>
        <PreferencesSettingsSection />
      </div>
    </AppLayout>
  );
}
