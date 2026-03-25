import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
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

type LedgerRow = {
  date: string;
  type: "opening_balance" | "bill" | "payment";
  reference: string;
  debit: number;
  credit: number;
  balance: number;
};

const money = (amount: number) => `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function VendorLedger() {
  const { vendors } = useStore();
  const [vendorId, setVendorId] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [month, setMonth] = useState<string>("");

  const activeVendorId = vendorId === "all" ? "" : vendorId;

  const { data = [], isLoading } = useQuery<LedgerRow[]>({
    queryKey: ["vendorLedger", activeVendorId, startDate, endDate],
    queryFn: () => api.getVendorLedger(activeVendorId, startDate || undefined, endDate || undefined),
    enabled: !!activeVendorId,
  });

  const totals = useMemo(() => {
    return data.reduce(
      (acc, row) => {
        acc.debit += row.debit;
        acc.credit += row.credit;
        acc.balance = row.balance;
        return acc;
      },
      { debit: 0, credit: 0, balance: 0 },
    );
  }, [data]);

  const applyMonth = (value: string) => {
    setMonth(value);
    if (!value) return;
    const [year, monthValue] = value.split("-").map(Number);
    const start = new Date(year, monthValue - 1, 1);
    const end = new Date(year, monthValue, 0);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  const exportExcel = () => {
    const exportRows = data.map((row) => ({
      Date: row.date,
      Type: row.type,
      Reference: row.reference,
      Debit: row.debit,
      Credit: row.credit,
      Balance: row.balance,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), "Vendor Ledger");
    XLSX.writeFile(wb, `vendor-ledger-${activeVendorId}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Vendor Ledger", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Date", "Type", "Reference", "Debit", "Credit", "Balance"]],
      body: data.map((row) => [row.date, row.type, row.reference, row.debit.toFixed(2), row.credit.toFixed(2), row.balance.toFixed(2)]),
      styles: { fontSize: 9 },
    });
    doc.save(`vendor-ledger-${activeVendorId}.pdf`);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendor Ledger</h1>
            <p className="text-sm text-muted-foreground">Track vendor transactions from opening balance, bills, and payments.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportExcel} disabled={!data.length}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline" onClick={exportPdf} disabled={!data.length}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Vendor Outstanding</div>
            <div className="text-3xl font-bold mt-1">{money(totals.balance)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Select Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select vendor</SelectItem>
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
              <Input type="month" value={month} onChange={(e) => applyMonth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
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
                    <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Loading ledger...</td></tr>
                  ) : !activeVendorId ? (
                    <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Select a vendor to view ledger.</td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No transactions found for selected filters.</td></tr>
                  ) : (
                    data.map((row, idx) => (
                      <tr key={`${row.reference}-${idx}`} className="border-b">
                        <td className="p-2">{row.date}</td>
                        <td className="p-2">{row.type === "opening_balance" ? "Opening Balance" : row.type === "bill" ? "Bill" : "Payment"}</td>
                        <td className="p-2">{row.reference}</td>
                        <td className="p-2 text-right">{row.debit ? money(row.debit) : "-"}</td>
                        <td className="p-2 text-right">{row.credit ? money(row.credit) : "-"}</td>
                        <td className="p-2 text-right font-medium">{money(row.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40 font-semibold">
                    <td colSpan={3} className="p-2 text-right">Totals</td>
                    <td className="p-2 text-right">{money(totals.debit)}</td>
                    <td className="p-2 text-right">{money(totals.credit)}</td>
                    <td className="p-2 text-right">{money(totals.balance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
