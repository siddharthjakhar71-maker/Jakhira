import type { POTemplateConfig } from './store';

export const DEFAULT_TEMPLATE_CONFIG: POTemplateConfig = {
  style: 'professional',
  header: {
    companyName: 'BILLIONAIRE HOMES',
    subtitle: 'Real Estate Development & Construction',
    contactDetails: '',
    showContactDetails: false,
    showLogo: false,
    logoUrl: '',
  },
  sections: {
    poDetailsTitle: 'PURCHASE ORDER DETAILS',
    vendorDetailsTitle: 'VENDOR DETAILS',
    billToTitle: 'BILL TO',
    shipToTitle: 'SHIP TO',
    termsTitle: 'PAYMENT TERMS & CONDITIONS',
  },
  columns: [
    { key: 'itemNo', label: 'Item\nNo.', visible: true, align: 'center' },
    { key: 'description', label: 'Description of Work / Material', visible: true, align: 'left' },
    { key: 'unit', label: 'Unit', visible: true, align: 'center' },
    { key: 'qty', label: 'Qty', visible: true, align: 'center' },
    { key: 'rate', label: 'Unit Price\n(Rs.)', visible: true, align: 'right' },
    { key: 'gst', label: 'GST %', visible: false, align: 'center' },
    { key: 'amount', label: 'Amount\n(Rs.)', visible: true, align: 'right' },
  ],
  visibility: {
    gst: true,
    billingName: true,
    shipTo: true,
    billTo: true,
    vendorGst: true,
    vendorContact: true,
    vendorPhone: true,
    vendorEmail: true,
    deliveryDate: true,
    poStatus: true,
  },
  totals: {
    showSubtotal: true,
    showGstBreakup: true,
    showDiscount: false,
    discountLabel: 'Discount',
    showRoundOff: false,
    showAmountInWords: true,
    enableFreight: false,
    freightGstMode: 'exclude',
  },
  footer: {
    terms: [
      'Payment Terms: As per mutual agreement. All payments are subject to TDS deduction as applicable under the Income Tax Act.',
      'Delivery: All materials shall be delivered at the site address mentioned above, within the agreed delivery schedule.',
      'Quality: All materials and workmanship must conform to relevant IS standards and pre-approved samples.',
      'Guarantee / Warranty: The vendor guarantees the quality of all supplied materials/work for a minimum period as per industry norms and applicable standards.',
      'Inspection: JAKHIRA reserves the right to inspect, test, and reject any materials or work that do not meet the specified quality standards.',
      'Validity: This Purchase Order is valid for 30 days from the date of issue, unless extended in writing.',
    ],
    showSignature: true,
    signatureLeftLabel: 'Prepared By:',
    signatureRightLabel: 'Authorized Signatory',
    footerNote: 'This is a system-generated Purchase Order',
    showStampBlock: true,
    stampBlockLabel: '(Company Stamp & Signature)',
    signatureImageUrl: '',
  },
};

export function ensureTemplateDefaults(config: POTemplateConfig): POTemplateConfig {
  return {
    ...config,
    header: {
      ...DEFAULT_TEMPLATE_CONFIG.header,
      ...config.header,
    },
    sections: {
      ...DEFAULT_TEMPLATE_CONFIG.sections,
      ...(config.sections || {}),
    },
    columns: config.columns && config.columns.length > 0 ? config.columns : DEFAULT_TEMPLATE_CONFIG.columns,
    visibility: {
      ...DEFAULT_TEMPLATE_CONFIG.visibility,
      ...(config.visibility || {}),
    },
    totals: {
      ...DEFAULT_TEMPLATE_CONFIG.totals!,
      ...(config.totals || {}),
    },
    footer: {
      ...DEFAULT_TEMPLATE_CONFIG.footer,
      ...config.footer,
    },
  };
}
