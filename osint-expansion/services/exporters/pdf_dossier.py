"""PDF dossier exporter using ReportLab."""
import io


def generate_pdf_dossier(target: str, data: dict) -> bytes:
    """Generate a printable binary PDF investigation dossier."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, 750, "TRACEMESH // INTEL DOSSIER REPORT")

        p.setFont("Helvetica", 11)
        p.drawString(50, 720, f"Target Identifier: {target}")
        p.drawString(50, 700, f"Generated At: {data.get('_meta', {}).get('completed_at', 'N/A')}")

        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, 660, "Executive Summary & Discovered Entities:")

        p.setFont("Helvetica", 10)
        y = 630
        for k, v in list(data.items())[:15]:
            if k == "_meta":
                continue
            line = f"• {k}: {str(v)[:80]}"
            p.drawString(60, y, line)
            y -= 20
            if y < 100:
                break

        p.showPage()
        p.save()
        buffer.seek(0)
        return buffer.getvalue()
    except Exception as e:
        return f"%PDF-1.4 Error generating PDF: {str(e)}".encode("utf-8")
