import io
import os
from datetime import datetime
from typing import Dict, Any, List
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

DEFAULT_TEMPLATE_PATH = "template.docx"

class ReportGeneratorService:
    def __init__(self, template_path: str = DEFAULT_TEMPLATE_PATH):
        self.template_path = template_path

    def generate_docx(self, study_name: str, address: str, buffer_meters: int, parcels: List[Dict[str, Any]], collected_data: Dict[str, Any]) -> io.BytesIO:
        if os.path.exists(self.template_path):
            doc = docx.Document(self.template_path)
        else:
            doc = docx.Document()

        # Styles & Colors
        title_color = RGBColor(34, 75, 45) # Deep Earth Green

        # Document Header
        title = doc.add_heading("SOIL'UP - RAPPORT DE PRÉ-DIAGNOSTIC DOCUMENTAIRE (SSP)", level=0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in title.runs:
            run.font.color.rgb = title_color
            run.font.size = Pt(18)
            run.font.bold = True

        p_subtitle = doc.add_paragraph("Étude historique préliminaire des risques environnementaux et pollutions des sols")
        p_subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        p_site = doc.add_paragraph()
        run_name = p_site.add_run(f"Site d'étude : {study_name}\n")
        run_name.bold = True
        run_name.font.size = Pt(12)
        p_site.add_run(f"Adresse : {address}\n")
        p_site.paragraph_format.space_after = Pt(20)

        # 1. Identification du site d'étude
        h1 = doc.add_heading("1. Fiche d'identification du site d'étude", level=1)
        for run in h1.runs:
            run.font.color.rgb = title_color

        meta_table = doc.add_table(rows=4, cols=2)
        meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        meta_table.style = "Table Grid"
        
        meta_data = [
            ("Nom / Référence du site", study_name),
            ("Adresse d'étude", address),
            ("Date d'analyse", datetime.now().strftime("%d/%m/%Y")),
            ("Buffer d'investigation retenu", f"{buffer_meters} m"),
        ]
        for i, (k, v) in enumerate(meta_data):
            cell_k = meta_table.cell(i, 0)
            cell_v = meta_table.cell(i, 1)
            cell_k.text = k
            cell_k.paragraphs[0].runs[0].font.bold = True
            cell_v.text = str(v)

        doc.add_paragraph().paragraph_format.space_after = Pt(15)

        # 2. Contexte Cadastral
        h2 = doc.add_heading("2. Assiette foncière et parcelles cadastrales", level=1)
        for run in h2.runs:
            run.font.color.rgb = title_color

        if parcels:
            p_table = doc.add_table(rows=1, cols=4)
            p_table.alignment = WD_TABLE_ALIGNMENT.CENTER
            p_table.style = "Table Grid"
            headers = ["Section", "Numéro", "Contenance (m²)", "Identifiant Parcelle (IDU)"]
            for col_idx, htext in enumerate(headers):
                cell = p_table.cell(0, col_idx)
                cell.text = htext
                cell.paragraphs[0].runs[0].font.bold = True

            for p in parcels:
                row_cells = p_table.add_row().cells
                row_cells[0].text = str(p.get("section", "-"))
                row_cells[1].text = str(p.get("numero", "-"))
                row_cells[2].text = str(p.get("contenance", "-"))
                row_cells[3].text = str(p.get("idu", "-"))
        else:
            doc.add_paragraph("Aucune parcelle cadastrale renseignée (emprise tracée librement).")

        doc.add_paragraph().paragraph_format.space_after = Pt(15)

        # 3. Contexte Historique Industriel (BASIAS / CASIAS)
        h3 = doc.add_heading("3. Inventaire historique des activités industrielles (BASIAS / CASIAS)", level=1)
        for run in h3.runs:
            run.font.color.rgb = title_color

        casias_list = collected_data.get("casias", [])
        if casias_list:
            c_table = doc.add_table(rows=1, cols=5)
            c_table.alignment = WD_TABLE_ALIGNMENT.CENTER
            c_table.style = "Table Grid"
            cheaders = ["Identifiant", "Nom de l'établissement", "Activité historique", "Statut", "Distance (m)"]
            for col_idx, htext in enumerate(cheaders):
                cell = c_table.cell(0, col_idx)
                cell.text = htext
                cell.paragraphs[0].runs[0].font.bold = True

            for item in casias_list:
                row_cells = c_table.add_row().cells
                row_cells[0].text = str(item.get("identifiant", "-"))
                row_cells[1].text = str(item.get("nom_etablissement", "-"))
                row_cells[2].text = str(item.get("activite_principale") or "Non précisée")
                row_cells[3].text = str(item.get("statut") or "-")
                dist = item.get("distance_meters", 0.0)
                row_cells[4].text = "Emprise directe" if dist == 0 else f"{dist} m"
        else:
            doc.add_paragraph(f"Aucune activité historique industrielle recensée dans le buffer de {buffer_meters} m.")

        doc.add_paragraph().paragraph_format.space_after = Pt(15)

        # 4. Installations Classées (ICPE)
        h4 = doc.add_heading("4. Installations Classées pour la Protection de l'Environnement (ICPE)", level=1)
        for run in h4.runs:
            run.font.color.rgb = title_color

        icpe_list = collected_data.get("icpe", [])
        if icpe_list:
            i_table = doc.add_table(rows=1, cols=4)
            i_table.alignment = WD_TABLE_ALIGNMENT.CENTER
            i_table.style = "Table Grid"
            iheaders = ["Code AIOT", "Raison Sociale", "Commune", "Distance (m)"]
            for col_idx, htext in enumerate(iheaders):
                cell = i_table.cell(0, col_idx)
                cell.text = htext
                cell.paragraphs[0].runs[0].font.bold = True

            for item in icpe_list:
                row_cells = i_table.add_row().cells
                row_cells[0].text = str(item.get("code_aiot", "-"))
                row_cells[1].text = str(item.get("raison_sociale", "-"))
                row_cells[2].text = str(item.get("commune", "-"))
                dist = item.get("distance_meters", 0.0)
                row_cells[3].text = "Emprise directe" if dist == 0 else f"{dist} m"
        else:
            doc.add_paragraph(f"Aucune installation classée (ICPE) recensée dans le buffer de {buffer_meters} m.")

        # Save to BytesIO
        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer
