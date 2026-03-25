import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { api, type VendorStatementResponse } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const money = (amount: number) => `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function VendorStatement() {
  const { vendors } = useStore();
  const [vendorId, setVendorId] = useState<string>("");
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const { data, isLoading } = useQuery<VendorStatementResponse>({
    queryKey: ["vendorStatement", vendorId, month],
    queryFn: () => api.getVendorStatement(vendorId, month),
    enabled: !!vendorId && !!month,
  });

  const monthLabel = useMemo(() => {
    if (!month) return "";
    const [year, monthNum] = month.split("-").map(Number);
    return new Date(year, monthNum - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  }, [month]);

  const exportExcel = () => {
    if (!data) return;
    const exportRows = data.transactions.map((row) => ({
      Date: row.date,
      Type: row.type === "bill" ? "Bill" : row.type === "payment" ? "Payment" : "Opening Balance",
      Reference: row.reference,
      Debit: row.debit,
      Credit: row.credit,
      Balance: row.balance,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), "Vendor Statement");
    XLSX.writeFile(wb, `Vendor_Ledger_${monthLabel.replace(/\s+/g, "_")}.xlsx`);
  };

  const exportPdf = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Vendor Statement - ${data.vendorName}`, 14, 16);
    doc.text(monthLabel, 14, 23);
    autoTable(doc, {
      startY: 28,
      head: [["Date", "Type", "Reference", "Debit", "Credit", "Balance"]],
      body: data.transactions.map((row) => [
        row.date,
        row.type === "bill" ? "Bill" : row.type === "payment" ? "Payment" : "Opening Balance",
        row.reference,
        row.debit.toFixed(2),
        row.credit.toFixed(2),
        row.balance.toFixed(2),
      ]),
      styles: { fontSize: 9 },
    });
    doc.save(`Vendor_Ledger_${monthLabel.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendor Statements</h1>
            <p className="text-sm text-muted-foreground">Monthly statement with opening and closing balances.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportExcel} disabled={!data?.transactions?.length}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline" onClick={exportPdf} disabled={!data?.transactions?.length}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Opening Balance</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{money(data?.openingBalance || 0)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Closing Balance</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{money(data?.closingBalance || 0)}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Reference</th>
                  <th className="text-right p-2">Debit</th>
                  <th className="text-right p-2">Credit</th>
                  <th className="text-right p-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Loading statement...</td></tr>
                ) : !vendorId ? (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Select a vendor to view statement.</td></tr>
                ) : !data?.transactions?.length ? (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No transactions found for selected month.</td></tr>
                ) : (
                  data.transactions.map((row, index) => (
                    <tr key={`${row.reference}-${index}`} className="border-b">
                      <td className="p-2">{row.date}</td>
                      <td className="p-2">{row.type === "bill" ? "Bill" : row.type === "payment" ? "Payment" : "Opening Balance"}</td>
                      <td className="p-2">{row.reference}</td>
                      <td className="p-2 text-right">{row.debit ? money(row.debit) : "-"}</td>
                      <td className="p-2 text-right">{row.credit ? money(row.credit) : "-"}</td>
                      <td className="p-2 text-right font-medium">{money(row.balance)}</td>
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
