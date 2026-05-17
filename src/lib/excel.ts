import ExcelJS from "exceljs";

import type { InvoiceJob } from "@/lib/invoice-types";

type SheetRow = Record<string, string | number | null>;

export async function buildWorkbookBuffer(job: InvoiceJob): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "invoice_demo";
  workbook.created = new Date();

  const summaryRows = [
    { 指标: "创建时间", 值: job.createdAt },
    { 指标: "来源", 值: job.sourceLabel },
    { 指标: "处理文件数", 值: job.summary.totalFiles },
    { 指标: "识别成功", 值: job.summary.recognizedCount },
    { 指标: "失败数", 值: job.summary.failureCount },
    { 指标: "疑似重复", 值: job.summary.duplicateCount },
    { 指标: "价税合计", 值: job.summary.totalAmount },
    { 指标: "税额合计", 值: job.summary.totalTax },
  ];
  const invoiceRows = job.records.map((record) => ({
    发票类型: record.invoiceType,
    发票号码: record.invoiceNumber,
    开票日期: record.invoiceDate,
    销售方名称: record.sellerName,
    购买方名称: record.buyerName,
    金额合计: record.amountExcludingTax,
    税额: record.taxAmount,
    价税合计: record.amountIncludingTax,
    备注或项目名称: record.remarkOrItem,
    文件名: record.fileName,
    校验码后6位: record.checkCodeLast6,
    纳税人识别号: record.taxpayerId,
    票据状态标签: record.statusLabel,
    重复票标记: record.duplicate ? "疑似重复" : "",
    异常提示: record.notes.join("；"),
  }));
  const failureRows = job.failures.map((failure) => ({
    文件名: failure.fileName,
    失败原因: failure.reason,
  }));

  appendSheet(workbook, "汇总", ["指标", "值"], summaryRows);
  appendSheet(
    workbook,
    "发票台账",
    [
      "发票类型",
      "发票号码",
      "开票日期",
      "销售方名称",
      "购买方名称",
      "金额合计",
      "税额",
      "价税合计",
      "备注或项目名称",
      "文件名",
      "校验码后6位",
      "纳税人识别号",
      "票据状态标签",
      "重复票标记",
      "异常提示",
    ],
    invoiceRows,
  );
  appendSheet(workbook, "失败文件", ["文件名", "失败原因"], failureRows);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function appendSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: SheetRow[],
): void {
  const worksheet = workbook.addWorksheet(name);
  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.max(14, header.length * 2 + 2),
  }));

  const safeRows = rows.length > 0 ? rows : [createEmptyRow(headers)];
  safeRows.forEach((row) => {
    worksheet.addRow(row);
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

function createEmptyRow(headers: string[]): SheetRow {
  return Object.fromEntries(headers.map((header) => [header, ""])) as SheetRow;
}