#!/usr/bin/env python3
"""
Insert Appendix A.17–A.29 (inlined docs) into PRD.md after A.16.
Run from buffr-g2p/mobile (parent of docs/).
"""
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # mobile/
DOCS = os.path.join(BASE, "docs")
PRD_PATH = os.path.join(DOCS, "PRD.md")

def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def strip_main_title(text):
    """Remove first # title line if present."""
    lines = text.strip().split("\n")
    if lines and lines[0].startswith("# "):
        return "\n".join(lines[1:]).strip()
    return text

# Order: (appendix_id, source_path_relative_to_mobile, label for heading)
APPENDICES = [
    ("A.17", "docs/DESIGN_IMPLEMENTATION_AUDIT.md", "mobile/docs/DESIGN_IMPLEMENTATION_AUDIT.md"),
    ("A.18", "docs/DESIGN_QUICK_START.md", "mobile/docs/DESIGN_QUICK_START.md"),
    ("A.19", "docs/DESIGN_IMPLEMENTATION_INDEX.md", "mobile/docs/DESIGN_IMPLEMENTATION_INDEX.md"),
    ("A.20", "docs/UX_UI_DESIGN_GUIDE.md", "mobile/docs/UX_UI_DESIGN_GUIDE.md"),
    ("A.21", "docs/COMPONENT_PATTERNS_REFERENCE.md", "mobile/docs/COMPONENT_PATTERNS_REFERENCE.md"),
    ("A.22", "docs/FLOW_DECISION_TREE.md", "mobile/docs/FLOW_DECISION_TREE.md"),
    ("A.23", "docs/VISUAL_FLOW_REFERENCE.md", "mobile/docs/VISUAL_FLOW_REFERENCE.md"),
    ("A.24", "docs/TEST_SUITE.md", "mobile/docs/TEST_SUITE.md"),
    ("A.25", "docs/AI_ML_IMPLEMENTATION.md", "mobile/docs/AI_ML_IMPLEMENTATION.md"),
    ("A.26", "docs/IMPROVEMENTS_IMPLEMENTED.md", "mobile/docs/IMPROVEMENTS_IMPLEMENTED.md"),
    ("A.27", "docs/MAP_SETUP.md", "mobile/docs/MAP_SETUP.md"),
    ("A.28", "NETWORK_SETUP.md", "mobile/NETWORK_SETUP.md"),
]

def build_documentation_index():
    return """### A.29 Documentation Index

*Replaces former docs/README.md; all links point into this PRD.*

**Design & implementation**
- Design implementation audit → [Appendix A.17](#a17-mobiledocsdesign_implementation_auditmd)
- Design quick start → [Appendix A.18](#a18-mobiledocsdesign_quick_startmd)
- Design implementation index → [Appendix A.19](#a19-mobiledocsdesign_implementation_indexmd)
- UX/UI design guide → [Appendix A.20](#a20-mobiledocsux_ui_design_guidemd)
- Component patterns reference → [Appendix A.21](#a21-mobiledocscomponent_patterns_referencemd)
- Flow decision tree → [Appendix A.22](#a22-mobiledocsflow_decision_treemd)
- Visual flow reference → [Appendix A.23](#a23-mobiledocsvisual_flow_referencemd)

**Testing & implementation**
- Test suite → [Appendix A.24](#a24-mobiledocstest_suitemd)
- AI/ML implementation → [Appendix A.25](#a25-mobiledocsai_ml_implementationmd)
- Improvements implemented → [Appendix A.26](#a26-mobiledocsimprovements_implementedmd)

**Setup**
- Map setup (Agents) → [Appendix A.27](#a27-mobiledocsmap_setupmd)
- Network setup (backend URL) → [Appendix A.28](#a28-mobilenetwork_setupmd)

**Core spec**
- Full product spec → [Table of Contents](#table-of-contents) (§1–§21)
- Backend/API → [Appendix A.1](#a1-backendapi_auditmd)–[A.15](#a15-backenddocsemail_smtpmd)
"""

def main():
    os.chdir(BASE)
    prd = read(PRD_PATH)

    marker = "**Note:** This PRD is self-contained for all **in-repo** referenced docs (Appendices A.1–A.15). External and missing references above are listed for completeness and do not affect the ability to implement from this document alone.\n\n---\n\n## Appendix B:"

    if marker not in prd:
        raise SystemExit("Marker not found in PRD.md")

    new_note = "**Note:** This PRD is self-contained for all **in-repo** referenced docs (Appendices A.1–A.29). External and missing references above are listed for completeness and do not affect the ability to implement from this document alone."

    blocks = []
    for aid, rel_path, label in APPENDICES:
        full_path = os.path.join(BASE, rel_path)
        if not os.path.isfile(full_path):
            raise SystemExit(f"Missing file: {full_path}")
        body = read(full_path)
        body = strip_main_title(body)
        # Anchor-friendly heading: lowercase, spaces to underscores
        anchor = label.replace(" ", "_").replace("/", "").replace(".md", "").lower()
        blocks.append(
            f"### {aid} {label}\n\n"
            f"*Inlined from `{label}` for single source of truth.*\n\n"
            f"{body}"
        )

    blocks.append(build_documentation_index())

    insertion = "\n\n---\n\n".join(blocks)
    new_section = f"{new_note}\n\n---\n\n{insertion}\n\n---\n\n## Appendix B:"

    new_prd = prd.replace(marker, new_section)
    with open(PRD_PATH, "w", encoding="utf-8") as f:
        f.write(new_prd)
    print("PRD.md updated: A.17–A.29 appended.")

if __name__ == "__main__":
    main()
