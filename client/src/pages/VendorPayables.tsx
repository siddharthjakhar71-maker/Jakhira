import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, VendorPayableResponse } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const money = (amount: number) => `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function VendorPayables() {
  const { data = [], isLoading } = useQuery<VendorPayableResponse[]>({
    queryKey: ["vendorPayables"],
    queryFn: api.getVendorPayables,
  });

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendor Payables</h1>
          <p className="text-sm text-muted-foreground">Outstanding = Opening Balance + Bills − Payments</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Outstanding Amount</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Vendor</th>
                  <th className="text-right p-2">Outstanding Amount</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">Loading payables...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">No outstanding vendor payables.</td></tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.vendorId} className="border-b">
                      <td className="p-2 font-medium">{item.vendorName}</td>
                      <td className="p-2 text-right font-semibold">{money(item.outstanding)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
