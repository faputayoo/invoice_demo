import { UploadWorkbench } from "@/components/upload-workbench";
import { getPublicRuntimeConfig } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  const { uploadAccessKeyEnabled } = getPublicRuntimeConfig();

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="eyebrow">批量上传</p>
        <h1 className="text-4xl sm:text-5xl">上传电子发票</h1>
        <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
          从邮箱、微信、企业微信或网盘收齐发票 PDF 后，直接在这里批量整理。文本层清晰的 PDF 会优先走规则提取；图片版 PDF 会自动启用 OCR 识别，但处理时间会更长。
        </p>
        {uploadAccessKeyEnabled ? (
          <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
            当前站点已开启上传口令。公开链接可先查看样例结果，真实文件需输入口令后才能开始处理。
          </p>
        ) : null}
      </section>

      <UploadWorkbench uploadAccessKeyRequired={uploadAccessKeyEnabled} />
    </div>
  );
}