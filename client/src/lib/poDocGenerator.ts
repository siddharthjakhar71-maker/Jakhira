import type { PO, Site, Vendor, Material, UserProfile, POTemplateConfig, LayoutBlock } from './store';
import { ensureTemplateDefaults } from './defaultTemplate';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const DEFAULT_LAYOUT_BLOCKS: LayoutBlock[] = [
  { id: 'header', label: 'Header', row: 0, col: 0, colSpan: 2, visible: true },
  { id: 'order-details', label: 'Order Details', row: 1, col: 0, colSpan: 2, visible: true },
  { id: 'bill-to', label: 'Bill To', row: 2, col: 0, colSpan: 1, visible: true },
  { id: 'ship-to', label: 'Ship To', row: 2, col: 1, colSpan: 1, visible: true },
  { id: 'item-table', label: 'Item Table', row: 3, col: 0, colSpan: 2, visible: true },
  { id: 'totals-summary', label: 'Totals Summary', row: 4, col: 0, colSpan: 2, visible: true },
  { id: 'terms', label: 'Terms & Conditions', row: 5, col: 0, colSpan: 2, visible: true },
  { id: 'signature', label: 'Signature Block', row: 6, col: 0, colSpan: 2, visible: true },
];

interface PODocData {
  po: PO;
  site?: Site;
  vendor?: Vendor;
  materials: Material[];
  userProfile: UserProfile;
  templateConfig: POTemplateConfig;
  layoutBlocks: LayoutBlock[];
}

function cur(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dateFmt(s: string): string {
  if (!s) return '';
  const d = new Date(s);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
}

function poNum(displayId: string, dateStr: string): string {
  if (displayId.includes('/')) return displayId;
  const yr = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
  const num = displayId.replace('PO-', '').padStart(4, '0');
  return `PO/${yr}/${num}`;
}

function mName(id: string, m: Material[]): string {
  return m.find(x => x.id.toString() === id)?.name || 'Unknown Material';
}

function mUnit(id: string, m: Material[]): string {
  return m.find(x => x.id.toString() === id)?.unit || '';
}

function getColumnValue(key: string, item: any, idx: number, materials: Material[]): string {
  const taxAmt = item.qty * item.rate;
  const taxPct = item.taxPercent || 0;
  const gstVal = taxAmt * (taxPct / 100);
  switch (key) {
    case 'itemNo': return String(idx + 1);
    case 'description': return mName(item.materialId, materials);
    case 'unit': return mUnit(item.materialId, materials);
    case 'qty': return String(item.qty);
    case 'rate': return cur(item.rate);
    case 'gst': return taxPct + '%';
    case 'amount': return cur(taxAmt);
    case 'hsn': return item.hsn || '';
    case 'taxableAmt': return cur(taxAmt);
    case 'sgst': return cur(gstVal / 2);
    case 'cgst': return cur(gstVal / 2);
    default: return '';
  }
}



function getColumnHeaderLabel(key: string, label: string): string {
  if (key === 'qty') return 'Qty';
  return label;
}

type FreightGstMode = 'include' | 'exclude';

function calculatePOTotals(po: PO, totalsConfig: POTemplateConfig['totals'], hasGst: boolean) {
  const materialSubtotal = po.items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const estimatedCartage = Number(po.estimatedCartage || po.freightAmount || 0);
  const otherCharges = Number(po.otherEstimatedCharges || 0);
  const subtotal = Number(po.subTotal || (materialSubtotal + estimatedCartage + otherCharges));
  const baseGst = Number(po.gstAmount || po.items.reduce((sum, item) => sum + (item.qty * item.rate * ((item.taxPercent || 0) / 100)), 0));
  const freightEnabled = !!totalsConfig?.enableFreight;
  const freightAmount = freightEnabled ? estimatedCartage : 0;
  const freightGstMode: FreightGstMode = (totalsConfig?.freightGstMode || po.freightGstMode || 'exclude') as FreightGstMode;
  const effectiveRate = subtotal > 0 ? (baseGst / subtotal) : 0;
  const freightGst = hasGst && freightEnabled && freightGstMode === 'include' ? freightAmount * effectiveRate : 0;
  const totalGst = hasGst ? (baseGst + freightGst) : 0;
  const grandTotal = Number(po.totalAmount || (subtotal + totalGst));
  const roundedTotal = Math.round(grandTotal);
  const roundOff = roundedTotal - grandTotal;
  const finalAmount = totalsConfig?.showRoundOff ? roundedTotal : grandTotal;

  return { materialSubtotal, estimatedCartage, otherCharges, subtotal, baseGst, freightAmount, freightGst, freightGstMode, totalGst, grandTotal, roundedTotal, roundOff, finalAmount };
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const toWords = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + toWords(n % 100) : '');
    if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + toWords(n % 100000) : '');
    return toWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + toWords(n % 10000000) : '');
  };

  const rupees = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - rupees) * 100);
  let result = 'Rupees ' + toWords(rupees);
  if (paise > 0) {
    result += ' and ' + toWords(paise) + ' Paise';
  }
  result += ' Only';
  return result;
}

