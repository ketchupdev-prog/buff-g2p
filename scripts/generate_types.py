#!/usr/bin/env python3
"""
Type Generation Script for SmartPay
Generates TypeScript types and Python Pydantic models from JSON Schema definitions.

Usage:
    python scripts/generate_types.py
    
This script:
1. Reads JSON Schema files from packages/shared-types/json/
2. Generates TypeScript type definitions
3. Generates Python Pydantic models
4. Ensures single source of truth for all type definitions
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime


class TypeGenerator:
    """Generate TypeScript and Python types from JSON Schema."""
    
    def __init__(self, schema_dir: str, ts_output_dir: str, py_output_dir: str):
        self.schema_dir = Path(schema_dir)
        self.ts_output_dir = Path(ts_output_dir)
        self.py_output_dir = Path(py_output_dir)
        
        # Create output directories
        self.ts_output_dir.mkdir(parents=True, exist_ok=True)
        self.py_output_dir.mkdir(parents=True, exist_ok=True)
    
    def json_type_to_ts_type(self, json_type: Any, schema: Dict[str, Any]) -> str:
        """Convert JSON Schema type to TypeScript type."""
        if isinstance(json_type, list):
            return " | ".join(self.json_type_to_ts_type(t, schema) for t in json_type)
        
        # Handle enum
        if "enum" in schema:
            return " | ".join(f'"{v}"' for v in schema["enum"])
        
        # Handle const
        if "const" in schema:
            return f'"{schema["const"]}"'
        
        # Handle format
        if schema.get("format") == "uuid":
            return "string"
        elif schema.get("format") == "email":
            return "string"
        elif schema.get("format") == "uri":
            return "string"
        elif schema.get("format") == "date-time":
            return "string"
        
        # Handle array
        if json_type == "array":
            items = schema.get("items", {})
            item_type = self.json_type_to_ts_type(items.get("type", "any"), items)
            return f"{item_type}[]"
        
        # Handle object
        if json_type == "object":
            if not schema.get("properties"):
                return "Record<string, any>"
            return "object"
        
        # Basic type mapping
        type_map = {
            "string": "string",
            "number": "number",
            "integer": "number",
            "boolean": "boolean",
            "null": "null",
        }
        return type_map.get(json_type, "any")
    
    def json_type_to_python_type(self, json_type: Any, schema: Dict[str, Any]) -> str:
        """Convert JSON Schema type to Python type annotation."""
        if isinstance(json_type, list):
            types = [self.json_type_to_python_type(t, schema) for t in json_type]
            return f"Union[{', '.join(types)}]"
        
        # Handle enum
        if "enum" in schema:
            values = ", ".join(f'"{v}"' for v in schema["enum"])
            return f"Literal[{values}]"
        
        # Handle const
        if "const" in schema:
            return f'Literal["{schema["const"]}"]'
        
        # Handle array
        if json_type == "array":
            items = schema.get("items", {})
            item_type = self.json_type_to_python_type(items.get("type", "Any"), items)
            return f"List[{item_type}]"
        
        # Handle object
        if json_type == "object":
            if not schema.get("properties"):
                return "Dict[str, Any]"
            return "object"
        
        # Basic type mapping
        type_map = {
            "string": "str",
            "number": "float",
            "integer": "int",
            "boolean": "bool",
            "null": "None",
        }
        return type_map.get(json_type, "Any")
    
    def generate_typescript_interface(self, schema: Dict[str, Any]) -> str:
        """Generate TypeScript interface from JSON Schema."""
        title = schema.get("title", "Unknown")
        description = schema.get("description", "")
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        
        # Generate header
        lines = [
            "/**",
            f" * {title}",
        ]
        if description:
            lines.append(f" * {description}")
        lines.append(" * @generated Generated from JSON Schema - DO NOT EDIT MANUALLY")
        lines.append(" */")
        
        # Generate interface
        lines.append(f"export interface {title} {{")
        
        for prop_name, prop_schema in properties.items():
            prop_description = prop_schema.get("description", "")
            prop_type = prop_schema.get("type")
            ts_type = self.json_type_to_ts_type(prop_type, prop_schema)
            optional = "?" if prop_name not in required else ""
            
            if prop_description:
                lines.append(f"  /** {prop_description} */")
            lines.append(f"  {prop_name}{optional}: {ts_type};")
        
        lines.append("}")
        
        return "\n".join(lines)
    
    def generate_typescript_definitions(self, schema: Dict[str, Any]) -> str:
        """Generate TypeScript definitions from JSON Schema with definitions."""
        lines = []
        
        # Generate main interface if it has properties
        if "properties" in schema:
            lines.append(self.generate_typescript_interface(schema))
            lines.append("")
        
        # Generate definitions
        definitions = schema.get("definitions", {})
        for def_name, def_schema in definitions.items():
            def_schema_with_title = {**def_schema, "title": def_name}
            lines.append(self.generate_typescript_interface(def_schema_with_title))
            lines.append("")
        
        return "\n".join(lines).strip()
    
    def generate_pydantic_model(self, schema: Dict[str, Any]) -> str:
        """Generate Pydantic model from JSON Schema."""
        title = schema.get("title", "Unknown")
        description = schema.get("description", "")
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        
        # Collect imports
        imports = {"from pydantic import BaseModel, Field"}
        type_imports = set()
        
        # Check what types we need to import
        for prop_schema in properties.values():
            prop_type = prop_schema.get("type")
            if prop_type == "array":
                type_imports.add("List")
            if "enum" in prop_schema:
                type_imports.add("Literal")
            if prop_schema.get("type") in [["string", "null"], ["number", "null"]]:
                type_imports.add("Optional")
        
        if type_imports:
            imports.add(f"from typing import {', '.join(sorted(type_imports))}")
        
        # Generate model
        lines = list(imports)
        lines.append("")
        lines.append("")
        lines.append(f'class {title}(BaseModel):')
        lines.append(f'    """')
        lines.append(f'    {title}')
        if description:
            lines.append(f'    {description}')
        lines.append('    ')
        lines.append('    @generated Generated from JSON Schema - DO NOT EDIT MANUALLY')
        lines.append(f'    """')
        lines.append("")
        
        if not properties:
            lines.append("    pass")
        else:
            for prop_name, prop_schema in properties.items():
                prop_description = prop_schema.get("description", "")
                prop_type = prop_schema.get("type")
                py_type = self.json_type_to_python_type(prop_type, prop_schema)
                is_required = prop_name in required
                
                # Make optional if not required
                if not is_required:
                    py_type = f"Optional[{py_type}]"
                
                # Add Field with description
                if prop_description:
                    if is_required:
                        lines.append(f'    {prop_name}: {py_type} = Field(..., description="{prop_description}")')
                    else:
                        lines.append(f'    {prop_name}: {py_type} = Field(None, description="{prop_description}")')
                else:
                    if is_required:
                        lines.append(f'    {prop_name}: {py_type}')
                    else:
                        lines.append(f'    {prop_name}: {py_type} = None')
        
        return "\n".join(lines)
    
    def generate_pydantic_definitions(self, schema: Dict[str, Any]) -> str:
        """Generate Pydantic models from JSON Schema with definitions."""
        lines = []
        
        # Standard imports
        lines.append('"""')
        lines.append(f'Generated Pydantic models from JSON Schema')
        lines.append(f'Generated at: {datetime.now().isoformat()}')
        lines.append('@generated DO NOT EDIT MANUALLY')
        lines.append('"""')
        lines.append("")
        lines.append("from typing import Any, Dict, List, Literal, Optional, Union")
        lines.append("from pydantic import BaseModel, Field")
        lines.append("")
        lines.append("")
        
        # Generate main model if it has properties
        if "properties" in schema:
            lines.append(self.generate_pydantic_model(schema))
            lines.append("")
            lines.append("")
        
        # Generate definitions
        definitions = schema.get("definitions", {})
        for def_name, def_schema in definitions.items():
            def_schema_with_title = {**def_schema, "title": def_name}
            lines.append(self.generate_pydantic_model(def_schema_with_title))
            lines.append("")
            lines.append("")
        
        return "\n".join(lines).strip() + "\n"
    
    def generate_all(self):
        """Generate all TypeScript and Python types from JSON Schema files."""
        schema_files = list(self.schema_dir.glob("*.schema.json"))
        
        if not schema_files:
            print(f"⚠️  No schema files found in {self.schema_dir}")
            return
        
        print(f"🔍 Found {len(schema_files)} schema files")
        print()
        
        # Generate TypeScript index file
        ts_index_lines = [
            "/**",
            " * Generated TypeScript types from JSON Schema",
            f" * Generated at: {datetime.now().isoformat()}",
            " * @generated DO NOT EDIT MANUALLY",
            " */",
            "",
        ]
        
        for schema_file in schema_files:
            print(f"📄 Processing {schema_file.name}...")
            
            with open(schema_file) as f:
                schema = json.load(f)
            
            base_name = schema_file.stem.replace(".schema", "")
            
            # Generate TypeScript
            ts_content = self.generate_typescript_definitions(schema)
            ts_header = [
                "/**",
                f" * Generated from {schema_file.name}",
                f" * @generated DO NOT EDIT MANUALLY",
                " */",
                "",
            ]
            ts_full_content = "\n".join(ts_header) + "\n" + ts_content + "\n"
            
            ts_output_file = self.ts_output_dir / f"{base_name}.ts"
            ts_output_file.write_text(ts_full_content)
            print(f"  ✅ Generated TypeScript: {ts_output_file}")
            
            # Add to index
            ts_index_lines.append(f'export * from "./{base_name}";')
            
            # Generate Python
            py_content = self.generate_pydantic_definitions(schema)
            py_output_file = self.py_output_dir / f"{base_name}.py"
            py_output_file.write_text(py_content)
            print(f"  ✅ Generated Python: {py_output_file}")
            print()
        
        # Write TypeScript index
        ts_index_file = self.ts_output_dir / "index.ts"
        ts_index_file.write_text("\n".join(ts_index_lines) + "\n")
        print(f"✅ Generated TypeScript index: {ts_index_file}")
        
        # Write Python __init__.py
        py_init_lines = [
            '"""',
            'Generated Pydantic models from JSON Schema',
            f'Generated at: {datetime.now().isoformat()}',
            '@generated DO NOT EDIT MANUALLY',
            '"""',
            "",
        ]
        for schema_file in schema_files:
            base_name = schema_file.stem.replace(".schema", "")
            py_init_lines.append(f"from .{base_name} import *")
        
        py_init_file = self.py_output_dir / "__init__.py"
        py_init_file.write_text("\n".join(py_init_lines) + "\n")
        print(f"✅ Generated Python __init__.py: {py_init_file}")
        
        print()
        print("🎉 Type generation complete!")
        print(f"   TypeScript: {len(schema_files)} files + 1 index")
        print(f"   Python: {len(schema_files)} files + 1 init")


def main():
    """Main entry point."""
    # Paths relative to project root
    project_root = Path(__file__).parent.parent
    schema_dir = project_root / "packages" / "shared-types" / "json"
    ts_output_dir = project_root / "packages" / "shared-types" / "typescript"
    py_output_dir = project_root / "packages" / "shared-types" / "python"
    
    print("=" * 60)
    print("SmartPay Type Generator")
    print("=" * 60)
    print()
    print(f"Schema directory: {schema_dir}")
    print(f"TypeScript output: {ts_output_dir}")
    print(f"Python output: {py_output_dir}")
    print()
    
    generator = TypeGenerator(
        schema_dir=str(schema_dir),
        ts_output_dir=str(ts_output_dir),
        py_output_dir=str(py_output_dir)
    )
    
    generator.generate_all()


if __name__ == "__main__":
    main()
