#!/bin/bash

# Design Token Migration Script
# Migrates hardcoded design values to designSystem tokens
# Run from project root: bash mobile/scripts/migrate-design-tokens.sh

set -e

echo "🔄 Buffr G2P Design Token Migration"
echo "===================================="
echo ""

# Colors to migrate
COLORS=(
  # Brand colors
  "#0029D6:designSystem.colors.brand.primary"
  "#1D4ED8:designSystem.colors.brand.primaryDark"
  "#DBEAFE:designSystem.colors.brand.primaryMuted"
  "#EFF6FF:designSystem.colors.brand.primary50"
  "#E11D48:designSystem.colors.semantic.error"
  "#FFB800:designSystem.colors.brand.accent"
  
  # Semantic colors
  "#22C55E:designSystem.colors.semantic.success"
  "#F59E0B:designSystem.colors.semantic.warning"
  "#2563EB:designSystem.colors.semantic.info"
  
  # Neutral colors
  "#F8FAFC:designSystem.colors.neutral.background"
  "#FFFFFF:designSystem.colors.neutral.surface"
  "#E2E8F0:designSystem.colors.neutral.border"
  "#020617:designSystem.colors.neutral.text"
  "#64748B:designSystem.colors.neutral.textSecondary"
  "#94A3B8:designSystem.colors.neutral.textTertiary"
  
  # Gray scale
  "#F9FAFB:designSystem.colors.gray[50]"
  "#F3F4F6:designSystem.colors.gray[100]"
  "#E5E7EB:designSystem.colors.gray[200]"
  "#6B7280:designSystem.colors.gray[500]"
  "#4B5563:designSystem.colors.gray[600]"
  "#111827:designSystem.colors.gray[900]"
  
  # Slate scale
  "#F1F5F9:designSystem.colors.slate[100]"
  "#CBD5E1:designSystem.colors.slate[300]"
  "#1E293B:designSystem.colors.slate[800]"
  "#0F172A:designSystem.colors.slate[900]"
  
  # Feedback colors
  "#D1FAE5:designSystem.colors.feedback.green100"
  "#FEE2E2:designSystem.colors.feedback.red100"
  "#FEF3C7:designSystem.colors.feedback.yellow100"
  "#F3E8FF:designSystem.colors.feedback.purple100"
)

echo "📝 Backing up files..."
BACKUP_DIR="mobile/scripts/token-migration-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r mobile/app "$BACKUP_DIR/"
cp -r mobile/components "$BACKUP_DIR/"
echo "✅ Backup saved to: $BACKUP_DIR"
echo ""

echo "🔄 Migrating colors..."
for pair in "${COLORS[@]}"; do
  OLD="${pair%%:*}"
  NEW="${pair##*:}"
  COUNT=$(grep -r "$OLD" mobile/app mobile/components --include="*.tsx" | wc -l | tr -d ' ')
  if [ "$COUNT" -gt 0 ]; then
    echo "   $OLD → $NEW ($COUNT occurrences)"
    # Uncomment to actually replace:
    # find mobile/app mobile/components -name "*.tsx" -exec sed -i '' "s/$OLD/$NEW/g" {} +
  fi
done
echo ""

echo "⚠️  DRY RUN COMPLETE"
echo "===================================="
echo ""
echo "This was a DRY RUN showing what would be replaced."
echo "To actually perform the migration:"
echo "  1. Review the changes above"
echo "  2. Uncomment line 64 in this script"
echo "  3. Run again: bash mobile/scripts/migrate-design-tokens.sh"
echo "  4. Test all screens: npm run ios / npm run android"
echo "  5. Review changes: git diff mobile/"
echo "  6. Commit if all looks good"
echo ""
echo "📁 Backup location: $BACKUP_DIR"
echo "   (Restore with: cp -r $BACKUP_DIR/app mobile/ && cp -r $BACKUP_DIR/components mobile/)"
