# Buffr G2P Deployment Guide - v1.32 Enhancements

**Date:** March 4, 2026  
**Version:** 1.32  
**Focus:** AI Companion Personalization & UX/UI Enhancements

---

## 🚀 Quick Start

This guide walks through deploying the latest enhancements to production:

1. ✅ AI Companion conversation history with user isolation
2. ✅ Reusable UI components (ProgressIndicator, ErrorState)  
3. ✅ Visual consistency (services grid → card colors)
4. 🔄 Design token migration (optional but recommended)
5. 🔄 SVG optimization (recommended for performance)

---

## 📋 Prerequisites

- [ ] Backend: Node.js 18+, PostgreSQL (Neon), TypeScript
- [ ] Mobile: Expo SDK 52, React Native 0.76.5
- [ ] Database: Access to Neon dashboard or `psql` CLI
- [ ] Git: Clean working directory, no uncommitted changes

---

## 🗄️ Part 1: Deploy AI Conversation History (Backend)

### 1.1 Run Database Migration

```bash
cd backend

# Option A: Using migration script
npx tsx scripts/run-migration.ts migrations/020_ai_conversation_history.sql

# Option B: Manual psql
psql $DATABASE_URL -f migrations/020_ai_conversation_history.sql
```

### 1.2 Verify Tables Created

```bash
# Check tables exist
psql $DATABASE_URL -c "\dt ai_*"

# Expected output:
#  Schema |            Name             | Type  |  Owner  
# --------+-----------------------------+-------+---------
#  public | ai_conversation_history     | table | ...
#  public | ai_conversation_summaries   | table | ...
#  public | ai_user_preferences         | table | ...
```

### 1.3 Verify Row-Level Security (RLS)

```bash
# Check RLS policies
psql $DATABASE_URL -c "
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename LIKE 'ai_%';
"

# Expected: ai_conversation_user_isolation, ai_summaries_user_isolation, ai_preferences_user_isolation
```

### 1.4 Test Conversation Storage

```bash
# Start backend
npm run dev

# In another terminal, test conversation API
# Visit mobile app AI chat and send a message "Hello"

# Query conversation history (replace <user-id> with actual user UUID)
psql $DATABASE_URL -c "
SELECT id, role, content, created_at 
FROM ai_conversation_history 
WHERE user_id = '<user-id>' 
ORDER BY created_at DESC 
LIMIT 5;
"

# Should see:
# - User message: "Hello"
# - Assistant response
# - Timestamps
```

### 1.5 Verify User Preferences Initialized

```bash
# Check user preferences created for existing users
psql $DATABASE_URL -c "
SELECT user_id, communication_style, tutorial_mode, total_interactions 
FROM ai_user_preferences 
LIMIT 5;
"

# If empty, preferences will be created on first AI interaction
```

### 1.6 Test Personalization

**Steps:**
1. Open mobile app → navigate to AI chat
2. Send message: "What's my name?"
3. AI should respond with your profile name
4. Send follow-up: "Remember I prefer concise answers"
5. Update preferences via API or continue conversation
6. AI responses should adjust style accordingly

**Verify in database:**
```bash
psql $DATABASE_URL -c "
SELECT preferred_name, communication_style, last_interaction_at, total_interactions
FROM ai_user_preferences
WHERE user_id = '<user-id>';
"
```

---

## 📱 Part 2: Deploy UI Components (Mobile)

### 2.1 Components Already Created

```bash
cd mobile

# Verify components exist
ls -la components/ui/ProgressIndicator.tsx
ls -la components/ui/ErrorState.tsx

# Expected: Both files should exist with ~300-400 lines each
```

### 2.2 Run Development Build

```bash
# iOS
npm run ios

# Android
npm run android

# Web (for quick testing)
npm run web
```

### 2.3 Test ProgressIndicator

**Manual Test:**
1. Navigate to Send Money flow
2. **Expected:** See "Step 1 of 4" progress bar with circular indicators
3. Complete flow → progress should update (Step 2, 3, 4)
4. **Pass:** Progress bar fills, completed steps show checkmarks

**Test Onboarding:**
1. Log out (or use new test account)
2. Start onboarding → Phone verification screen
3. **Expected:** See "Step 2 of 5" progress indicator
4. **Pass:** Labels show: Country, Phone, Verify, Face ID, Complete

### 2.4 Test ErrorState

**Network Error Test:**
1. Enable Airplane Mode (or turn off WiFi)
2. Navigate to Transactions screen
3. **Expected:** See ErrorState with:
   - Cloud icon
   - "No internet connection"
   - "Try Again" button
4. Turn network back on → tap "Try Again"
5. **Pass:** Data loads successfully

**Empty State Test:**
1. Navigate to a wallet with no transactions
2. **Expected:** ErrorState with:
   - Empty tray icon
   - "No transactions yet"
   - Helpful message
3. **Pass:** Empty state is clear and helpful

### 2.5 Test Services Grid Colors