function getOrderedBlocks(blocks: LayoutBlock[]): LayoutBlock[] {
  return [...blocks].filter(bl => bl.visible).sort((a, c) => {
    if (a.row !== c.row) return a.row - c.row;
    return a.col - c.col;
  });
}

function isVisible(blocks: LayoutBlock[], id: string): boolean {
  const bl = blocks.find(b => b.id === id);
  return bl ? bl.visible : true;
}


function getBillingDetails(po: PO, site?: Site, userProfile?: UserProfile, fallbackCompanyName?: string) {
  return {
    name: po.billingName || site?.projectName || site?.billingName || userProfile?.company || fallbackCompanyName || '',
    address: po.billTo || site?.billTo || site?.address || '',
  };
}

function getShippingDetails(po: PO, site?: Site) {
  return {
    name: po.shippingName || po.billingName || site?.billingName || site?.siteName || site?.name || '',
    address: po.shipTo || site?.shipTo || site?.address || '',
    location: site?.city || site?.location || '',
  };
}

export function generatePOPdf(data: PODocData) {
  const { po, site, vendor, materials, userProfile } = data;
  const tc = ensureTemplateDefaults(data.templateConfig);
  const totalsConfig = tc.totals!;
  const lb = data.layoutBlocks;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = 10;
  const W = pw - M * 2;
  let y = M;

  const NAVY: [number, number, number] = [0, 51, 102];
  const WHITE: [number, number, number] = [255, 255, 255];
  const LIGHT: [number, number, number] = [248, 249, 252];
  const BORDER: [number, number, number] = [180, 180, 180];
  const INVIS: [number, number, number] = [255, 255, 255];

  const BASE_COL_MM: Record<string, number> = {
    itemNo: 12, unit: 14, qty: 12, gst: 12,
    rate: 22, amount: 24,
    hsn: 16, taxableAmt: 22, sgst: 16, cgst: 16,
  };
  const MIN_DESC_WIDTH = 25;
  const visibleCols = tc.columns.filter(c => c.visible);
  const hasDesc = visibleCols.some(c => c.key === 'description');
  const fixedCols = visibleCols.filter(c => c.key !== 'description');
  const resolvedMM: Record<string, number> = {};
  fixedCols.forEach(c => { resolvedMM[c.key] = BASE_COL_MM[c.key] || 16; });
  let fixedTotal = fixedCols.reduce((s, c) => s + resolvedMM[c.key], 0);
  let descWidth = W - fixedTotal;

  if (hasDesc && descWidth < MIN_DESC_WIDTH) {
    const scale = (W - MIN_DESC_WIDTH) / fixedTotal;
    fixedTotal = 0;
    fixedCols.forEach(c => {
      resolvedMM[c.key] = Math.floor(resolvedMM[c.key] * scale * 100) / 100;
      fixedTotal += resolvedMM[c.key];
    });
    descWidth = W - fixedTotal;
  } else if (!hasDesc) {
    const scale = W / fixedTotal;
    fixedTotal = 0;
    fixedCols.forEach(c => {
      resolvedMM[c.key] = Math.floor(resolvedMM[c.key] * scale * 100) / 100;
      fixedTotal += resolvedMM[c.key];
    });
  }

  const colWidths: number[] = visibleCols.map(c =>
    c.key === 'description' ? descWidth : resolvedMM[c.key]
  );
  const remainder = W - colWidths.reduce((a, b) => a + b, 0);
  if (colWidths.length > 0) {
    const descIdx = visibleCols.findIndex(c => c.key === 'description');
    if (descIdx >= 0) {
      colWidths[descIdx] += remainder;
    } else {
      colWidths[colWidths.length - 1] += remainder;
    }
  }
  const columnStyles: Record<number, any> = {};
  visibleCols.forEach((c, i) => {
    columnStyles[i] = {
      cellWidth: c.key === 'qty' ? 12 : colWidths[i],
      halign: c.key === 'qty' ? 'center' : c.align as any,
    };
  });

  const HALF = W / 2;
  const PAD = 4;
  const L_X = M + PAD;
  const R_X = M + HALF + PAD;

  const sectionBar = (label: string) => {
    doc.setFillColor(...NAVY);
    doc.rect(M, y, W, 6.5, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(label, M + PAD, y + 4.5);
    y += 6.5;
  };

  const renderHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(M, y, W, 18, 'F');
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(tc.header.companyName, pw / 2, y + 10, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(tc.header.subtitle, pw / 2, y + 15, { align: 'center' });
    y += 18;

    if (tc.header.showContactDetails && tc.header.contactDetails) {
      doc.setFillColor(240, 242, 245);
      doc.rect(M, y, W, 6, 'F');
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text(tc.header.contactDetails, pw / 2, y + 4, { align: 'center' });
      y += 6;
    }

    doc.setFillColor(233, 236, 241);
    doc.rect(M, y, W, 9, 'F');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('PURCHASE ORDER', pw / 2, y + 6.5, { align: 'center' });
    y += 9;
  };

  const renderOrderDetails = () => {
    sectionBar(tc.sections.poDetailsTitle);

    const detailRows: any[][] = [];
    detailRows.push(['P.O. Number', poNum(po.displayId, po.date), 'Date', dateFmt(po.date)]);
    const row2L = (tc.visibility.deliveryDate && po.expectedDelivery) ? dateFmt(po.expectedDelivery) : '';
    const row2R = tc.visibility.poStatus ? (po.status || '') : '';
    if (row2L || row2R) {
      detailRows.push([
        row2L ? 'Delivery Date' : '', row2L,
        row2R ? 'Status' : '', row2R,
      ]);
    }

    const detLblStyle = { fontStyle: 'bold' as const, textColor: [60, 60, 60] as [number, number, number], fillColor: WHITE };
    const detValStyle = { textColor: [0, 0, 0] as [number, number, number], fillColor: WHITE };
    autoTable(doc, {
      startY: y,
      body: detailRows,
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: HALF * 0.3, halign: 'left', ...detLblStyle },
        1: { cellWidth: HALF * 0.7, halign: 'left', ...detValStyle },
        2: { cellWidth: HALF * 0.3, halign: 'left', ...detLblStyle },
        3: { cellWidth: HALF * 0.7, halign: 'left', ...detValStyle },
      },
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 2, bottom: 2, left: PAD, right: 2 },
        lineWidth: 0,
      },
      margin: { left: M, right: M },
      tableWidth: W,
    });
    y = (doc as any).lastAutoTable.finalY;

    sectionBar(tc.sections.vendorDetailsTitle);

    if (vendor) {
      const vendorRows: any[][] = [];
      const r1: any[] = ['Vendor Name', vendor.name];
      if (tc.visibility.vendorGst) { r1.push('GSTIN', vendor.gst || '\u2014'); } else { r1.push('', ''); }
      vendorRows.push(r1);

      const r2L = tc.visibility.vendorContact ? (vendor.contactPerson || '\u2014') : '';
      const r2R = tc.visibility.vendorPhone ? (vendor.phone || '\u2014') : '';
      if (r2L || r2R) {
        vendorRows.push([
          r2L ? 'Contact Person' : '', r2L,
          r2R ? 'Phone' : '', r2R,
        ]);
      }
      if (vendor.address) {
        vendorRows.push(['Address', vendor.address, '', '']);
      }
      if (tc.visibility.vendorEmail && vendor.email) {
        vendorRows.push(['Email', vendor.email, '', '']);
      }

      autoTable(doc, {
        startY: y,
        body: vendorRows,
        theme: 'plain',
        columnStyles: {
          0: { cellWidth: HALF * 0.3, halign: 'left', ...detLblStyle },
          1: { cellWidth: HALF * 0.7, halign: 'left', ...detValStyle },
          2: { cellWidth: HALF * 0.3, halign: 'left', ...detLblStyle },
          3: { cellWidth: HALF * 0.7, halign: 'left', ...detValStyle },
        },
        styles: {
          fontSize: 8.5,
          cellPadding: { top: 2, bottom: 2, left: PAD, right: 2 },
          lineWidth: 0,
        },
        margin: { left: M, right: M },
        tableWidth: W,
      });
      y = (doc as any).lastAutoTable.finalY;
    }
    y += 1;
  };

  const buildAddressLines = (name: string, addr: string, location?: string): string => {
    const parts: string[] = [];
    if (name) parts.push(name);
    if (addr) parts.push(addr);
    if (location) parts.push(location);
    return parts.join('\n');
  };

  const renderBillShipSideBySide = () => {
    const showBillTo = tc.visibility.billTo && isVisible(lb, 'bill-to');
    const showShipTo = tc.visibility.shipTo && isVisible(lb, 'ship-to');
    if (!showBillTo && !showShipTo) return;

    if (showBillTo && showShipTo) {
      doc.setFillColor(...NAVY);
      doc.rect(M, y, HALF, 6.5, 'F');
      doc.rect(M + HALF, y, HALF, 6.5, 'F');
      doc.setDrawColor(...WHITE);
      doc.setLineWidth(0.5);
      doc.line(M + HALF, y, M + HALF, y + 6.5);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text(tc.sections.billToTitle, L_X, y + 4.5);
      doc.text(tc.sections.shipToTitle, R_X, y + 4.5);
    } else {
      doc.setFillColor(...NAVY);
      doc.rect(M, y, W, 6.5, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text(showBillTo ? tc.sections.billToTitle : tc.sections.shipToTitle, L_X, y + 4.5);
    }
    y += 6.5;

    const billingDetails = getBillingDetails(po, site, userProfile, tc.header.companyName);
    const shippingDetails = getShippingDetails(po, site);
    const billContent = buildAddressLines(billingDetails.name, billingDetails.address);
    const shipContent = buildAddressLines(shippingDetails.name, shippingDetails.address, shippingDetails.location);

    const billCell = showBillTo ? billContent : '';
    const shipCell = showShipTo ? shipContent : '';

    if (showBillTo && showShipTo) {
      autoTable(doc, {
        startY: y,
        body: [[billCell, shipCell]],
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: HALF, halign: 'left' },
          1: { cellWidth: HALF, halign: 'left' },
        },
        styles: {
          fontSize: 8,
          textColor: [0, 0, 0],
          cellPadding: { top: 3, bottom: 3, left: PAD, right: PAD },
          lineColor: BORDER,
          lineWidth: 0.25,
          minCellHeight: 20,
        },
        margin: { left: M, right: M },
        tableWidth: W,
      });
    } else {
      autoTable(doc, {
        startY: y,
        body: [[showBillTo ? billCell : shipCell]],
        theme: 'grid',
        columnStyles: { 0: { cellWidth: W, halign: 'left' } },
        styles: {
          fontSize: 8,
          textColor: [0, 0, 0],
          cellPadding: { top: 3, bottom: 3, left: PAD, right: PAD },
          lineColor: BORDER,
          lineWidth: 0.25,
          minCellHeight: 20,
        },
        margin: { left: M, right: M },
        tableWidth: W,
      });
    }
    y = (doc as any).lastAutoTable.finalY + 2;
  };

  const renderBillToFull = () => {
    if (!tc.visibility.billTo) return;
    sectionBar(tc.sections.billToTitle);

    const billingDetails = getBillingDetails(po, site, userProfile, tc.header.companyName);
    const content = buildAddressLines(billingDetails.name, billingDetails.address);

    autoTable(doc, {
      startY: y,
      body: [[content]],
      theme: 'grid',
      columnStyles: { 0: { cellWidth: W, halign: 'left' } },
      styles: {
        fontSize: 8,
        textColor: [0, 0, 0],
        cellPadding: { top: 3, bottom: 3, left: PAD, right: PAD },
        lineColor: BORDER,
        lineWidth: 0.25,
        minCellHeight: 14,
      },
      margin: { left: M, right: M },
      tableWidth: W,
    });
    y = (doc as any).lastAutoTable.finalY + 2;
  };

  const renderShipToFull = () => {
    if (!tc.visibility.shipTo) return;
    sectionBar(tc.sections.shipToTitle);

    const shippingDetails = getShippingDetails(po, site);
    const content = buildAddressLines(shippingDetails.name, shippingDetails.address, shippingDetails.location);

    autoTable(doc, {
      startY: y,
      body: [[content]],
      theme: 'grid',
      columnStyles: { 0: { cellWidth: W, halign: 'left' } },
      styles: {
        fontSize: 8,
        textColor: [0, 0, 0],
        cellPadding: { top: 3, bottom: 3, left: PAD, right: PAD },
        lineColor: BORDER,
        lineWidth: 0.25,
        minCellHeight: 14,
      },
      margin: { left: M, right: M },
      tableWidth: W,
    });
    y = (doc as any).lastAutoTable.finalY + 2;
  };

  const renderItemsAndTotals = () => {
    const numCols = visibleCols.length;
    if (numCols === 0) return;

    const tableHead = [visibleCols.map(c => getColumnHeaderLabel(c.key, c.label))];

    const itemRows: any[][] = po.items.map((item, idx) =>
      visibleCols.map(c => getColumnValue(c.key, item, idx, materials))
    );

    const labelIdx = Math.max(numCols - 2, 0);
    const valueIdx = numCols - 1;
    const emptyCell = { content: '', styles: { fillColor: INVIS, lineColor: INVIS, lineWidth: 0 } };

    const makeTotRow = (
      label: string, value: string,
      isGrand: boolean = false
    ): any[] => {
      const bg = isGrand ? NAVY : LIGHT;
      const fg = isGrand ? WHITE : [30, 30, 30];
      const fs = isGrand ? 9.5 : 8.5;
      const row: any[] = [];
      for (let c = 0; c < numCols; c++) {
        if (c === labelIdx && labelIdx !== valueIdx) {
          row.push({
            content: label,
            styles: { halign: 'right' as const, fontStyle: 'bold' as const, fontSize: fs, fillColor: bg, textColor: fg, lineColor: isGrand ? INVIS : BORDER, lineWidth: isGrand ? 0 : 0.2 },
          });
        } else if (c === valueIdx) {
          const text = labelIdx === valueIdx ? `${label}: ${value}` : value;
          row.push({
            content: text,
            styles: { halign: 'right' as const, fontStyle: 'bold' as const, fontSize: fs, fillColor: bg, textColor: fg, lineColor: isGrand ? INVIS : BORDER, lineWidth: isGrand ? 0 : 0.2 },
          });
        } else {
          row.push({ ...emptyCell });
        }
      }
      return row;
    };

    const totRows: any[][] = [];

    const hasGst = tc.visibility.gst && po.items.some(i => (i.taxPercent || 0) > 0);
    const {
      materialSubtotal,
      estimatedCartage,
      otherCharges,
      freightAmount,
      freightGst,
      totalGst,
      roundOff,
      finalAmount,
    } = calculatePOTotals(po, totalsConfig, hasGst);

    if (totalsConfig.showSubtotal) {
      totRows.push(makeTotRow('Sub Total', cur(materialSubtotal)));
      totRows.push(makeTotRow('Est. Cartage/Freight', cur(estimatedCartage)));
      if (otherCharges > 0) totRows.push(makeTotRow('Other Charges', cur(otherCharges)));
    }

    if (freightAmount > 0 && !totalsConfig.showSubtotal) {
      totRows.push(makeTotRow('Freight / Cartage', cur(freightAmount)));
    }

    if (hasGst && totalsConfig.showGstBreakup) {
      const gstRates: Record<number, number> = {};
      po.items.forEach(i => {
        const rate = i.taxPercent || 0;
        if (rate > 0) gstRates[rate] = (gstRates[rate] || 0) + (i.qty * i.rate * (rate / 100));
      });
      Object.entries(gstRates).forEach(([rate, amt]) => {
        totRows.push(makeTotRow(`GST @ ${rate}%`, cur(Number(amt))));
      });
      if (freightGst > 0) {
        totRows.push(makeTotRow('GST on Freight', cur(freightGst)));
      }
    } else if (hasGst) {
      totRows.push(makeTotRow('GST', cur(totalGst)));
    }

    if (totalsConfig.showDiscount) {
      totRows.push(makeTotRow(totalsConfig.discountLabel || 'Discount', '\u2014'));
    }

    if (totalsConfig.showRoundOff && Math.abs(roundOff) > 0.001) {
      totRows.push(makeTotRow('Round Off', (roundOff >= 0 ? '+' : '') + cur(roundOff)));
    }

    totRows.push(makeTotRow('TOTAL AMOUNT', 'Rs. ' + cur(finalAmount), true));

    const allBody = [...itemRows, ...totRows];
    const itemCount = itemRows.length;

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: allBody,
      theme: 'grid',
      headStyles: {
        fillColor: NAVY,
        textColor: WHITE,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
        lineColor: WHITE,
        lineWidth: 0.3,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [20, 20, 20],
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
        valign: 'middle',
        lineColor: BORDER,
        lineWidth: 0.2,
      },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles,
      margin: { left: M, right: M },
      tableWidth: W,
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body' && hookData.row.index >= itemCount) {
          const cellData = allBody[hookData.row.index]?.[hookData.column.index];
          if (cellData && typeof cellData === 'object' && cellData.styles) {
            Object.assign(hookData.cell.styles, cellData.styles);
          }
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY;

    if (totalsConfig.showAmountInWords) {
      y += 2;
      doc.setFillColor(245, 247, 250);
      doc.rect(M, y, W, 7, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text('Amount in Words:', M + PAD, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      const wordsText = numberToWords(finalAmount);
      const maxW = W - 40;
      const truncated = doc.getTextWidth(wordsText) > maxW
        ? doc.splitTextToSize(wordsText, maxW)[0]
        : wordsText;
      doc.text(truncated, M + 34, y + 4.5);
      y += 7;
    }
  };

  const renderTerms = () => {
    if (tc.footer.terms.length === 0) return;
    y += 4;
    sectionBar(tc.sections.termsTitle);
    y += 4;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);

    tc.footer.terms.forEach((term, idx) => {
      if (y > ph - 42) { doc.addPage(); y = M + 5; }
      const num = `${idx + 1}.`;
      doc.setFont('helvetica', 'bold');
      doc.text(num, L_X, y);
      doc.setFont('helvetica', 'normal');
      const wrapped = doc.splitTextToSize(term, W - 14);
      wrapped.forEach((ln: string, li: number) => {
        if (y > ph - 42) { doc.addPage(); y = M + 5; }
        doc.text(ln, L_X + 6, y);
        if (li < wrapped.length - 1) y += 3.5;
      });
      y += 4.5;
    });
    y += 2;
  };

  const renderSignature = () => {
    if (!tc.footer.showSignature) return;
    if (y > ph - 40) { doc.addPage(); y = M + 5; }

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(M, y, M + W, y);
    y += 5;

    const sigL = M + 6;
    const sigR = M + HALF + 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(tc.footer.signatureLeftLabel, sigL, y);
    doc.text('For ' + (userProfile.company || tc.header.companyName), sigR, y);

    y += 16;

    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.line(sigL, y, sigL + 55, y);
    doc.line(sigR, y, sigR + 60, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.text(userProfile.name, sigL, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(tc.footer.signatureRightLabel, sigR, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.text(userProfile.role || 'Purchase Executive', sigL, y);

    if (tc.footer.showStampBlock ?? true) {
      doc.text(tc.footer.stampBlockLabel || '(Company Stamp & Signature)', sigR, y);
    }
  };

  const orderedBlocks = getOrderedBlocks(lb);

  const blockRenderers: Record<string, () => void> = {
    'header': renderHeader,
    'order-details': renderOrderDetails,
    'item-table': renderItemsAndTotals,
    'totals-summary': () => {},
    'terms': renderTerms,
    'signature': renderSignature,
  };

  let itemsAndTotalsRendered = false;

  let bi = 0;
  while (bi < orderedBlocks.length) {
    const block = orderedBlocks[bi];

    if (block.id === 'item-table' || block.id === 'totals-summary') {
      if (!itemsAndTotalsRendered) {
        renderItemsAndTotals();
        itemsAndTotalsRendered = true;
      }
      bi++;
      continue;
    }

    if ((block.id === 'bill-to' || block.id === 'ship-to') && block.colSpan === 1) {
      const nextBlock = orderedBlocks[bi + 1];
      if (nextBlock && (nextBlock.id === 'bill-to' || nextBlock.id === 'ship-to') && nextBlock.row === block.row && nextBlock.colSpan === 1) {
        renderBillShipSideBySide();
        bi += 2;
        continue;
      }
      if (block.id === 'bill-to') renderBillToFull();
      else renderShipToFull();
      bi++;
      continue;
    }

    if (block.id === 'bill-to') {
      if (block.colSpan === 2) {
        renderBillToFull();
      } else {
        renderBillShipSideBySide();
        const nextBlock = orderedBlocks[bi + 1];
        if (nextBlock && (nextBlock.id === 'ship-to' || nextBlock.id === 'bill-to') && nextBlock.row === block.row) bi++;
      }
      bi++;
      continue;
    }

    if (block.id === 'ship-to') {
      if (block.colSpan === 2) {
        renderShipToFull();
      } else {
        renderBillShipSideBySide();
        const nextBlock = orderedBlocks[bi + 1];
        if (nextBlock && (nextBlock.id === 'bill-to' || nextBlock.id === 'ship-to') && nextBlock.row === block.row) bi++;
      }
      bi++;
      continue;
    }

    const renderer = blockRenderers[block.id];
    if (renderer) renderer();
    bi++;
  }

  if (tc.footer.footerNote) {
    doc.setFillColor(...NAVY);
    doc.rect(M, ph - M - 5, W, 5, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...WHITE);
    doc.text(
      `${tc.footer.footerNote}  |  ${userProfile.company || tc.header.companyName}  |  ${userProfile.phone || ''}`,
      pw / 2, ph - M - 1.5, { align: 'center' }
    );
  }

  doc.save(`${po.displayId}.pdf`);
}

export function generatePOExcel(data: PODocData) {
  const { po, site, vendor, materials, userProfile } = data;
  const tc = ensureTemplateDefaults(data.templateConfig);
  const totalsConfig = tc.totals!;
  const wb = XLSX.utils.book_new();
  const hasGst = tc.visibility.gst && po.items.some(i => (i.taxPercent || 0) > 0);
  const visibleCols = tc.columns.filter(c => c.visible);

  const r: any[][] = [];

  r.push([]);
  r.push(['', '', '', tc.header.companyName, '', '', '']);
  r.push(['', '', '', tc.header.subtitle, '', '', '']);
  if (tc.header.showContactDetails && tc.header.contactDetails) {
    r.push(['', '', '', tc.header.contactDetails, '', '', '']);
  }
  r.push([]);
  r.push(['', '', '', 'PURCHASE ORDER', '', '', '']);
  r.push([]);

  r.push([tc.sections.poDetailsTitle]);
  r.push(['P.O. Number', poNum(po.displayId, po.date), '', 'Date', dateFmt(po.date)]);
  if (tc.visibility.deliveryDate && po.expectedDelivery) {
    r.push(['Delivery Date', dateFmt(po.expectedDelivery)]);
  }
  r.push([]);

  r.push([tc.sections.vendorDetailsTitle]);
  if (vendor) {
    r.push(['Vendor Name', vendor.name]);
    if (tc.visibility.vendorGst) r.push(['GSTIN', vendor.gst || '']);
    if (tc.visibility.vendorContact) r.push(['Contact Person', vendor.contactPerson || '']);
    if (tc.visibility.vendorPhone) r.push(['Phone', vendor.phone || '']);
    if (vendor.address) r.push(['Address', vendor.address]);
    if (tc.visibility.vendorEmail && vendor.email) r.push(['Email', vendor.email]);
  }
  r.push([]);

  if (tc.visibility.billTo) {
    const billingDetails = getBillingDetails(po, site, userProfile, tc.header.companyName);
    r.push([tc.sections.billToTitle]);
    if (tc.visibility.billingName && billingDetails.name) r.push([billingDetails.name]);
    if (billingDetails.address) r.push([billingDetails.address]);
    r.push([]);
  }

  if (tc.visibility.shipTo) {
    const shippingDetails = getShippingDetails(po, site);
    r.push([tc.sections.shipToTitle]);
    if (shippingDetails.name) r.push([shippingDetails.name]);
    if (shippingDetails.address) r.push([shippingDetails.address]);
    if (shippingDetails.location) r.push([shippingDetails.location]);
    r.push([]);
  }

  r.push(visibleCols.map(c => getColumnHeaderLabel(c.key, c.label).replace('\n', ' ')));
  po.items.forEach((item, idx) => {
    r.push(visibleCols.map(c => {
      const val = getColumnValue(c.key, item, idx, materials);
      if (['qty', 'rate', 'amount'].includes(c.key)) return Number(val.replace(/,/g, '')) || val;
      return val;
    }));
  });
  r.push([]);

  const {
    materialSubtotal,
    estimatedCartage,
    otherCharges,
    freightAmount,
    freightGst,
    totalGst,
    finalAmount,
  } = calculatePOTotals(po, totalsConfig, hasGst);

  if (totalsConfig.showSubtotal) {
    r.push(['', '', '', '', 'Sub Total', materialSubtotal]);
    r.push(['', '', '', '', 'Est. Cartage/Freight', estimatedCartage]);
    if (otherCharges > 0) r.push(['', '', '', '', 'Other Charges', otherCharges]);
  }
  if (freightAmount > 0 && !totalsConfig.showSubtotal) r.push(['', '', '', '', 'Freight / Cartage', freightAmount]);
  if (hasGst && totalsConfig.showGstBreakup) {
    const gstRates: Record<number, number> = {};
    po.items.forEach(i => {
      const rate = i.taxPercent || 0;
      if (rate > 0) gstRates[rate] = (gstRates[rate] || 0) + (i.qty * i.rate * (rate / 100));
    });
    Object.entries(gstRates).forEach(([rate, amt]) => {
      r.push(['', '', '', '', `GST @ ${rate}%`, amt]);
    });
    if (freightGst > 0) r.push(['', '', '', '', 'GST on Freight', freightGst]);
  } else if (hasGst) {
    r.push(['', '', '', '', 'GST', totalGst]);
  }
  r.push(['', '', '', '', 'TOTAL AMOUNT', finalAmount]);
  if (totalsConfig.showAmountInWords) {
    r.push([]);
    r.push(['Amount in Words:', numberToWords(finalAmount)]);
  }
  r.push([]);

  if (tc.footer.terms.length > 0) {
    r.push([tc.sections.termsTitle]);
    tc.footer.terms.forEach((term, idx) => {
      r.push([`${idx + 1}. ${term}`]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(r);
  XLSX.utils.book_append_sheet(wb, ws, 'Purchase Order');
  XLSX.writeFile(wb, `${po.displayId}.xlsx`);
}
