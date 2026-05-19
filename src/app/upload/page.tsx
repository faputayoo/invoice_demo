import { UploadWorkbench } from "@/components/upload-workbench";
import { getPublicRuntimeConfig } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

const supportedUploadTypes = [
  "数电票 PDF",
  "普通电子发票 PDF",
  "部分酒店报销凭证 / 住宿报销凭证 PDF",
  "清晰的图片版 PDF（会自动尝试 OCR）",
];

const unsupportedUploadTypes = [
  "JPG / PNG / HEIC 图片",
  "手写票据或严重模糊、遮挡的扫描件",
  "海外 invoice 或自定义排版模板",
  "无法读取到主要票面信息的加密或损坏 PDF",
];

const uploadTips = [
  "尽量一份 PDF 对应一张票据或一笔凭证",
  "票面保持正向、完整、无遮挡",
  "文字越清晰，字段提取越稳定",
];

export default function UploadPage() {
  const { uploadAccessKeyEnabled } = getPublicRuntimeConfig();

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="eyebrow">批量上传</p>
        <h1 className="text-4xl sm:text-5xl">上传电子发票</h1>
        <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
          从邮箱、微信、企业微信或网盘收齐发票 PDF 后，直接在这里批量整理。当前更适合上传数电票、普通电子发票、部分酒店报销凭证，以及清晰的图片版 PDF。
        </p>
        {uploadAccessKeyEnabled ? (
          <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
            当前站点已开启上传口令。公开链接可先查看样例结果，真实文件需输入口令后才能开始处理。
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card rounded-[1.75rem] p-6">
          <p className="eyebrow">当前适合上传</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
            {supportedUploadTypes.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="surface-card rounded-[1.75rem] p-6">
          <p className="eyebrow">暂不支持</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
            {unsupportedUploadTypes.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="surface-card rounded-[1.75rem] p-6">
          <p className="eyebrow">提高成功率</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
            {uploadTips.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </section>

      <UploadWorkbench uploadAccessKeyRequired={uploadAccessKeyEnabled} />
    </div>
  );
}