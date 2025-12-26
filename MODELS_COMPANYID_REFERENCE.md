# Models CompanyId Reference

This document lists all models and whether they require `companyId` field.

## Models Requiring CompanyId

These models MUST include `companyId` when creating records:

### ✅ Product
- **Field**: `companyId: mongoose.Types.ObjectId` (required)
- **Reference**: SystemConfig
- **When creating**: Always pass `companyId` from authenticated user

### ✅ Warehouse  
- **Field**: `companyId: mongoose.Types.ObjectId` (required)
- **Reference**: SystemConfig
- **When creating**: Always pass `companyId` from SystemConfig during onboarding

### ✅ Stock
- **Field**: `companyId: mongoose.Types.ObjectId` (required)
- **Reference**: SystemConfig
- **When creating**: Always pass `companyId` from authenticated user

## Models NOT Requiring CompanyId

These models are global or don't need company association:

### ❌ ProductCategory
- Global categories shared across all companies
- No companyId field

### ❌ StockMovement
- Linked to Stock which has companyId
- No direct companyId field needed

### ❌ User
- Has optional `companyId` field (set after onboarding)
- Not required during creation

### ❌ SystemConfig
- This IS the company record
- No companyId field

## Checklist for Creating Records

When creating any of these records in API routes:

1. **Product**: Get `companyId` from authenticated user
2. **Warehouse**: Get `companyId` from SystemConfig during onboarding
3. **Stock**: Get `companyId` from authenticated user

## Example Code Patterns

### Getting companyId from authenticated user:
```typescript
const currentUser = await getCurrentUser();
const user = await User.findById(currentUser.userId);
if (!user || !user.companyId) {
  return NextResponse.json({ error: "Please complete onboarding first" }, { status: 400 });
}

// Use: user.companyId
```

### Getting companyId during onboarding:
```typescript
const systemConfig = await SystemConfig.create({ ... });

// Use: systemConfig._id as companyId
```
