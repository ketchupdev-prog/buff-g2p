# Converting Regulation & Compliance Resources to Markdown

This folder contains Bank of Namibia and fintech regulatory documents (PDF, DOCX, XLSX). To convert them to Markdown (for search, RAG, or consolidation), use **Docling** via the project script.

## Quick start

From the **repository root**:

```bash
# 1. Install dependencies (Python 3.10+)
pip install -r fintech/scripts/requirements-docling.txt

# 2. Run conversion (outputs .md next to each file, or into markdown/ subdir)
python fintech/scripts/convert_regulation_docs_to_markdown.py
```

To write all Markdown into a `markdown/` subfolder:

```bash
python fintech/scripts/convert_regulation_docs_to_markdown.py --output-subdir markdown
```

To skip files that already have a `.md` version:

```bash
python fintech/scripts/convert_regulation_docs_to_markdown.py --skip-existing
```

## What gets converted

- **PDF** – Docling with OCR and table extraction (e.g. PSD determinations, Acts, BoN frameworks).
- **DOCX** – Docling (e.g. BON Presentation Strategy.docx).
- **XLSX** – pandas → Markdown tables (e.g. Responsibility Matrix.xlsx).

## Output

- By default, each source file gets a sibling `.md` with the same base name (e.g. `PSD-3.pdf` → `PSD-3.md`).
- With `--output-subdir markdown`, files are written under `Regulation & Compliance Resources/markdown/`.

## Output location

Converted Markdown files are in:

**`fintech/Regulation & Compliance Resources/markdown/`**

Use these for search, RAG ingestion, or consolidating into the PRD. The script was run with `--output-subdir markdown` so all 22 sources (PDF, DOCX, XLSX) have a corresponding `.md` in that folder.

## Docling optional

If you see `Docling unavailable (tokenizers...)`, the script automatically uses **PyPDF2** and **docx2txt** for PDF/DOCX. For better tables and OCR, fix docling (e.g. `pip install 'tokenizers>=0.20,<0.21'`) and re-run.

## References

- Docling: https://github.com/DS4SD/docling  
- Script: `fintech/scripts/convert_regulation_docs_to_markdown.py`
