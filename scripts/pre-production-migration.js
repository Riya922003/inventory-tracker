/**
 * Pre-Production Database Migration Script
 * 
 * This script prepares the database for production by:
 * 1. Dropping old global unique indexes
 * 2. Creating new compound indexes
 * 3. Validating data integrity
 * 4. Checking for duplicate entries
 * 
 * Run with: node scripts/pre-production-migration.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

async function runMigration() {
  try {
    console.log("🚀 Starting Pre-Production Migration...\n");

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/insyd-tracker";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // ========================================
    // 1. DROP OLD INDEXES
    // ========================================
    console.log("📋 Step 1: Dropping old global unique indexes...");
    
    try {
      // Drop old Product SKU index
      await db.collection("products").dropIndex("sku_1");
      console.log("   ✓ Dropped products.sku_1");
    } catch (error) {
      if (error.code === 27) {
        console.log("   ℹ products.sku_1 doesn't exist (OK)");
      } else {
        console.log("   ⚠ Error dropping products.sku_1:", error.message);
      }
    }

    try {
      // Drop old Stock batchId index
      await db.collection("stocks").dropIndex("batchId_1");
      console.log("   ✓ Dropped stocks.batchId_1");
    } catch (error) {
      if (error.code === 27) {
        console.log("   ℹ stocks.batchId_1 doesn't exist (OK)");
      } else {
        console.log("   ⚠ Error dropping stocks.batchId_1:", error.message);
      }
    }

    console.log("");

    // ========================================
    // 2. CREATE NEW COMPOUND INDEXES
    // ========================================
    console.log("📋 Step 2: Creating new compound indexes...");

    try {
      // Product: companyId + sku unique
      await db.collection("products").createIndex(
        { companyId: 1, sku: 1 },
        { unique: true, name: "companyId_1_sku_1" }
      );
      console.log("   ✓ Created products.companyId_1_sku_1 (unique)");
    } catch (error) {
      if (error.code === 85 || error.code === 86) {
        console.log("   ℹ products.companyId_1_sku_1 already exists (OK)");
      } else {
        console.log("   ⚠ Error creating products index:", error.message);
      }
    }

    try {
      // Stock: companyId + batchId unique
      await db.collection("stocks").createIndex(
        { companyId: 1, batchId: 1 },
        { unique: true, name: "companyId_1_batchId_1" }
      );
      console.log("   ✓ Created stocks.companyId_1_batchId_1 (unique)");
    } catch (error) {
      if (error.code === 85 || error.code === 86) {
        console.log("   ℹ stocks.companyId_1_batchId_1 already exists (OK)");
      } else {
        console.log("   ⚠ Error creating stocks index:", error.message);
      }
    }

    // Additional performance indexes
    try {
      await db.collection("stocks").createIndex(
        { warehouseId: 1, status: 1 },
        { name: "warehouseId_1_status_1" }
      );
      console.log("   ✓ Created stocks.warehouseId_1_status_1");
    } catch (error) {
      if (error.code === 85 || error.code === 86) {
        console.log("   ℹ stocks.warehouseId_1_status_1 already exists (OK)");
      }
    }

    try {
      await db.collection("products").createIndex(
        { companyId: 1, category: 1 },
        { name: "companyId_1_category_1" }
      );
      console.log("   ✓ Created products.companyId_1_category_1");
    } catch (error) {
      if (error.code === 85 || error.code === 86) {
        console.log("   ℹ products.companyId_1_category_1 already exists (OK)");
      }
    }

    console.log("");

    // ========================================
    // 3. DATA INTEGRITY CHECKS
    // ========================================
    console.log("📋 Step 3: Running data integrity checks...\n");

    // Check for products without companyId
    const productsWithoutCompany = await db.collection("products").countDocuments({
      companyId: { $exists: false }
    });
    if (productsWithoutCompany > 0) {
      console.log(`   ⚠ WARNING: ${productsWithoutCompany} products without companyId`);
    } else {
      console.log("   ✓ All products have companyId");
    }

    // Check for stocks without companyId
    const stocksWithoutCompany = await db.collection("stocks").countDocuments({
      companyId: { $exists: false }
    });
    if (stocksWithoutCompany > 0) {
      console.log(`   ⚠ WARNING: ${stocksWithoutCompany} stocks without companyId`);
    } else {
      console.log("   ✓ All stocks have companyId");
    }

    // Check for warehouses without warehouseCode
    const warehousesWithoutCode = await db.collection("warehouses").countDocuments({
      $or: [
        { warehouseCode: { $exists: false } },
        { warehouseCode: null },
        { warehouseCode: "" }
      ]
    });
    if (warehousesWithoutCode > 0) {
      console.log(`   ⚠ WARNING: ${warehousesWithoutCode} warehouses without warehouseCode`);
      console.log("   → Run: node scripts/fix-warehouse-codes.js");
    } else {
      console.log("   ✓ All warehouses have warehouseCode");
    }

    // Check for users without companyId (should only be during onboarding)
    const usersWithoutCompany = await db.collection("users").countDocuments({
      companyId: { $exists: false }
    });
    if (usersWithoutCompany > 0) {
      console.log(`   ℹ ${usersWithoutCompany} users without companyId (may be mid-onboarding)`);
    } else {
      console.log("   ✓ All users have companyId");
    }

    console.log("");

    // ========================================
    // 4. DUPLICATE DETECTION
    // ========================================
    console.log("📋 Step 4: Checking for duplicate entries...\n");

    // Check for duplicate SKUs within companies
    const duplicateSkus = await db.collection("products").aggregate([
      {
        $group: {
          _id: { companyId: "$companyId", sku: "$sku" },
          count: { $sum: 1 },
          ids: { $push: "$_id" }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (duplicateSkus.length > 0) {
      console.log(`   ⚠ WARNING: Found ${duplicateSkus.length} duplicate SKUs within companies`);
      duplicateSkus.forEach(dup => {
        console.log(`      - SKU: ${dup._id.sku}, Count: ${dup.count}`);
      });
      console.log("   → Manual cleanup required before production");
    } else {
      console.log("   ✓ No duplicate SKUs found");
    }

    // Check for duplicate batchIds within companies
    const duplicateBatches = await db.collection("stocks").aggregate([
      {
        $group: {
          _id: { companyId: "$companyId", batchId: "$batchId" },
          count: { $sum: 1 },
          ids: { $push: "$_id" }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (duplicateBatches.length > 0) {
      console.log(`   ⚠ WARNING: Found ${duplicateBatches.length} duplicate batchIds within companies`);
      duplicateBatches.forEach(dup => {
        console.log(`      - BatchId: ${dup._id.batchId}, Count: ${dup.count}`);
      });
      console.log("   → Manual cleanup required before production");
    } else {
      console.log("   ✓ No duplicate batchIds found");
    }

    console.log("");

    // ========================================
    // 5. STATISTICS
    // ========================================
    console.log("📊 Database Statistics:\n");

    const stats = {
      users: await db.collection("users").countDocuments(),
      companies: await db.collection("systemconfigs").countDocuments(),
      products: await db.collection("products").countDocuments(),
      categories: await db.collection("productcategories").countDocuments(),
      warehouses: await db.collection("warehouses").countDocuments(),
      stocks: await db.collection("stocks").countDocuments(),
      alerts: await db.collection("alerts").countDocuments(),
    };

    Object.entries(stats).forEach(([collection, count]) => {
      console.log(`   ${collection.padEnd(15)}: ${count}`);
    });

    console.log("");

    // ========================================
    // COMPLETION
    // ========================================
    console.log("✅ Migration completed successfully!\n");
    console.log("📝 Next Steps:");
    console.log("   1. Review any warnings above");
    console.log("   2. Fix any duplicate entries if found");
    console.log("   3. Run: node scripts/fix-warehouse-codes.js (if needed)");
    console.log("   4. Test the application thoroughly");
    console.log("   5. Deploy to production\n");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