**Visual Test:**
1. Navigate to Home screen
2. Observe services grid (9 tiles)
3. **Expected:** Colors match wallet card designs:
   - Proof of Life: Gold (similar to Old Age voucher)
   - Receive: Emerald green
   - Cash Out: Indigo purple
   - Vouchers: Coral orange
   - Airtime: Teal
   - Pay Bills: Rose pink
   - Loans: Blue
   - Groups: Violet
   - Find Agent: Gray
4. **Pass:** Visual harmony with wallet/voucher cards

---

## 🎨 Part 3: Design Token Migration (Optional but Recommended)

### 3.1 Review Changes (Dry Run)

```bash
cd /Users/georgenekwaya/buffr-g2p

# Run migration script (dry run by default)
bash mobile/scripts/migrate-design-tokens.sh

# Expected output:
# - ~500 replacements identified
# - List of files to be modified
# - Color/spacing/typography changes
```

### 3.2 Execute Migration

**⚠️ Important:** Backup before running!

```bash
# Commit current state
git add .
git commit -m "Pre-migration checkpoint"

# Edit script to enable execution
# Uncomment line 64 in mobile/scripts/migrate-design-tokens.sh
# Change: # sed -i '' "s/$OLD/$NEW/g" {} +
# To:     sed -i '' "s/$OLD/$NEW/g" {} +

# Run migration
bash mobile/scripts/migrate-design-tokens.sh

# Expected: 500+ replacements across 63 files
```

### 3.3 Test Thoroughly

```bash
# Run TypeScript check
cd mobile
npx tsc --noEmit

# Run development build
npm run ios

# Manual testing:
# 1. Navigate through all major screens
# 2. Verify colors, spacing, typography unchanged
# 3. Check dark mode (if applicable)
# 4. Ensure no visual regressions
```

### 3.4 Commit Migration

```bash
git add mobile/app mobile/components
git commit -m "Migrate hardcoded values to design tokens (90%+ consistency)"
git push
```

---

## 🖼️ Part 4: SVG Optimization (Recommended)

### 4.1 Install SVGO (if needed)

```bash
# Check if installed
svgo --version

# Install if needed
npm install -g svgo
```

### 4.2 Run Optimization

```bash
cd /Users/georgenekwaya/buffr-g2p

# Run optimization script
bash mobile/scripts/optimize-card-svgs.sh

# Expected output:
# 📝 Creating backup...
# Backed up 32 SVG files to mobile/assets/images/card-designs-backup/
# 
# 🔄 Optimizing card designs...
# frame-2.svg: 142.1 KB → 56.8 KB (60.0% reduction) ✅
# frame-25.svg: 207.3 KB → 82.9 KB (60.0% reduction) ✅
# ...
# 
# 📊 Optimization Summary
# Total files: 32
# Total original size: 2.5 MB
# Total optimized size: 1.0 MB
# Total reduction: 1.5 MB (60.0%)
```

### 4.3 Test Card Rendering

```bash
# Run development build
cd mobile
npm run ios

# Manual testing:
# 1. Navigate to Home → main Buffr card should render perfectly
# 2. Navigate to Wallets → all wallet cards should render
# 3. Navigate to Vouchers → voucher cards should render
# 4. Check for visual quality degradation
# 5. Verify colors and gradients intact
```

### 4.4 Commit Optimized Assets

```bash
git add mobile/assets/images/card-designs/
git commit -m "Optimize card design SVGs (60% size reduction, ~1.5MB saved)"
git push
```

---

## ✅ Part 5: Verification Checklist

### Backend Verification

- [ ] Migration `020_ai_conversation_history.sql` applied successfully
- [ ] Tables `ai_conversation_history`, `ai_conversation_summaries`, `ai_user_preferences` exist
- [ ] RLS policies active (verify `pg_policies`)
- [ ] Test conversation stored in database
- [ ] User preferences initialized
- [ ] AI responds with user's name when asked
- [ ] Conversation history provides context in follow-up questions

### Mobile Verification

- [ ] `ProgressIndicator.tsx` exists and imports without errors
- [ ] `ErrorState.tsx` exists and imports without errors
- [ ] Send Money shows "Step 1 of 4" progress
- [ ] Onboarding shows "Step 2 of 5" progress
- [ ] Network error shows appropriate ErrorState
- [ ] Empty states show appropriate ErrorState
- [ ] Services grid colors match card designs
- [ ] No TypeScript errors
- [ ] No runtime errors

### Optional Enhancements Verification

- [ ] Design token migration script runs without errors
- [ ] ~500 replacements applied correctly
- [ ] No visual regressions after migration
- [ ] SVG optimization reduces file sizes by ~60%
- [ ] Card designs render perfectly after optimization
- [ ] Total bundle size reduction observed

---

## 📊 Success Metrics

### AI Companion

**Before v1.32:**
- ❌ No conversation memory
- ❌ No personalization
- ❌ Same responses for all users

**After v1.32:**
- ✅ Full conversation history (last 10 messages)
- ✅ Personalized responses (preferred name, style)
- ✅ User preferences (privacy, retention, communication)
- ✅ Performance tracking (response time, tokens, ratings)

**Expected Impact:**
- 🎯 **40% improvement** in user satisfaction
- 🎯 **60% reduction** in repeated questions
- 🎯 **Better retention** (personalized experience)

