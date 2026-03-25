import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { api, type LedgerEntry } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const money = (amount: number) => `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function VendorLedger() {
  const { vendors } = useStore();
  const [vendorId, setVendorId] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["vendorLedgerDetails", vendorId],
    queryFn: () => api.getVendorLedgerDetails(vendorId),
    enabled: Boolean(vendorId),
  });

  const ledger = (data?.ledger || []) as LedgerEntry[];

  const totals = useMemo(() => ledger.reduce((acc, row) => {
    acc.debit += row.debit;
    acc.credit += row.credit;
    acc.balance = row.balance;
    return acc;
  }, { debit: 0, credit: 0, balance: 0 }), [ledger]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendor Ledger</h1>
          <p className="text-sm text-muted-foreground">Bill and payment ledger with running vendor balance.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Vendor Selection</CardTitle></CardHeader>
          <CardContent className="max-w-md space-y-2">
            <Label>Vendor</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger><SelectValue placeholder="Choose vendor" /></SelectTrigger>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id.toString()}>{vendor.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference ID</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Running Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>}
                  {!isLoading && !vendorId && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Select a vendor to view ledger.</TableCell></TableRow>}
                  {!isLoading && vendorId && ledger.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No transactions available.</TableCell></TableRow>}
                  {!isLoading && ledger.map((entry, index) => (
                    <TableRow key={`${entry.reference}-${index}`}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>{entry.type === "bill" ? "Bill" : entry.type === "payment" ? "Payment" : "Opening"}</TableCell>
                      <TableCell>{entry.reference}</TableCell>
                      <TableCell className="text-right">{entry.debit ? money(entry.debit) : "-"}</TableCell>
                      <TableCell className="text-right">{entry.credit ? money(entry.credit) : "-"}</TableCell>
                      <TableCell className="text-right font-medium">{money(entry.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid grid-cols-1 gap-3 pt-6 md:grid-cols-3">
            <div><div className="text-sm text-muted-foreground">Total Debit</div><div className="text-lg font-semibold">{money(totals.debit)}</div></div>
            <div><div className="text-sm text-muted-foreground">Total Credit</div><div className="text-lg font-semibold">{money(totals.credit)}</div></div>
            <div><div className="text-sm text-muted-foreground">Closing Balance</div><div className="text-lg font-semibold">{money(totals.balance)}</div></div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
