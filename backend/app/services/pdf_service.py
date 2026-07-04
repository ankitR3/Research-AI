"""
PDF report generation.

Produces a single-page-style professional report matching the required
fields: company info, products/services, AI pain points, competitors.
"""

import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

BRAND_COLOR = colors.HexColor("#F5A623")  # amber accent, matches sample UI
DARK = colors.HexColor("#111111")


def generate_report_pdf(report: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        leftMargin=0.6 * inch, rightMargin=0.6 * inch,
    )
    styles = getSampleStyleSheet()

    eyebrow_style = ParagraphStyle(
        "eyebrow", parent=styles["Normal"], textColor=BRAND_COLOR,
        fontSize=9, fontName="Helvetica-Bold", spaceAfter=2,
    )
    title_style = ParagraphStyle(
        "title", parent=styles["Title"], fontSize=22, textColor=DARK,
        spaceAfter=14, fontName="Helvetica-Bold",
    )
    section_style = ParagraphStyle(
        "section", parent=styles["Heading2"], fontSize=11, textColor=BRAND_COLOR,
        spaceBefore=14, spaceAfter=6, fontName="Helvetica-Bold",
    )
    body_style = ParagraphStyle("body", parent=styles["Normal"], fontSize=10, leading=14)
    bullet_style = ParagraphStyle(
        "bullet", parent=body_style, leftIndent=14, spaceAfter=4,
    )

    story = []
    story.append(Paragraph("RELU CONSULTANCY &middot; COMPANY RESEARCH REPORT", eyebrow_style))
    story.append(Paragraph(report.get("company_name", "Unknown Company"), title_style))

    # --- Company Information ---
    story.append(Paragraph("COMPANY INFORMATION", section_style))
    info_rows = [
        ["Website", report.get("website") or "Not available"],
        ["Phone", report.get("phone") or "Not publicly listed"],
        ["Address", report.get("address") or "Not publicly listed"],
    ]
    info_table = Table(info_rows, colWidths=[1.2 * inch, 5 * inch])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.grey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(info_table)

    # --- Products & Services ---
    if report.get("products_services"):
        story.append(Paragraph("PRODUCTS &amp; SERVICES", section_style))
        for item in report["products_services"]:
            story.append(Paragraph(f"&bull; {item}", bullet_style))

    # --- AI Pain Points ---
    if report.get("pain_points"):
        story.append(Paragraph("AI-GENERATED PAIN POINTS", section_style))
        for point in report["pain_points"]:
            story.append(Paragraph(f"&bull; {point}", bullet_style))

    # --- Summary ---
    if report.get("summary"):
        story.append(Paragraph("SUMMARY", section_style))
        story.append(Paragraph(report["summary"], body_style))

    # --- Competitors ---
    if report.get("competitors"):
        story.append(Paragraph("COMPETITORS", section_style))
        comp_rows = [["Name", "Website"]]
        for c in report["competitors"]:
            comp_rows.append([c.get("name", "-"), c.get("website") or "-"])
        comp_table = Table(comp_rows, colWidths=[2.2 * inch, 4 * inch])
        comp_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9.5),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BACKGROUND", (0, 0), (-1, 0), DARK),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAFAFA")]),
        ]))
        story.append(comp_table)

    story.append(Spacer(1, 20))
    doc.build(story)
    buffer.seek(0)
    return buffer.read()