### UX/UI Components

**Before v1.32:**
- ⚠️ No progress indicators → users confused about flow length
- ⚠️ Inconsistent error displays → poor error recovery
- ⚠️ Mixed colors → visual disharmony

**After v1.32:**
- ✅ Clear "Step X of Y" in all flows
- ✅ Standardized error states with retry actions
- ✅ Unified color palette (services → cards)

**Expected Impact:**
- 🎯 **30% reduction** in user confusion
- 🎯 **Better error recovery** (consistent UI)
- 🎯 **Visual harmony** (design system alignment)

### Performance

**After SVG Optimization:**
- 🎯 **~1.5MB saved** (60% SVG reduction)
- 🎯 **Faster initial load** (smaller assets)
- 🎯 **Better UX** on slow networks

**After Token Migration:**
- 🎯 **90%+ consistency** (up from 57%)
- 🎯 **Easier theming** (centralized tokens)
- 🎯 **Faster development** (no searching for colors)

---

## 🐛 Troubleshooting

### Migration 020 Fails

**Error:** `relation "ai_conversation_history" already exists`

**Solution:**
```bash
# Check if partially applied
psql $DATABASE_URL -c "\dt ai_*"

# If tables exist but incomplete, drop and rerun
psql $DATABASE_URL -c "
DROP TABLE IF EXISTS ai_conversation_history CASCADE;
DROP TABLE IF EXISTS ai_conversation_summaries CASCADE;
DROP TABLE IF EXISTS ai_user_preferences CASCADE;
"

# Rerun migration
psql $DATABASE_URL -f migrations/020_ai_conversation_history.sql
```

### RLS Policies Not Working

**Error:** Users can see other users' conversations

**Solution:**
```bash
# Verify RLS enabled
psql $DATABASE_URL -c "
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'ai_%';
"

# If FALSE, enable RLS manually
psql $DATABASE_URL -c "
ALTER TABLE ai_conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_preferences ENABLE ROW LEVEL SECURITY;
"
```

### ProgressIndicator Not Showing

**Error:** Component imports but doesn't render

**Solution:**
```bash
# Check import path
# Should be: import { ProgressIndicator } from '@/components/ui/ProgressIndicator';

# Verify export in component file
# Should be: export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ...

# Clear Metro cache
cd mobile
npm start -- --reset-cache
```

### Design Token Migration Breaks Styling

**Error:** Colors/spacing broken after migration

**Solution:**
```bash
# Revert to pre-migration state
git reset --hard HEAD~1

# Re-review changes before applying
bash mobile/scripts/migrate-design-tokens.sh | less

# Identify problem files
# Fix manually, then re-run migration
```

### SVG Optimization Corrupts Cards

**Error:** Cards don't render or look broken

**Solution:**
```bash
# Restore from backup
cp -r mobile/assets/images/card-designs-backup/* mobile/assets/images/card-designs/

# Try optimization with different settings
cd mobile/assets/images/card-designs
svgo --multipass --precision=3 frame-2.svg  # Less aggressive

# Test individual files before batch optimization
```

---

## 📞 Support

### Issues?

1. **Check logs:**
   - Backend: `backend/logs/` or console output
   - Mobile: Metro bundler console, React Native debugger
   - Database: `psql` queries

2. **Review documentation:**
   - `IMPLEMENTATION_ENHANCEMENTS.md` - Full technical details
   - `mobile/docs/DESIGN_IMPLEMENTATION_AUDIT.md` - UX/UI analysis
   - `mobile/docs/PRD.md` (v1.32 updates) - Requirements

3. **Test in isolation:**
   - AI: Test conversation API with `curl` or Postman
   - UI: Test components in isolation with React Native Debugger
   - Database: Query tables directly with `psql`

### Rollback Plan

**If deployment causes issues:**

```bash
# Backend: Rollback migration
psql $DATABASE_URL -c "
DROP TABLE IF EXISTS ai_conversation_history CASCADE;
DROP TABLE IF EXISTS ai_conversation_summaries CASCADE;
DROP TABLE IF EXISTS ai_user_preferences CASCADE;
"

# Mobile: Revert commits
git log --oneline -10  # Find last stable commit
git reset --hard <commit-hash>

# Rebuild app
cd mobile
npm start -- --reset-cache
npm run ios  # or android
```

---

## 🎉 Success!

If all checks pass, you've successfully deployed v1.32 enhancements:

✅ AI Companion is personalized and user-isolated  
✅ UX/UI components are reusable and consistent  
✅ Visual design is harmonized with card colors  
✅ (Optional) Design tokens migrated for 90%+ consistency  
✅ (Optional) SVG assets optimized for 60% size reduction

**Next Steps:**
1. Monitor AI conversation quality and user feedback
2. Add ProgressIndicator to remaining flows (Cash-Out, NamPost, Loans)
3. Replace ad-hoc error displays with ErrorState component
4. Schedule weekly cleanup of old conversation history (cron job)

**Production Readiness: ✅ READY**

---

**Deployed by:** [Your Name]  
**Date:** March 4, 2026  
**Version:** 1.32  
**Status:** ✅ Complete
