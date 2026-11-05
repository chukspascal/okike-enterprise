import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

PDF_PATH = "docs/OKIKE_AI_STRATEGY_BLUEPRINT.pdf"

# OKIKE Theme Colors
BRAND_YELLOW = colors.HexColor("#E0EB32")
BRAND_BLACK = colors.HexColor("#141416")
BRAND_CARD = colors.HexColor("#1E1E24")
BRAND_BORDER = colors.HexColor("#2C2C35")
BRAND_MUTED = colors.HexColor("#6C6C7A")
BRAND_TEXT = colors.HexColor("#F2F2F5")
BRAND_LIGHT_BG = colors.HexColor("#F8F9FA")
ACCENT_PURPLE = colors.HexColor("#9333EA")
ACCENT_GREEN = colors.HexColor("#10B981")
ACCENT_BLUE = colors.HexColor("#3B82F6")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(BRAND_MUTED)
            self.drawString(54, 750, "OKIKE ENTERPRISE // AUTONOMOUS AI MULTI-AGENT WORKFORCE & REVENUE STRATEGY")
            self.setStrokeColor(BRAND_BORDER)
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)

        # Footer (all pages)
        self.setFont("Helvetica", 8)
        self.setFillColor(BRAND_MUTED)
        self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY — OKIKE ENTERPRISES")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_text)
        self.setStrokeColor(BRAND_BORDER)
        self.setLineWidth(0.5)
        self.line(54, 46, 558, 46)
        
        self.restoreState()

