# Warehouse Code Generation Fix

## Problem
The onboarding process was failing with the error:
```
Warehouse validation failed: warehouseCode: Path `warehouseCode` is required.
```

This occurred because:
1. The Warehouse model requires `warehouseCode` to be unique and required
2. The onboarding API wasn't generating warehouse codes
3. Existing warehouses in the database might not have warehouse codes
4. MongoDB query had duplicate `$ne` operators which caused TypeScript errors

## Solution

### 1. Fixed Onboarding API (`app/api/onboarding/route.ts`)
- Added automatic warehouse code generation (WH001, WH002, etc.)
- Queries existing warehouses to find the highest code number
- Generates sequential codes for multiple warehouses in one transaction
- Uses `$nin` operator instead of multiple `$ne` operators
- Filters out warehouses without valid codes to avoid errors

### 2. Fixed Warehouses API (`app/api/warehouses/route.ts`)
- Updated POST handler to use robust code generation
- Changed from `countDocuments()` to querying the last warehouse code
- Uses `$nin` operator for proper MongoDB query syntax
- Filters out warehouses without valid codes

### 3. Migration Script (`scripts/fix-warehouse-codes.js`)
- Fixes any existing warehouses without warehouse codes
- Run with: `node scripts/fix-warehouse-codes.js`
- Uses proper MongoDB query operators

## Warehouse Code Format
- Format: `WH###` (e.g., WH001, WH002, WH003)
- Auto-increments based on existing warehouses
- Globally unique across all companies

## Code Generation Logic

```javascript
// Get existing warehouses with valid codes
const existingWarehouses = await Warehouse.find({ 
  warehouseCode: { $exists: true, $nin: [null, ""] } 
})
  .sort({ warehouseCode: -1 })
  .limit(1);

// Calculate next number
let startNumber = 1;
if (existingWarehouses.length > 0 && existingWarehouses[0].warehouseCode) {
  const lastCode = existingWarehouses[0].warehouseCode;
  const match = lastCode.match(/WH(\d+)/);
  if (match) {
    startNumber = parseInt(match[1]) + 1;
  }
}

// Generate code
const warehouseCode = `WH${String(startNumber).padStart(3, "0")}`;
```

## MongoDB Query Fix
**Problem**: Cannot have duplicate property names in object literal
```javascript
// ❌ WRONG - Duplicate $ne operators
{ warehouseCode: { $exists: true, $ne: null, $ne: "" } }

// ✅ CORRECT - Use $nin for multiple values
{ warehouseCode: { $exists: true, $nin: [null, ""] } }
```

## Safety Features
1. **Null/Empty Check**: Uses `$nin` to filter out null and empty strings
2. **Regex Validation**: Safely extracts number from code format
3. **Default Fallback**: Starts from 1 if no existing codes found
4. **Transaction Support**: Works within MongoDB transactions (onboarding)
5. **Proper MongoDB Syntax**: Uses correct operators to avoid duplicate property errors

## Files Modified
- `app/api/onboarding/route.ts` - Added warehouse code generation with proper MongoDB queries
- `app/api/warehouses/route.ts` - Updated POST handler with proper MongoDB queries
- `models/Warehouse.ts` - Already had required warehouseCode field
- `scripts/fix-warehouse-codes.js` - New migration script with proper MongoDB queries
- `WAREHOUSE_CODE_FIX.md` - This documentation

## Testing
1. Clear your database or run the migration script if you have existing warehouses
2. Complete the onboarding process
3. Verify warehouses have codes: WH001, WH002, etc.
4. Create new warehouses and verify sequential numbering
5. Verify no TypeScript or MongoDB errors

## Future Considerations
- Consider company-specific warehouse codes if needed (e.g., COMP1-WH001)
- Add warehouse code to API responses for better tracking
- Consider adding warehouse code to warehouse detail pages
- Add warehouse code search/filter functionality
