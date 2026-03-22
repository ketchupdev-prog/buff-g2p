#!/usr/bin/env python3
"""
Convert Regulation & Compliance Resources (PDF, DOCX, XLSX) to Markdown using Docling.

Purpose: Batch-convert Bank of Namibia and fintech regulatory documents to .md for
search, RAG, and consolidation. Uses docling for layout-aware extraction (tables, OCR).

Location: fintech/scripts/convert_regulation_docs_to_markdown.py
Run from repo root: python fintech/scripts/convert_regulation_docs_to_markdown.py
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def sanitize_unicode_for_md(text: str) -> str:
    """Remove invalid Unicode surrogates so markdown can be written as UTF-8."""
    return "".join(c for c in text if not (0xD800 <= ord(c) <= 0xDFFF))

# Default source folder (relative to repo root or cwd)
DEFAULT_SOURCE = "Regulation & Compliance Resources"
DEFAULT_OUTPUT_SUBDIR = "markdown"  # optional: write .md into this subdir


def get_docling_converter():
    """Build DocumentConverter with PDF OCR and table extraction."""
    from docling.document_converter import DocumentConverter
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions

    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = True
    pipeline_options.do_table_structure = True
    pipeline_options.table_mode = "fast"
    return DocumentConverter(
        format_options={
            InputFormat.PDF: pipeline_options,
            InputFormat.DOCX: PdfPipelineOptions(),
        }
    )


def convert_with_docling(filepath: Path, converter) -> str | None:
    """Convert a single file with docling; return markdown or None on failure."""
    try:
        result = converter.convert(str(filepath))
        doc = result.document
        return doc.export_to_markdown() or ""
    except Exception as e:
        print(f"   ⚠️  Docling failed for {filepath.name}: {e}", file=sys.stderr)
        return None


def convert_pdf_fallback(filepath: Path) -> str | None:
    """Fallback: extract text from PDF with PyPDF2 (no OCR/tables)."""
    try:
        import PyPDF2
        with open(filepath, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            text = "\n\n".join(
                (p.extract_text() or "").strip() for p in reader.pages
            ).strip()
        return f"# {filepath.stem}\n\n{text}" if text else None
    except Exception as e:
        print(f"   ⚠️  PyPDF2 fallback failed for {filepath.name}: {e}", file=sys.stderr)
        return None


def convert_docx_fallback(filepath: Path) -> str | None:
    """Fallback: extract text from DOCX with docx2txt."""
    try:
        import docx2txt
        text = (docx2txt.process(str(filepath)) or "").strip()
        return f"# {filepath.stem}\n\n{text}" if text else None
    except Exception as e:
        print(f"   ⚠️  docx2txt fallback failed for {filepath.name}: {e}", file=sys.stderr)
        return None


def convert_xlsx_to_markdown(filepath: Path) -> str | None:
    """Convert XLSX to markdown tables using pandas (no docling for spreadsheets)."""
    try:
        import pandas as pd
        xl = pd.ExcelFile(filepath)
        parts = [f"# {filepath.name}\n"]
        for sheet in xl.sheet_names:
            df = pd.read_excel(xl, sheet_name=sheet)
            parts.append(f"\n## Sheet: {sheet}\n\n")
            parts.append(df.to_markdown(index=False) if hasattr(df, "to_markdown") else df.to_string())
            parts.append("\n")
        return "\n".join(parts)
    except ImportError:
        print("   ⚠️  pandas/tabulate not installed; pip install pandas tabulate", file=sys.stderr)
        return None
    except Exception as e:
        print(f"   ⚠️  XLSX conversion failed for {filepath.name}: {e}", file=sys.stderr)
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert Regulation & Compliance docs to Markdown (docling)")
    parser.add_argument(
        "--source",
        default=DEFAULT_SOURCE,
        help=f"Source folder containing PDF/DOCX/XLSX (default: {DEFAULT_SOURCE})",
    )
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Output directory for .md files (default: same as source, or source/markdown with --output-subdir)",
    )
    parser.add_argument(
        "--output-subdir",
        default="",
        help=f"If set (e.g. '{DEFAULT_OUTPUT_SUBDIR}'), write .md into source/<subdir>/",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip converting if .md already exists",
    )
    args = parser.parse_args()

    # Resolve source: cwd or repo root
    source = Path(args.source)
    if not source.is_absolute():
        source = Path.cwd() / source
    if not source.exists():
        # Try fintech/Regulation & Compliance Resources from repo root
        fintech_source = Path(__file__).resolve().parent.parent / DEFAULT_SOURCE
        if fintech_source.exists():
            source = fintech_source
        else:
            print(f"Source folder not found: {source}", file=sys.stderr)
            return 1

    if args.output_dir:
        out_base = Path(args.output_dir)
        out_base.mkdir(parents=True, exist_ok=True)
    elif args.output_subdir:
        out_base = source / args.output_subdir
        out_base.mkdir(parents=True, exist_ok=True)
    else:
        out_base = source

    # Supported extensions
    docling_extensions = {".pdf", ".docx", ".doc"}
    xlsx_extensions = {".xlsx", ".xls"}
    all_extensions = docling_extensions | xlsx_extensions

    files = [f for f in source.iterdir() if f.is_file() and f.suffix.lower() in all_extensions]
    if not files:
        print(f"No PDF/DOCX/XLSX files found in {source}", file=sys.stderr)
        return 0

    # Docling converter once (PDF/DOCX); optional fallback if docling missing/broken
    converter = None
    try:
        converter = get_docling_converter()
    except Exception as e:
        print(f"Docling unavailable ({e}). Using PyPDF2/docx2txt fallback for PDF/DOCX.", file=sys.stderr)

    converted = 0
    for filepath in sorted(files):
        out_name = filepath.stem + ".md"
        out_path = out_base / out_name
        if args.skip_existing and out_path.exists():
            print(f"Skip (exists): {out_name}")
            continue

        ext = filepath.suffix.lower()
        if ext in xlsx_extensions:
            md = convert_xlsx_to_markdown(filepath)
        elif ext in docling_extensions:
            if converter:
                md = convert_with_docling(filepath, converter)
                if not md and ext == ".pdf":
                    md = convert_pdf_fallback(filepath)
                elif not md and ext in (".docx", ".doc"):
                    md = convert_docx_fallback(filepath)
            else:
                md = convert_pdf_fallback(filepath) if ext == ".pdf" else convert_docx_fallback(filepath)
        else:
            md = None

        if md:
            md = sanitize_unicode_for_md(md)
            out_path.write_text(md, encoding="utf-8")
            print(f"OK: {filepath.name} -> {out_path}")
            converted += 1

    print(f"\nConverted {converted} file(s) to Markdown in {out_base}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