def generate_pdf():
    os.makedirs(os.path.dirname(PDF_PATH), exist_ok=True)
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=BRAND_BLACK,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=BRAND_MUTED,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=BRAND_BLACK,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=BRAND_BLACK,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#2C2C35"),
        spaceAfter=8
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=14,
        textColor=BRAND_BLACK
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=BRAND_BLACK
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=BRAND_BLACK
    )

    story = []

    # --- COVER / HEADER BANNER ---
    banner_data = [
        [
            Paragraph("<font color='#E0EB32'><b>OKIKE</b></font> <font color='#FFFFFF'>ENTERPRISE PLATFORM</font>", ParagraphStyle('H', fontName='Helvetica-Bold', fontSize=13, textColor=colors.white)),
            Paragraph("<font color='#E0EB32'><b>CONFIDENTIAL STRATEGY</b></font>", ParagraphStyle('R', fontName='Helvetica', fontSize=9, alignment=2, textColor=BRAND_YELLOW))
        ]
    ]
    banner_table = Table(banner_data, colWidths=[300, 204])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_BLACK),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 15))

    story.append(Paragraph("Autonomous Multi-Agent AI Workforce & Platform Monetization Blueprint", title_style))
    story.append(Paragraph("A Comprehensive Strategic Blueprint for 24/7 AI-Powered Operations, High-Margin Revenue Engines, and Ecosystem Domination", subtitle_style))
    
    # Metadata Bar
    meta_data = [
        [
            Paragraph("<b>Author:</b> OKIKE Core Engineering", table_cell_style),
            Paragraph("<b>Target Horizon:</b> 2026 – 2027", table_cell_style),
            Paragraph("<b>Core Stack:</b> Supabase + OpenRouter + TanStack", table_cell_style),
            Paragraph("<b>Status:</b> Ready for Execution", table_cell_style),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[126, 126, 126, 126])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # --- SECTION 1: EXECUTIVE SUMMARY ---
    story.append(Paragraph("1. Executive Summary & Strategic Rationale", h1_style))
    story.append(Paragraph(
        "OKIKE operates uniquely at the intersection of a <b>high-ticket Software Studio</b>, a <b>rapidly growing Tech Academy</b>, and a <b>Global Market Intelligence Engine</b>. "
        "By transitioning from traditional static web features to an <b>Autonomous Multi-Agent Workforce (OKIKE Neural Fleet)</b>, OKIKE can automate client acquisition, deliver real-world curricula, continuously publish high-ranking technical content, and unlock recurring B2B SaaS revenue with near-zero marginal labor costs.",
        body_style
    ))
    story.append(Spacer(1, 10))

    # --- SECTION 2: THE 5 AUTONOMOUS AGENTS ---
    story.append(Paragraph("2. The OKIKE 24/7 Autonomous Agent Fleet", h1_style))
    story.append(Paragraph("Instead of a monolithic AI, OKIKE deploys 5 specialized, purpose-built autonomous agents coordinated through a unified Supabase neural memory database:", body_style))
    
    agents_data = [
        [
            Paragraph("Agent", table_header_style),
            Paragraph("Domain & Mission", table_header_style),
            Paragraph("Model Routing", table_header_style),
            Paragraph("Measurable Business Impact", table_header_style),
        ],
        [
            Paragraph("<b>Agent Atlas</b><br/><font color='#6C6C7A'>Market Scout</font>", table_cell_style),
            Paragraph("24/7 Global surveillance across GitHub, Hacker News, StackOverflow, and Dev.to.", table_cell_style),
            Paragraph("<b>GPT-4o-mini</b><br/>High-throughput, low cost", table_cell_style),
            Paragraph("Identifies top 1% validated SaaS opportunities & developer pain points.", table_cell_style),
        ],
        [
            Paragraph("<b>Agent Nexus</b><br/><font color='#6C6C7A'>Studio Closer</font>", table_cell_style),
            Paragraph("Instant client scoping on /book, interactive PRD generation, and proposal closing.", table_cell_style),
            Paragraph("<b>Claude 3.5 Sonnet</b><br/>Deep architectural reasoning", table_cell_style),
            Paragraph("Accelerates sales cycle from days to 10 seconds; captures upfront deposits.", table_cell_style),
        ],
        [
            Paragraph("<b>Agent Scribe</b><br/><font color='#6C6C7A'>Content Engine</font>", table_cell_style),
            Paragraph("Converts discovered developer pain points into weekly in-depth SEO technical guides.", table_cell_style),
            Paragraph("<b>Claude 3.5 / Gemini Flash</b><br/>Rich prose & technical depth", table_cell_style),
            Paragraph("Generates massive organic inbound traffic for studio clients & students.", table_cell_style),
        ],
        [
            Paragraph("<b>Agent Mentor</b><br/><font color='#6C6C7A'>Academy Tutor</font>", table_cell_style),
            Paragraph("Socratic coding guide in /sandbox, automatic PR grading, and live daily industry challenges.", table_cell_style),
            Paragraph("<b>DeepSeek Coder / 4o-mini</b><br/>AST code analysis & syntax", table_cell_style),
            Paragraph("Provides 24/7 student support; increases instructor leverage 10x.", table_cell_style),
        ],
        [
            Paragraph("<b>Agent Sentinel</b><br/><font color='#6C6C7A'>Security Auditor</font>", table_cell_style),
            Paragraph("Scans external client codebases for security vulnerabilities, SQL injection, and perf debt.", table_cell_style),
            Paragraph("<b>Claude 3.5 Sonnet</b><br/>Advanced vulnerability patterns", table_cell_style),
            Paragraph("Powers high-margin B2B code certifications (NGN 250k–1.5M per audit).", table_cell_style),
        ],
    ]
    
    agent_table = Table(agents_data, colWidths=[90, 160, 114, 140])
    agent_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLACK),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT_BG]),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(agent_table)
    story.append(Spacer(1, 15))

    # --- SECTION 3: DIRECT REVENUE ENGINES ---
    story.append(Paragraph("3. Direct Monetization & Cashflow Engines", h1_style))
    story.append(Paragraph("Three distinct monetization mechanisms designed for immediate revenue generation:", body_style))

    rev_data = [
        [
            Paragraph("Revenue Stream", table_header_style),
            Paragraph("Pricing & Model", table_header_style),
            Paragraph("Target Audience", table_header_style),
            Paragraph("Projected Yield", table_header_style),
        ],
        [
            Paragraph("<b>OKIKE Market Signals Pro</b><br/><font color='#6C6C7A'>B2B Intelligence SaaS</font>", table_cell_style),
            Paragraph("<b>$29 – $149 / month</b><br/>Tiered monthly subscription", table_cell_style),
            Paragraph("Startup Founders, Product Managers, Indie Hackers, Investors", table_cell_style),
            Paragraph("<b>$2,000 – $20,000 / mo MRR</b><br/>High margin (90%+)", table_cell_style),
        ],
        [
            Paragraph("<b>Instant AI Project Architect</b><br/><font color='#6C6C7A'>Studio Inbound Engine</font>", table_cell_style),
            Paragraph("<b>NGN 1.5M – 10M+ per contract</b><br/>NGN 100k / $500 upfront deposit", table_cell_style),
            Paragraph("Enterprise Clients, Startups, Non-technical Founders", table_cell_style),
            Paragraph("<b>NGN 15M – 50M / month</b><br/>High-ticket contracts", table_cell_style),
        ],
        [
            Paragraph("<b>AI Code Auditor & Certificate</b><br/><font color='#6C6C7A'>Security Micro-Service</font>", table_cell_style),
            Paragraph("<b>NGN 250k – 1.5M per audit</b><br/>$300 – $2,000 USD", table_cell_style),
            Paragraph("Pre-launch Startups, Fintechs, Companies seeking funding", table_cell_style),
            Paragraph("<b>NGN 3M – 10M / month</b><br/>Plus retainer upsells", table_cell_style),
        ],
    ]

    rev_table = Table(rev_data, colWidths=[130, 124, 125, 125])
    rev_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLACK),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT_BG]),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(rev_table)
    story.append(Spacer(1, 15))

    # --- SECTION 4: TECHNICAL ARCHITECTURE ---
    story.append(Paragraph("4. Technical Mesh & Coordination Architecture", h1_style))
    story.append(Paragraph(
        "All 5 autonomous agents operate on a unified, high-reliability architecture already deployed in production:",
        body_style
    ))

    tech_points = [
        "<b>Unified OpenRouter Gateway:</b> Single API key routing to Claude 3.5 Sonnet, GPT-4o, DeepSeek Coder, and Gemini Flash with intelligent fallbacks.",
        "<b>Supabase PostgreSQL Neural Memory:</b> Shared tables (<code>agent_learning_memory</code>, <code>scraped_issues</code>, <code>audit_logs</code>) persist feedback across serverless restarts.",
        "<b>Real-Time WebSocket Sync (CDC):</b> Postgres changes immediately push live updates to the Admin Command Center without page reloads.",
        "<b>Serverless & Cron Execution:</b> Triggered automatically via Vercel Cron Jobs and TanStack Start Server Functions with 0 server maintenance overhead."
    ]

    for p in tech_points:
        story.append(Paragraph(f"• {p}", body_style))

    story.append(Spacer(1, 10))

    # --- SECTION 5: PHASED EXECUTION ROADMAP ---
    story.append(Paragraph("5. Phased Implementation Roadmap", h1_style))
    
    phases_data = [
        [
            Paragraph("Phase", table_header_style),
            Paragraph("Core Deliverables", table_header_style),
            Paragraph("Timeline", table_header_style),
            Paragraph("Primary Metric", table_header_style),
        ],
        [
            Paragraph("<b>Phase 1</b><br/>Immediate Cashflow", table_cell_style),
            Paragraph("• Instant AI Project Architect & Deposit on /book<br/>• One-click PRD generator on Market Intelligence Drawer<br/>• Autonomous SEO blog drafts from top pain points", table_cell_style),
            Paragraph("Week 1 – 2", table_cell_style),
            Paragraph("Inbound Deposit Conversions & Client Contracts", table_cell_style),
        ],
        [
            Paragraph("<b>Phase 2</b><br/>SaaS & Academy", table_cell_style),
            Paragraph("• Public Gated OKIKE Market Signals Pro SaaS tier<br/>• Dynamic Daily Industry Labs in student portal<br/>• Socratic AI Code Mentor in /sandbox", table_cell_style),
            Paragraph("Week 3 – 4", table_cell_style),
            Paragraph("Recurring Monthly Subscriptions (MRR) & Student Retention", table_cell_style),
        ],
        [
            Paragraph("<b>Phase 3</b><br/>Enterprise Scale", table_cell_style),
            Paragraph("• Self-serve AI Code Auditor & Security Certification (/audit)<br/>• Automated GitHub PR reviewer for bootcamp students<br/>• Hiring partner talent matching portal", table_cell_style),
            Paragraph("Month 2", table_cell_style),
            Paragraph("Enterprise Audit Revenue & Placement Fees", table_cell_style),
        ],
    ]

    phases_table = Table(phases_data, colWidths=[90, 234, 75, 105])
    phases_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLACK),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT_BG]),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(phases_table)

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated executive PDF at: {PDF_PATH}")

if __name__ == "__main__":
    generate_pdf()
