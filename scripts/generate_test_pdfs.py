from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "test-pdfs"


SAMPLES = [
    {
        "mode": "text",
        "file_name": "数电票-餐饮.pdf",
        "lines": [
            "全面数字化电子发票",
            "",
            "发票号码：241001230045",
            "开票日期：2026年05月02日",
            "",
            "购买方信息",
            "名称：NINGBO TEST LLC",
            "纳税人识别号：91330201MA2AAAAA1X",
            "",
            "销售方信息",
            "名称：HANGZHOU CATERING CO LTD",
            "",
            "金额合计：188.68",
            "税额：11.32",
            "价税合计(小写)：200.00",
            "项目名称：*CATERING*WORK LUNCH",
            "校验码：593201 884422",
        ],
    },
    {
        "mode": "text",
        "file_name": "普票-办公用品.pdf",
        "lines": [
            "电子发票（普通发票）",
            "",
            "发票号码：240009876543",
            "开票日期：2026-05-08",
            "",
            "购买方信息",
            "名称：NINGBO OFFICE LLC",
            "纳税人识别号：91330201MA2AAAAA1X",
            "",
            "销售方信息",
            "名称：SHANGHAI OFFICE SUPPLY CO",
            "",
            "金额合计：450.00",
            "税额：22.50",
            "价税合计(小写)：472.50",
            "备注：*OFFICE*LABELS AND FOLDERS",
            "校验码：778899 401188",
        ],
    },
    {
        "mode": "text",
        "file_name": "普票-办公用品-重复.pdf",
        "lines": [
            "电子发票（普通发票）",
            "",
            "发票号码：240009876543",
            "开票日期：2026-05-08",
            "",
            "购买方信息",
            "名称：NINGBO OFFICE LLC",
            "纳税人识别号：91330201MA2AAAAA1X",
            "",
            "销售方信息",
            "名称：SHANGHAI OFFICE SUPPLY CO",
            "",
            "金额合计：450.00",
            "税额：22.50",
            "价税合计(小写)：472.50",
            "备注：*OFFICE*DUPLICATE SAMPLE",
            "校验码：778899 401188",
        ],
    },
    {
        "mode": "text",
        "file_name": "数电票-差旅-字段缺失.pdf",
        "lines": [
            "全面数字化电子发票",
            "",
            "开票日期：2026/05/11",
            "",
            "购买方信息",
            "纳税人识别号：91330201MA2AAAAA1X",
            "",
            "销售方信息",
            "名称：HZ STATION SERVICE CO",
            "",
            "税额：0.00",
            "价税合计(小写)：160.00",
            "项目名称：*TRAVEL*HIGH SPEED RAIL",
            "校验码：12 34",
        ],
    },
    {
        "mode": "text",
        "file_name": "携程-酒店报销凭证.pdf",
        "lines": [
            "携程酒店报销凭证",
            "",
            "订单号：HTLCTRIP20260516001",
            "出具日期：2026-05-16",
            "酒店名称：杭州西溪商务酒店",
            "入住人：张三",
            "入住日期：2026-05-12",
            "离店日期：2026-05-14",
            "房型：高级大床房",
            "支付金额：1280.00",
            "实付金额：1280.00",
            "备注：含双早",
        ],
    },
    {
        "mode": "image",
        "file_name": "图片版-OCR-普票.pdf",
        "lines": [
            "ELECTRONIC INVOICE (GENERAL)",
            "",
            "Invoice Number: OCR9988776655",
            "Invoice Date: 2026-05-13",
            "",
            "Buyer Information",
            "Name: OCR BUYER LLC",
            "Taxpayer ID: 91330201OCR123456",
            "",
            "Seller Information",
            "Name: OCR SELLER SERVICES LTD",
            "",
            "Amount: 99.00",
            "Tax: 5.94",
            "Total Amount: 104.94",
            "Remark: OCR IMAGE PDF SAMPLE",
            "Check Code: 889900 654321",
        ],
    },
    {
        "mode": "image",
        "file_name": "扫描件-示意-低文本.pdf",
        "lines": [
            "SCANNED PAGE",
        ],
    },
]


def pick_font_path() -> Path:
    candidates = [
        Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
        Path("/Library/Fonts/Arial Unicode.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("未找到 Arial Unicode.ttf")


def build_text_pdf(file_name: str, lines: list[str], font_name: str) -> None:
    path = OUTPUT_DIR / file_name
    c = canvas.Canvas(str(path), pagesize=A4)
    text = c.beginText(52, 800)
    text.setFont(font_name, 13)
    text.setLeading(22)
    for line in lines:
        text.textLine(line)
    c.drawText(text)
    c.save()


def build_image_pdf(file_name: str, lines: list[str], font_path: Path) -> None:
        path = OUTPUT_DIR / file_name
        image = Image.new("RGB", (1240, 1754), "white")
        draw = ImageDraw.Draw(image)
        font = ImageFont.truetype(str(font_path), 38)

        y = 90
        for line in lines:
            draw.text((80, y), line, font=font, fill="#111827")
            y += 54 if line else 28

        image_buffer = BytesIO()
        image.save(image_buffer, format="PNG")
        image_buffer.seek(0)

        c = canvas.Canvas(str(path), pagesize=A4)
        max_width = A4[0] - 72
        max_height = A4[1] - 72
        scale = min(max_width / image.width, max_height / image.height)
        render_width = image.width * scale
        render_height = image.height * scale
        x = (A4[0] - render_width) / 2
        y = A4[1] - 36 - render_height
        c.drawImage(
                ImageReader(image_buffer),
                x,
                y,
                width=render_width,
                height=render_height,
                preserveAspectRatio=True,
                mask="auto",
        )
        c.save()


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    font_path = pick_font_path()
    font_name = "ArialUnicode"
    pdfmetrics.registerFont(TTFont(font_name, str(font_path)))

    for sample in SAMPLES:
        if sample["mode"] == "image":
            build_image_pdf(sample["file_name"], sample["lines"], font_path)
        else:
            build_text_pdf(sample["file_name"], sample["lines"], font_name)
        print(sample["file_name"])


if __name__ == "__main__":
    main()