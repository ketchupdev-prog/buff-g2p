#!/bin/bash

# SVG Optimization Script for Card Designs
# Optimizes all 32 card design SVG assets
# Run from project root: bash mobile/scripts/optimize-card-svgs.sh

set -e

echo "🎨 Buffr Card Design SVG Optimization"
echo "====================================="
echo ""

# Check if SVGO is installed
if ! command -v svgo &> /dev/null; then
  echo "📦 SVGO not found. Installing..."
  npm install -g svgo
  echo "✅ SVGO installed"
  echo ""
fi

ASSETS_DIR="mobile/assets/images/card-designs"
BACKUP_DIR="mobile/scripts/svg-backup-$(date +%Y%m%d-%H%M%S)"

echo "📝 Creating backup..."
mkdir -p "$BACKUP_DIR"
cp -r "$ASSETS_DIR" "$BACKUP_DIR/"
echo "✅ Backup saved to: $BACKUP_DIR"
echo ""

echo "🔄 Optimizing card designs..."
echo ""

total_original=0
total_optimized=0
count=0

for file in "$ASSETS_DIR"/*.svg; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    original_size=$(wc -c < "$file" | tr -d ' ')
    
    # Optimize with SVGO
    # --multipass: run multiple optimization passes
    # --precision=2: reduce decimal precision for coordinates
    # --enable=removeTitle,removeDesc: remove non-visual elements
    svgo "$file" \
      --multipass \
      --precision=2 \
      --enable=removeTitle \
      --enable=removeDesc \
      --disable=cleanupIds \
      --quiet
    
    new_size=$(wc -c < "$file" | tr -d ' ')
    reduction=$((original_size - new_size))
    percent=$((reduction * 100 / original_size))
    
    # Format sizes for display
    if [ $original_size -gt 1024 ]; then
      orig_display="$((original_size / 1024))KB"
    else
      orig_display="${original_size}B"
    fi
    
    if [ $new_size -gt 1024 ]; then
      new_display="$((new_size / 1024))KB"
    else
      new_display="${new_size}B"
    fi
    
    echo "✅ $filename: $orig_display → $new_display (-${percent}%)"
    
    total_original=$((total_original + original_size))
    total_optimized=$((total_optimized + new_size))
    count=$((count + 1))
  fi
done

echo ""
echo "====================================="
echo "📊 Optimization Summary"
echo "====================================="
echo ""
echo "Files optimized: $count"
echo "Original size:   $((total_original / 1024))KB"
echo "Optimized size:  $((total_optimized / 1024))KB"
echo "Reduction:       $((total_original - total_optimized))B"
echo "Percentage:      $(((total_original - total_optimized) * 100 / total_original))%"
echo ""
echo "✅ Optimization complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Test card rendering: npm run ios"
echo "  2. Check visual quality on all card screens"
echo "  3. If good: git add $ASSETS_DIR"
echo "  4. If issues: restore from $BACKUP_DIR"
echo ""
echo "📁 Backup location: $BACKUP_DIR"
