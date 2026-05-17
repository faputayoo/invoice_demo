import { createHash } from "node:crypto";

import type {
  FailedInvoice,
  InvoiceJobSummary,
  InvoiceRecord,
  ParsedInvoiceOutcome,
} from "@/lib/invoice-types";
import { extractPdfTextWithOcr } from "@/lib/invoice-ocr";
import { loadPdfParse } from "@/lib/pdf-parse-runtime";

const BUYER_SECTION_PATTERN = /购买方(?:信息)?|buyer(?: information)?/i;
const SELLER_SECTION_PATTERN = /销售方(?:信息)?|seller(?: information)?/i;
const RECORD_END_PATTERN =
  /备注|项目名称|货物或应税劳务、服务名称|收款人|复核|开票人|remark|item(?: name)?|$/i;
const OCR_NOTE = "通过 OCR 补救识别";
const HOTEL_VOUCHER_TYPE = "酒店报销凭证";

const REQUIRED_FIELDS: Array<keyof Pick<
  InvoiceRecord,
  | "invoiceType"
  | "invoiceNumber"
  | "invoiceDate"
  | "sellerName"
  | "buyerName"
  | "amountIncludingTax"
>> = [
  "invoiceType",
  "invoiceNumber",
  "invoiceDate",
  "sellerName",
  "buyerName",
  "amountIncludingTax",
];

const CURRENCY_PATTERN = "([0-9][0-9,]*\\.[0-9]{2})";
const FIELD_LABELS: Record<string, string> = {
  invoiceType: "发票类型",
  invoiceNumber: "发票号码",
  invoiceDate: "开票日期",
  sellerName: "销售方名称",
  buyerName: "购买方名称",
  amountIncludingTax: "价税合计",
};

