# Data Flow Audit - Executive Summary
**SmartPay Mobile App - Critical Issues & Quick Wins**

---

## 🚨 Critical Issues (Fix Immediately)

### 1. Settings Not Persisted
**Impact:** User settings (biometric, notifications, etc.) lost on app restart  
**Location:** `app/(authenticated)/profile/settings.tsx`  
**Fix Time:** 2 hours  
**Solution:** Replace local `useState` with `useSettingsStore`

```typescript
// Current (BROKEN)
const [biometricEnabled, setBiometricEnabled] = useState(true);

// Fix
const { security, updateSecurity } = useSettingsStore();
const biometricEnabled = security.biometricEnabled;
```

---

### 2. Duplicate State Management
**Impact:** Wallet data stored in Context AND Zustand, causing inconsistency  
**Location:** `WalletsContext` + `walletStore`  
**Fix Time:** 2-3 days  
**Solution:** Migrate to React Query, remove Context

**Current Problem:**
```
WalletsContext.wallets[0].balance = 1000 ✅ (after transaction)
walletStore.wallets[0].balance = 1500 ❌ (stale!)
BalanceStrip local state = 1500 ❌ (stale!)
```

---

### 3. No Cache Invalidation
**Impact:** Stale data displayed after creating wallets, sending money, etc.  
**Location:** All mutation operations  
**Fix Time:** 4 hours  
**Solution:** Call `refresh()` after mutations

```typescript
// After creating wallet:
const wallet = await createWallet({ name, type, icon, color });
await refresh(); // ✅ ADD THIS
router.back();
```

**Files to update:**
- `app/(authenticated)/wallets/add.tsx`
- `app/send-money/confirm.tsx`
- All mutation operations

---

### 4. Multiple API Calls for Same Data
**Impact:** Home screen makes 2-3 calls to GET /wallets  
**Location:** Home screen, BalanceStrip, WalletCarousel  
**Fix Time:** 1 day  
**Solution:** Use React Query with request deduplication

---

### 5. GroupsContext Unused (Dead Code)
**Impact:** Wasted memory, confusing codebase  
**Location:** `contexts/GroupsContext.tsx`  
**Fix Time:** 30 minutes  
**Solution:** Delete file, remove from `AppProviders.tsx`

---

## 📊 State Management Overview

### Current Architecture (Problematic)

```
Components (91 screens)
   ↓
┌──────────────┬───────────────┬──────────────┐
│   Contexts   │    Zustand    │ React Query  │
│   (7 used)   │  (4 stores)   │  (1 config)  │
│              │               │              │
│ • User       │ • userStore   │ • Groups ✅  │
│ • Wallets    │ • walletStore │              │
│ • Groups ❌  │ • settings    │              │
│ • Notifs     │ • balance     │              │
│ • Network    │               │              │
│ • Copilot    │               │              │
│ • Inactivity │               │              │
└──────────────┴───────────────┴──────────────┘
   ↓              ↓               ↓
Service Layer (API calls)
   ↓
Backend API

❌ State duplication (Context + Zustand)
❌ Inconsistent patterns (Groups vs Wallets)
❌ No synchronization between layers
```

### Recommended Architecture

```
Components (91 screens)
   ↓
┌──────────────────────────────────────┐
│        React Query (Server State)     │
│  ['user'] ['wallets'] ['transactions']│
│  ['groups']                           │
│                                       │
│  onSuccess: sync to offline cache ──┐ │
└──────────────────────────────────────┘│
   ↓                                    │
Service Layer (API calls)               │
   ↓                                    │
Backend API                             │
                                        │
┌───────────────────────────────────────┘
│
▼
┌──────────────────────────────────────┐
│   Zustand (Client State + Cache)     │
│  • userStore (preferences)            │
│  • settingsStore (app config)         │
│  • walletStore (offline cache)        │
└──────────────────────────────────────┘

✅ Single source of truth
✅ Automatic offline sync
✅ Clear separation of concerns
```

---

## 📈 Performance Impact

### Current State
- Home screen: **2-3 redundant API calls**
- Wallet detail: **2 API calls** (fetch all, then filter)
- Activity screen: **No caching** (refetch every time)
- **Est. wasted bandwidth:** 60-70% redundant requests

### After Fixes
- Home screen: **1 API call** (React Query deduplication)
- Wallet detail: **0-1 API calls** (cache hit or fetch single)
- Activity screen: **Cached** (2-minute stale time)
- **Est. bandwidth reduction:** 50-60%

---

## 🎯 Quick Win Action Plan

### Day 1 (4 hours)
- [ ] Fix settings persistence → Use `useSettingsStore`
- [ ] Add `refresh()` calls after wallet mutations
- [ ] Delete `GroupsContext` (unused)

### Day 2 (4 hours)
- [ ] Create `useWalletsQuery` hook
- [ ] Update Home screen to use query
- [ ] Update BalanceStrip to use query

### Day 3 (4 hours)
- [ ] Update remaining wallet screens
- [ ] Remove `WalletsContext`
- [ ] Test thoroughly

### Day 4 (4 hours)
- [ ] Add optimistic updates to send money
- [ ] Add error boundaries
- [ ] Performance testing

**Total: 2-3 days of focused work for major improvements**

---

## 📋 Checklist for Developers

### Before Making Changes
- [ ] Read full audit report: `AUDIT_DATA_FLOW_STATE_MANAGEMENT.md`
- [ ] Understand current architecture
- [ ] Review React Query documentation
- [ ] Plan migration strategy

### Phase 1: Immediate Fixes
- [ ] Fix settings screen (use settingsStore)
- [ ] Add refresh() after wallet mutations
- [ ] Delete GroupsContext
- [ ] Add error boundaries

### Phase 2: React Query Migration
- [ ] Create query hooks for wallets
- [ ] Create query hooks for transactions
- [ ] Create query hooks for user profile
- [ ] Update all screens
- [ ] Remove old contexts

### Phase 3: Optimizations
- [ ] Add optimistic updates
- [ ] Implement pagination
- [ ] Add background refresh
- [ ] Improve error handling

### Phase 4: Testing
- [ ] Write unit tests for query hooks
- [ ] Write integration tests for mutations
- [ ] Test offline scenarios
- [ ] Performance profiling

---

## 🔗 Related Documents

- **Full Audit:** `AUDIT_DATA_FLOW_STATE_MANAGEMENT.md`
- **Store Documentation:** `store/README.md`
- **API Types:** `types/api.ts`

---

## 📞 Questions?

Refer to the full audit report for:
- Detailed code examples
- Architectural diagrams
- Migration guides
- Testing strategies
- Performance measurements

---

**Audit Completed:** March 18, 2026  
**Status:** 🔴 Action Required  
**Priority:** High
