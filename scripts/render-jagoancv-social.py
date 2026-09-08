#!/usr/bin/env python3
"""Render the JagoanCV 1200x630 social card from deterministic vector primitives."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

WIDTH, HEIGHT = 1200, 630
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "app" / "assets" / "jagoancv-social.png"
FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

C = {
    "page": "#F3FAFD",
    "surface": "#FFFFFF",
    "powder": "#CFE9F1",
    "powder_deep": "#B8DCE7",
    "mint": "#DDF3E8",
    "lilac": "#EEEAF8",
    "blue": "#315D6B",
    "deep": "#244752",
    "ink": "#28444F",
    "muted": "#58717A",
    "line": "#D7E6EB",
    "green": "#397563",
    "coral": "#C86F55",
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def rounded(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def pill(draw: ImageDraw.ImageDraw, x, y, w, label, fill, outline, text_color):
    rounded(draw, (x, y, x + w, y + 42), 21, fill, outline)
    draw.text((x + w / 2, y + 21), label, font=font(15, True), fill=text_color, anchor="mm")


def render() -> None:
    image = Image.new("RGB", (WIDTH, HEIGHT), C["page"])
    draw = ImageDraw.Draw(image)

    draw.ellipse((840, -210, 1340, 290), fill=C["lilac"])
    draw.ellipse((-155, 388, 307, 850), fill=C["mint"])
    draw.ellipse((430, -110, 720, 180), fill="#E5F3F8")
    for x in range(120, WIDTH, 120):
        draw.line((x, 0, x, HEIGHT), fill="#E3EEF2", width=1)
    for y in range(105, HEIGHT, 105):
        draw.line((0, y, WIDTH, y), fill="#E3EEF2", width=1)

    # Brand lockup.
    rounded(draw, (72, 58, 184, 170), 27, C["powder"])
    draw.polygon(((146, 58), (184, 96), (184, 58)), fill=C["powder_deep"])
    draw.text((128, 108), "J", font=font(74, True), fill=C["deep"], anchor="mm")
    draw.line(((91, 135), (111, 153), (158, 106)), fill=C["green"], width=14, joint="curve")
    rounded(draw, (160, 143, 176, 159), 5, C["coral"])
    draw.text((210, 62), "JagoanCV", font=font(48, True), fill=C["deep"])
    draw.text((212, 120), "C V   A T S   G E N E R A T O R", font=font(16, True), fill=C["muted"])

    # Message and factual feature labels.
    draw.text((72, 214), "Tulis dengan arah.", font=font(54, True), fill=C["ink"])
    draw.text((72, 278), "Periksa sebelum dikirim.", font=font(38, True), fill=C["blue"])
    draw.text((74, 345), "CV + surat lamaran · gratis · local-first", font=font(22), fill=C["muted"])
    pill(draw, 72, 411, 122, "PREVIEW A4", C["surface"], "#BEDCE6", C["blue"])
    pill(draw, 206, 411, 196, "CEK TRANSPARAN", C["mint"], "#BDE4D3", C["green"])
    pill(draw, 414, 411, 178, "PDF BERBASIS TEKS", C["lilac"], "#D8D2EB", "#625F89")

    rounded(draw, (72, 493, 590, 559), 18, C["surface"], C["line"])
    draw.ellipse((93, 514, 119, 540), fill=C["mint"])
    draw.line(((100, 527), (105, 532), (114, 521)), fill=C["green"], width=3, joint="curve")
    draw.text((132, 507), "Data CV tetap di browser", font=font(16, True), fill=C["ink"])
    draw.text((132, 533), "Tanpa akun · Indonesia / English", font=font(13), fill=C["muted"])

    # Product panel shadow and shell.
    shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((688, 66, 1130, 580), radius=30, fill=(36, 71, 82, 42))
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    image.paste(shadow, (0, 0), shadow)
    draw = ImageDraw.Draw(image)
    rounded(draw, (688, 58, 1130, 572), 30, C["surface"], "#C6DDE5", 2)
    rounded(draw, (689, 59, 1129, 120), 28, "#F7FBFC")
    draw.rectangle((689, 90, 1129, 120), fill="#F7FBFC")
    for cx, color in ((718, "#EE9A7A"), (738, "#E8C36E"), (758, "#7FC5A9")):
        draw.ellipse((cx - 6, 83, cx + 6, 95), fill=color)
    rounded(draw, (820, 75, 996, 103), 14, "#EAF4F7")
    draw.text((908, 89), "JagoanCV · CV", font=font(12, True), fill=C["blue"], anchor="mm")

    # Fictional CV paper.
    rounded(draw, (710, 140, 966, 532), 14, C["surface"], C["line"])
    draw.text((734, 159), "Nadia Pratama", font=font(21, True), fill=C["deep"])
    draw.text((734, 190), "Cloud Engineer", font=font(12, True), fill=C["muted"])
    draw.rectangle((734, 216, 942, 218), fill=C["line"])
    draw.text((734, 235), "R I N G K A S A N", font=font(10, True), fill=C["blue"])
    for y, w in ((261, 204), (275, 183), (289, 196)):
        rounded(draw, (734, y, 734 + w, y + 6), 3, "#C5D7DD")
    draw.text((734, 313), "P E N G A L A M A N", font=font(10, True), fill=C["blue"])
    rounded(draw, (734, 340, 882, 347), 4, "#6B8791")
    for y, w in ((365, 185), (383, 165), (401, 178)):
        draw.ellipse((735, y - 3, 743, y + 5), fill=C["green"])
        rounded(draw, (752, y, 752 + w, y + 6), 3, "#C5D7DD")
    draw.text((734, 430), "K E T E R A M P I L A N", font=font(10, True), fill=C["blue"])
    rounded(draw, (734, 462, 796, 484), 11, "#E8F4F8")
    rounded(draw, (804, 462, 876, 484), 11, C["mint"])
    rounded(draw, (884, 462, 942, 484), 11, C["lilac"])

    # Transparent readiness and separate keyword examples.
    rounded(draw, (986, 140, 1108, 316), 18, C["powder"])
    draw.text((1001, 157), "C O N T O H", font=font(9, True), fill=C["blue"])
    draw.text((1001, 174), "K E S I A P A N", font=font(9, True), fill=C["blue"])
    draw.text((1001, 207), "84", font=font(44, True), fill=C["deep"])
    draw.text((1061, 230), "/100", font=font(13, True), fill=C["muted"])
    rounded(draw, (1001, 247, 1093, 255), 4, "#AFCFD9")
    rounded(draw, (1001, 247, 1078, 255), 4, C["blue"])
    draw.text((1001, 268), "Panduan transparan", font=font(10, True), fill=C["blue"])
    draw.text((1001, 290), "bukan skor vendor", font=font(9), fill=C["muted"])

    rounded(draw, (986, 334, 1108, 438), 18, C["mint"])
    draw.text((1001, 351), "K E Y W O R D", font=font(9, True), fill=C["green"])
    draw.text((1001, 378), "7 / 9", font=font(29, True), fill="#28594B")
    draw.text((1001, 416), "dihitung terpisah", font=font(9), fill="#58796E")

    rounded(draw, (986, 455, 1108, 509), 18, C["lilac"])
    draw.ellipse((1000, 475, 1014, 489), fill=C["green"])
    draw.text((1021, 468), "Tersimpan", font=font(10, True), fill="#49466D")
    draw.text((1021, 486), "secara lokal", font=font(9), fill="#6A6788")

    draw.rounded_rectangle((72, 588, 1128, 592), radius=2, fill=C["blue"])
    draw.rounded_rectangle((544, 588, 734, 592), radius=2, fill=C["green"])
    draw.rounded_rectangle((734, 588, 826, 592), radius=2, fill=C["coral"])

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT, format="PNG", optimize=True)
    print(f"Rendered {OUTPUT} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    render()