export async function parseInvoiceFile(
  fileName: string,
  buffer: Buffer,
): Promise<ParsedInvoiceOutcome> {
  try {
    const text = await extractPdfText(buffer);
    const directAttempt = parseNormalizedText(fileName, normalizeText(text), {
      source: "text",
    });

    if (!directAttempt.shouldAttemptOcr) {
      return directAttempt.outcome;
    }

    const ocrAttempts = await extractPdfTextWithOcr(buffer);
    let lastFailureReason =
      directAttempt.outcome.kind === "failure"
        ? directAttempt.outcome.failure.reason
        : "OCR 补救仍未完成字段提取。";
    const ocrErrors: string[] = [];

    for (const ocrAttempt of ocrAttempts) {
      if (ocrAttempt.error) {
        ocrErrors.push(`${ocrAttempt.language}: ${ocrAttempt.error}`);
        continue;
      }

      const parsedAttempt = parseNormalizedText(
        fileName,
        normalizeText(ocrAttempt.text),
        {
          source: "ocr",
          ocrUsed: true,
        },
      );

      if (!parsedAttempt.shouldAttemptOcr) {
        return parsedAttempt.outcome;
      }

      if (parsedAttempt.outcome.kind === "failure") {
        lastFailureReason = parsedAttempt.outcome.failure.reason;
      }
    }

    return {
      kind: "failure",
      failure: {
        fileName,
        reason: buildOcrFailureReason(lastFailureReason, ocrErrors),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "解析失败";

    return {
      kind: "failure",
      failure: {
        fileName,
        reason: message,
      },
    };
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await loadPdfParse();
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

function parseNormalizedText(
  fileName: string,
  normalizedText: string,
  options: {
    source: "text" | "ocr";
    ocrUsed?: boolean;
  },
): {
  outcome: ParsedInvoiceOutcome;
  shouldAttemptOcr: boolean;
} {
  if (normalizedText.length < 40) {
    return {
      outcome: {
        kind: "failure",
        failure: {
          fileName,
          reason:
            options.source === "text"
              ? "未检测到足够的文本层。"
              : "OCR 补救后仍未识别到足够文本。",
        },
      },
      shouldAttemptOcr: true,
    };
  }

  const record = extractInvoiceRecord(fileName, normalizedText);
  const missingFields = REQUIRED_FIELDS.filter((fieldName) => !record[fieldName]);

  if (missingFields.length >= 4) {
    return {
      outcome: {
        kind: "failure",
        failure: {
          fileName,
          reason: `字段提取不足：${mapFieldLabels(missingFields).join("、")}`,
        },
      },
      shouldAttemptOcr: true,
    };
  }

  const notes = buildNotes(record, normalizedText);
  if (options.ocrUsed) {
    notes.unshift(OCR_NOTE);
  }

  return {
    outcome: {
      kind: "record",
      record: {
        ...record,
        statusLabel: missingFields.length === 0 ? "识别成功" : "信息不完整",
        notes,
      },
    },
    shouldAttemptOcr: false,
  };
}

export function applyDuplicateFlags(records: InvoiceRecord[]): InvoiceRecord[] {
  const duplicateBuckets = new Map<string, InvoiceRecord[]>();

  for (const record of records) {
    const primaryKey = record.invoiceNumber
      ? `invoice:${record.invoiceNumber}`
      : [
          record.invoiceDate,
          record.sellerName,
          record.buyerName,
          record.amountIncludingTax ?? "",
        ].join("|");

    const bucket = duplicateBuckets.get(primaryKey) ?? [];
    bucket.push(record);
    duplicateBuckets.set(primaryKey, bucket);
  }

  return records.map((record) => {
    const primaryKey = record.invoiceNumber
      ? `invoice:${record.invoiceNumber}`
      : [
          record.invoiceDate,
          record.sellerName,
          record.buyerName,
          record.amountIncludingTax ?? "",
        ].join("|");
    const isDuplicate = (duplicateBuckets.get(primaryKey)?.length ?? 0) > 1;

    return {
      ...record,
      duplicate: isDuplicate,
      duplicateReason: isDuplicate ? "发票号码或核心金额组合重复" : "",
    };
  });
}

export function buildJobSummary(
  records: InvoiceRecord[],
  failures: FailedInvoice[],
): InvoiceJobSummary {
  const successCount = records.filter(
    (record) => record.statusLabel === "识别成功",
  ).length;
  const duplicateCount = records.filter((record) => record.duplicate).length;
  const totalAmount = records.reduce(
    (total, record) => total + (record.amountIncludingTax ?? 0),
    0,
  );
  const totalTax = records.reduce(
    (total, record) => total + (record.taxAmount ?? 0),
    0,
  );

  return {
    totalFiles: records.length + failures.length,
    recognizedCount: records.length,
    successCount,
    partialCount: records.length - successCount,
    failureCount: failures.length,
    duplicateCount,
    totalAmount: roundAmount(totalAmount),
    totalTax: roundAmount(totalTax),
  };
}

function extractInvoiceRecord(fileName: string, text: string): InvoiceRecord {
  const isHotelVoucher = detectHotelVoucher(text);
  const buyerBlock = extractBlock(text, BUYER_SECTION_PATTERN, SELLER_SECTION_PATTERN);
  const sellerBlock = extractBlock(text, SELLER_SECTION_PATTERN, RECORD_END_PATTERN);
  const invoiceType = detectInvoiceType(text);
  const invoiceNumber =
    findFirst(text, [
      /发票号码[：:\s]*([0-9A-Z]{8,20})/i,
      /票据号码[：:\s]*([0-9A-Z]{8,20})/i,
      /(?:报销凭证号|凭证号|订单号|订单编号|预订编号|酒店订单号)[：:\s]*([0-9A-Z-]{6,30})/i,
      /(?:invoice\s*(?:number|no\.?|#))[：:\s]*([0-9A-Z-]{8,24})/i,
      /(?:order\s*(?:number|no\.?|#)|voucher\s*(?:number|no\.?|#))[：:\s]*([0-9A-Z-]{6,30})/i,
    ]) ?? "";
  const invoiceDate = normalizeDate(
    findFirst(text, [
      /开票日期[：:\s]*([0-9]{4}[年\-./][0-9]{1,2}[月\-./][0-9]{1,2}日?)/,
      /日期[：:\s]*([0-9]{4}[年\-./][0-9]{1,2}[月\-./][0-9]{1,2}日?)/,
      /(?:开具日期|出具日期|支付日期|成交日期|离店日期|入住日期)[：:\s]*([0-9]{4}[年\-./][0-9]{1,2}[月\-./][0-9]{1,2}日?)/,
      /(?:invoice\s*date|date)[：:\s]*([0-9]{4}[年\-./][0-9]{1,2}[月\-./][0-9]{1,2}日?)/i,
      /(?:issue\s*date|checkout\s*date|check-?in\s*date|payment\s*date)[：:\s]*([0-9]{4}[\-./][0-9]{1,2}[\-./][0-9]{1,2})/i,
    ]) ?? "",
  );
  const sellerName =
    findPartyName(sellerBlock) ??
    findFirst(text, [
      /销售方名称[：:\s]*([^\n]+)/,
      /(?:酒店名称|商户名称|入住酒店)[：:\s]*([^\n]+)/,
      /seller\s+name[：:\s]*([^\n]+)/i,
      /(?:hotel|merchant)\s+name[：:\s]*([^\n]+)/i,
    ]) ??
    "";
  const buyerName =
    findPartyName(buyerBlock) ??
    findFirst(text, [
      /购买方名称[：:\s]*([^\n]+)/,
      /(?:入住人|旅客姓名|预订人|入住姓名)[：:\s]*([^\n]+)/,
      /buyer\s+name[：:\s]*([^\n]+)/i,
      /(?:guest|traveler|booker)\s+name[：:\s]*([^\n]+)/i,
    ]) ??
    "";
  const amountIncludingTax =
    findAmount(text, [
      new RegExp(`价税合计(?:\\(小写\\))?[：:\\s]*[¥￥]?${CURRENCY_PATTERN}`),
      new RegExp(`小写[：:\\s]*[¥￥]?${CURRENCY_PATTERN}`),
      new RegExp(`(?:支付金额|实付金额|订单金额|订单总额|总金额|含税金额)[：:\\s]*[¥￥]?${CURRENCY_PATTERN}`),
      new RegExp(`(?:total amount|grand total|total)[：:\\s]*[$¥￥]?${CURRENCY_PATTERN}`, "i"),
      new RegExp(`(?:paid amount|amount paid|total paid)[：:\\s]*[$¥￥]?${CURRENCY_PATTERN}`, "i"),
    ]) ?? null;
  const taxAmount =
    findAmount(text, [
      new RegExp(`税额(?:合计)?[：:\\s]*[¥￥]?${CURRENCY_PATTERN}`),
      /税额[：:\s]*(免税|不征税)/,
      new RegExp(`tax(?: amount)?[：:\\s]*[$¥￥]?${CURRENCY_PATTERN}`, "i"),
    ]) ?? inferTaxAmount(text, amountIncludingTax);
  const amountExcludingTax =
    findAmount(text, [
      new RegExp(`金额合计[：:\\s]*[¥￥]?${CURRENCY_PATTERN}`),
      new RegExp(`合计金额[：:\\s]*[¥￥]?${CURRENCY_PATTERN}`),
      new RegExp(`(?:subtotal|amount|net amount)[：:\\s]*[$¥￥]?${CURRENCY_PATTERN}`, "i"),
    ]) ??
    inferAmountWithoutTax(amountIncludingTax, taxAmount) ??
    (isHotelVoucher ? amountIncludingTax : null);
  const remark =
    findFirst(text, [
      /备注[：:\s]*([^\n]+)/,
      /项目名称[：:\s]*([^\n]+)/,
      /(?:房型|房间类型|预订房型)[：:\s]*([^\n]+)/,
      /remark[：:\s]*([^\n]+)/i,
      /item(?: name)?[：:\s]*([^\n]+)/i,
    ]) ??
    findFirst(text, [/货物或应税劳务、服务名称[：:\s]*([^\n]+)/]) ??
    (isHotelVoucher ? buildHotelVoucherRemark(text) : null) ??
    findFirst(text, [/(\*[A-Za-z0-9\u4e00-\u9fa5\-()（）]{2,60}\*)/]) ??
    "";
  const checkCode =
    findFirst(text, [/校验码[：:\s]*([0-9\s]{6,30})/, /check\s+code[：:\s]*([0-9\s]{6,30})/i])
      ?.replace(/\s+/g, "")
      .slice(-6) ?? "";
  const taxpayerId =
    findFirst(buyerBlock, [
      /纳税人识别号[：:\s]*([0-9A-Z]{10,20})/i,
      /(?:taxpayer\s+id|tin)[：:\s]*([0-9A-Z]{10,20})/i,
    ]) ??
    findFirst(text, [
      /纳税人识别号[：:\s]*([0-9A-Z]{10,20})/i,
      /(?:taxpayer\s+id|tin)[：:\s]*([0-9A-Z]{10,20})/i,
    ]) ??
    "";

  return {
    id: createHash("sha1")
      .update(`${fileName}-${invoiceNumber}-${invoiceDate}-${amountIncludingTax ?? ""}`)
      .digest("hex")
      .slice(0, 12),
    fileName,
    invoiceType,
    invoiceNumber,
    invoiceDate,
    sellerName: cleanInlineValue(sellerName),
    buyerName: cleanInlineValue(buyerName),
    amountExcludingTax,
    taxAmount,
    amountIncludingTax,
    remarkOrItem: cleanInlineValue(remark),
    checkCodeLast6: checkCode,
    taxpayerId,
    statusLabel: "信息不完整",
    duplicate: false,
    duplicateReason: "",
    notes: [],
  };
}

function detectInvoiceType(text: string): string {
  if (detectHotelVoucher(text)) {
    return HOTEL_VOUCHER_TYPE;
  }

  if (/全面数字化电子发票|数电发票|数字化电子发票|digital invoice/i.test(text)) {
    return "数电票 PDF";
  }

  if (/电子发票|普通发票|electronic invoice|general invoice/i.test(text)) {
    return "普通电子发票 PDF";
  }

  return "未知类型";
}

function detectHotelVoucher(text: string): boolean {
  if (/酒店报销凭证|住宿报销凭证|hotel reimbursement voucher/i.test(text)) {
    return true;
  }

  return /(携程|ctrip)/i.test(text) && /(酒店|住宿|hotel)/i.test(text) && /(订单|报销|凭证|voucher)/i.test(text);
}

function findPartyName(blockText: string): string | null {
  return findFirst(blockText, [/名称[：:\s]*([^\n]+)/, /name[：:\s]*([^\n]+)/i]);
}

function extractBlock(
  text: string,
  startPattern: RegExp,
  endPattern: RegExp,
): string {
  const startMatch = startPattern.exec(text);
  if (startMatch?.index === undefined) {
    return "";
  }

  const slicedText = text.slice(startMatch.index);
  const endMatch = endPattern.exec(slicedText.slice(startMatch[0].length));

  if (endMatch?.index === undefined) {
    return slicedText.slice(0, 140);
  }

  return slicedText.slice(0, startMatch[0].length + endMatch.index);
}

function findFirst(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      return cleanInlineValue(match[1]);
    }
  }

  return null;
}

function findAmount(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match?.[1]) {
      continue;
    }

    if (match[1] === "免税" || match[1] === "不征税") {
      return 0;
    }

    const parsedValue = Number(match[1].replace(/,/g, ""));
    if (!Number.isNaN(parsedValue)) {
      return roundAmount(parsedValue);
    }
  }

  return null;
}

function inferTaxAmount(text: string, amountIncludingTax: number | null): number | null {
  if (amountIncludingTax === null) {
    return null;
  }

  const inferredAmount = text.match(
    new RegExp(
      `合计[\\s\\S]{0,20}[¥￥]?${CURRENCY_PATTERN}[\\s\\S]{0,12}[¥￥]?${CURRENCY_PATTERN}`,
    ),
  );

  const amounts = inferredAmount?.[0].match(/[0-9][0-9,]*\.[0-9]{2}/g);
  if (!amounts || amounts.length < 2) {
    return null;
  }

  const amountWithoutTax = Number(amounts[0].replace(/,/g, ""));
  const amountWithTax = Number(amounts[1].replace(/,/g, ""));
  if (Number.isNaN(amountWithoutTax) || Number.isNaN(amountWithTax)) {
    return null;
  }

  const candidate = amountWithTax === amountIncludingTax ? amountWithTax - amountWithoutTax : null;
  return candidate === null ? null : roundAmount(candidate);
}

function inferAmountWithoutTax(
  amountIncludingTax: number | null,
  taxAmount: number | null,
): number | null {
  if (amountIncludingTax === null || taxAmount === null) {
    return null;
  }

  return roundAmount(amountIncludingTax - taxAmount);
}

function buildNotes(record: InvoiceRecord, text: string): string[] {
  const notes: string[] = [];

  if (record.invoiceType === HOTEL_VOUCHER_TYPE) {
    notes.push("酒店报销凭证（非发票）");
  }

  for (const fieldName of REQUIRED_FIELDS) {
    if (!record[fieldName]) {
      notes.push(`缺少${FIELD_LABELS[fieldName]}`);
    }
  }

  if (!record.checkCodeLast6 && /(校验码|check code)/i.test(text)) {
    notes.push("校验码未完整提取");
  }

  if (!record.taxpayerId && /(纳税人识别号|taxpayer id|tin)/i.test(text)) {
    notes.push("纳税人识别号未完整提取");
  }

  return notes;
}

function normalizeText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/gu, "$1")
    .replace(/([\u4e00-\u9fffA-Za-z])\s+(?=[：:])/gu, "$1")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/[：:]\s+/g, "：")
    .trim();
}

function mapFieldLabels(fieldNames: Array<keyof typeof FIELD_LABELS>): string[] {
  return fieldNames.map((fieldName) => FIELD_LABELS[fieldName]);
}

function buildOcrFailureReason(baseReason: string, ocrErrors: string[]): string {
  const cleanedBaseReason = baseReason.replace(/[；。]+$/u, "");

  if (/OCR 补救/.test(cleanedBaseReason) && ocrErrors.length === 0) {
    return `${cleanedBaseReason}。`;
  }

  if (ocrErrors.length === 0) {
    return `${cleanedBaseReason}；已尝试 OCR 补救，但仍未识别到足够字段。`;
  }

  return `${cleanedBaseReason}；已尝试 OCR 补救，但仍失败：${ocrErrors.join("；")}`;
}

function buildHotelVoucherRemark(text: string): string | null {
  const hotelName = findFirst(text, [/酒店名称[：:\s]*([^\n]+)/, /hotel\s+name[：:\s]*([^\n]+)/i]);
  const roomType = findFirst(text, [/房型[：:\s]*([^\n]+)/, /房间类型[：:\s]*([^\n]+)/, /room\s+type[：:\s]*([^\n]+)/i]);
  const checkIn = normalizeDate(
    findFirst(text, [/入住日期[：:\s]*([0-9]{4}[年\-./][0-9]{1,2}[月\-./][0-9]{1,2}日?)/, /check-?in\s*date[：:\s]*([0-9]{4}[\-./][0-9]{1,2}[\-./][0-9]{1,2})/i]) ?? "",
  );
  const checkOut = normalizeDate(
    findFirst(text, [/离店日期[：:\s]*([0-9]{4}[年\-./][0-9]{1,2}[月\-./][0-9]{1,2}日?)/, /checkout\s*date[：:\s]*([0-9]{4}[\-./][0-9]{1,2}[\-./][0-9]{1,2})/i]) ?? "",
  );

  const parts = [hotelName, roomType, [checkIn, checkOut].filter(Boolean).join(" ~ ")].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : null;
}

function normalizeDate(rawValue: string): string {
  if (!rawValue) {
    return "";
  }

  const digits = rawValue.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
  if (!digits) {
    return rawValue;
  }

  const [, year, month, day] = digits;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function cleanInlineValue(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[：:]$/, "").trim();
}

function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}