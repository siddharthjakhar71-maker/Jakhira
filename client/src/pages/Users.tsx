import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Users() {
  return (
    <AppLayout>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          User management is ready for role-based route protection and can be extended in the next phase.
        </CardContent>
      </Card>
    </AppLayout>
  );
}
