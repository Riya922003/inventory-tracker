/**
 * Migration script to add warehouseCode to existing warehouses
 * Run this with: node scripts/fix-warehouse-codes.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const WarehouseSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "SystemConfig" },
  name: String,
  warehouseCode: String,
  address: {
    street: String,
    city: String,
    state: String,
    pin: String,
    country: String,
  },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  capacity: Number,
  contactPhone: String,
  contactEmail: String,
  notes: String,
  isActive: Boolean,
}, { timestamps: true });

const Warehouse = mongoose.model("Warehouse", WarehouseSchema);

async function fixWarehouseCodes() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/insyd-tracker";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Find warehouses without warehouseCode
    const warehousesWithoutCode = await Warehouse.find({
      $or: [
        { warehouseCode: { $exists: false } },
        { warehouseCode: { $in: [null, ""] } }
      ]
    }).sort({ createdAt: 1 });

    console.log(`Found ${warehousesWithoutCode.length} warehouses without warehouseCode`);

    if (warehousesWithoutCode.length === 0) {
      console.log("All warehouses already have warehouseCode. Nothing to fix.");
      await mongoose.disconnect();
      return;
    }

    // Get the highest existing warehouse code
    const warehousesWithCode = await Warehouse.find({
      warehouseCode: { $exists: true, $nin: [null, ""] }
    }).sort({ warehouseCode: -1 }).limit(1);

    let startNumber = 1;
    if (warehousesWithCode.length > 0) {
      const lastCode = warehousesWithCode[0].warehouseCode;
      const match = lastCode.match(/WH(\d+)/);
      if (match) {
        startNumber = parseInt(match[1]) + 1;
      }
    }

    console.log(`Starting from warehouse code: WH${String(startNumber).padStart(3, "0")}`);

    // Update each warehouse
    for (let i = 0; i < warehousesWithoutCode.length; i++) {
      const warehouse = warehousesWithoutCode[i];
      const warehouseCode = `WH${String(startNumber + i).padStart(3, "0")}`;
      
      await Warehouse.updateOne(
        { _id: warehouse._id },
        { $set: { warehouseCode } }
      );
      
      console.log(`Updated warehouse "${warehouse.name}" with code: ${warehouseCode}`);
    }

    console.log("\nMigration completed successfully!");
    console.log(`Updated ${warehousesWithoutCode.length} warehouses`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

fixWarehouseCodes();
