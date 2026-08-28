"""PDF Dossier Generator - printable investigation reports."""
import json
from datetime import datetime
from typing import Optional

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


class PDFDossierExporter:

    @staticmethod
    def available() -> bool:
        return HAS_REPORTLAB

    @staticmethod
    def generate(target: str, target_type: str, results: dict, output_path: str) -> Optional[str]:
        if not HAS_REPORTLAB:
            return None
        doc = SimpleDocTemplate(output_path, pagesize=A4, title=f"TraceMesh Dossier - {target}", author="TraceMesh OSINT Platform")
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle("DossierTitle", parent=styles["Heading1"], fontSize=20, spaceAfter=20, textColor=colors.HexColor("#0a2463"))
        subtitle_style = ParagraphStyle("DossierSub", parent=styles["Heading2"], fontSize=14, spaceAfter=10, textColor=colors.HexColor("#1e90ff"))
        elements = []
        elements.append(Paragraph(f"TraceMesh Investigation Dossier", title_style))
        elements.append(Paragraph(f"Target: {target}", styles["Heading2"]))
        elements.append(Paragraph(f"Type: {target_type.upper()}", styles["Normal"]))
        elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}", styles["Normal"]))
        elements.append(Spacer(1, 12))
        elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#0a2463")))
        elements.append(Spacer(1, 12))

        def _add_section(title: str, data: dict):
            elements.append(Paragraph(title, subtitle_style))
            if not data or not isinstance(data, dict):
                elements.append(Paragraph("No data available.", styles["Normal"]))
                elements.append(Spacer(1, 8))
                return
            rows = [["Field", "Value"]]
            for key, value in data.items():
                if isinstance(value, list):
                    val_str = ", ".join(str(v)[:80] for v in value[:10])
                    if len(value) > 10:
                        val_str += f" ... (+{len(value)-10} more)"
                elif isinstance(value, dict):
                    val_str = json.dumps(value, default=str)[:200]
                elif value is None:
                    val_str = "N/A"
                else:
                    val_str = str(value)[:200]
                rows.append([str(key), val_str])
            if len(rows) > 1:
                col_widths = [doc.width * 0.3, doc.width * 0.7]
                table = Table(rows, colWidths=col_widths, repeatRows=1)
                table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0a2463")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("FONTSIZE", (0, 1), (-1, -1), 8),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f8ff")]),
                ]))
                elements.append(table)
            else:
                elements.append(Paragraph("No structured data.", styles["Normal"]))
            elements.append(Spacer(1, 12))

        if target_type == "email":
            _add_section("Email Verification (Hunter.io)", results.get("hunter", {}))
            _add_section("Email Reputation (EmailRep)", results.get("emailrep", {}))
            _add_section("Breach Data (HIBP)", results.get("hibp", {}))
            _add_section("Breach Search (Dehashed)", results.get("dehashed", {}))
            _add_section("Dark Web (IntelX)", results.get("intelx", {}))
        elif target_type == "domain":
            _add_section("DNS History (SecurityTrails)", results.get("securitytrails", {}))
            _add_section("Web Scan (URLScan)", results.get("urlscan", {}))
            _add_section("Technology Stack (BuiltWith)", results.get("builtwith", {}))
            _add_section("Reputation (VirusTotal)", results.get("virustotal", {}))
            _add_section("Threat Feeds (URLhaus)", results.get("urlhaus", {}))
            _add_section("Phishing (OpenPhish)", results.get("openphish", {}))
        elif target_type == "ip":
            _add_section("IP Reputation (VirusTotal)", results.get("virustotal", {}))
            _add_section("Noise Analysis (GreyNoise)", results.get("greynoise", {}))
            _add_section("Port Scan & Services (Shodan)", results.get("shodan", {}))
            _add_section("Host Discovery (Censys)", results.get("censys", {}))
        else:
            for k, v in results.items():
                if isinstance(v, dict):
                    _add_section(k.capitalize(), v)

        doc.build(elements)
        return output_path
