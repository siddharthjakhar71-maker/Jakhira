import { AppLayout } from "@/components/layout/AppLayout";
import {
  AccessControlSection,
  ProfileSettingsSection,
  SystemPreferencesSection,
  ThemeSettingsSection,
} from "@/components/settings/sections";
import POTemplateDesigner from "@/pages/POTemplateDesigner";
import TemplateStyleDesigner from "@/pages/TemplateStyleDesigner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isAdminRole } from "@/lib/permissions";
import { useStore } from "@/lib/store";
import { Settings2 } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";

type SettingsTab = "general" | "po-template" | "po-layout" | "theme" | "access-control";

const DEFAULT_TAB: SettingsTab = "general";
const SETTINGS_TABS: SettingsTab[] = ["general", "po-template", "po-layout", "theme", "access-control"];

const tabMeta: Record<SettingsTab, { title: string; description: string }> = {
  general: {
    title: "General",
    description: "Manage your profile and core ERP preferences without touching operational modules.",
  },
  "po-template": {
    title: "PO Template",
    description: "Restore and manage purchase order content templates using the existing designer.",
  },
  "po-layout": {
    title: "PO Layout",
    description: "Restore and manage purchase order layout styles using the existing layout designer.",
  },
  theme: {
    title: "Theme",
    description: "Adjust appearance settings separately from the rest of system preferences.",
  },
  "access-control": {
    title: "Access Control",
    description: "Admin-only control over ERP users, roles, and activation status.",
  },
};

function getSettingsTab(value: string | null, isAdmin: boolean): SettingsTab {
  if (!value || !SETTINGS_TABS.includes(value as SettingsTab)) {
    return DEFAULT_TAB;
  }

  if (value === "access-control" && !isAdmin) {
    return DEFAULT_TAB;
  }

  return value as SettingsTab;
}

export default function Settings() {
  const [location, setLocation] = useLocation();
  const { userProfile } = useStore();
  const isAdmin = isAdminRole(userProfile.role);
  const params = useMemo(() => new URLSearchParams(location.split("?")[1] || ""), [location]);
  const activeTab = getSettingsTab(params.get("tab"), isAdmin);
  const meta = tabMeta[activeTab];

  const updateTab = (nextTab: string) => {
    const safeTab = getSettingsTab(nextTab, isAdmin);
    const nextParams = new URLSearchParams(params);
    if (safeTab === DEFAULT_TAB) {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", safeTab);
    }
    const query = nextParams.toString();
    setLocation(query ? `/settings?${query}` : "/settings");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border bg-background p-3 shadow-sm">
            <Settings2 className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Centralize configuration in one safe settings workspace while keeping procurement, stock, billing, payments, and reporting flows unchanged.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={updateTab} className="space-y-6">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border bg-background p-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="po-template">PO Template</TabsTrigger>
            <TabsTrigger value="po-layout">PO Layout</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
            {isAdmin ? <TabsTrigger value="access-control">Access Control</TabsTrigger> : null}
          </TabsList>

          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{meta.title}</h2>
            <p className="text-sm text-muted-foreground">{meta.description}</p>
          </div>

          <TabsContent value="general" className="space-y-6">
            <ProfileSettingsSection />
            <SystemPreferencesSection />
          </TabsContent>

          <TabsContent value="po-template" className="space-y-6">
            <POTemplateDesigner />
          </TabsContent>

          <TabsContent value="po-layout" className="space-y-6">
            <TemplateStyleDesigner />
          </TabsContent>

          <TabsContent value="theme" className="space-y-6">
            <ThemeSettingsSection />
          </TabsContent>

          {isAdmin ? (
            <TabsContent value="access-control" className="space-y-6">
              <AccessControlSection />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </AppLayout>
  );
}
