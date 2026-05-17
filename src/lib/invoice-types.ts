export type JobMode = "upload" | "demo";

export type InvoiceStatusLabel = "识别成功" | "信息不完整";

export interface InvoiceRecord {
  id: string;
  fileName: string;
  invoiceType: string;
  invoiceNumber: string;
  invoiceDate: string;
  sellerName: string;
  buyerName: string;
  amountExcludingTax: number | null;
  taxAmount: number | null;
  amountIncludingTax: number | null;
  remarkOrItem: string;
  checkCodeLast6: string;
  taxpayerId: string;
  statusLabel: InvoiceStatusLabel;
  duplicate: boolean;
  duplicateReason: string;
  notes: string[];
}

export interface FailedInvoice {
  fileName: string;
  reason: string;
}

export interface InvoiceJobSummary {
  totalFiles: number;
  recognizedCount: number;
  successCount: number;
  partialCount: number;
  failureCount: number;
  duplicateCount: number;
  totalAmount: number;
  totalTax: number;
}

export interface InvoiceJob {
  jobId: string;
  createdAt: string;
  mode: JobMode;
  sourceLabel: string;
  records: InvoiceRecord[];
  failures: FailedInvoice[];
  summary: InvoiceJobSummary;
}

export type ParsedInvoiceOutcome =
  | {
      kind: "record";
      record: InvoiceRecord;
    }
  | {
      kind: "failure";
      failure: FailedInvoice;
    };