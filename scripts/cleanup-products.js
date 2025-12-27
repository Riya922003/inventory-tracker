/**
 * Script to view and optionally clean up products in the database
 * Run with: node scripts/cleanup-products.js
 * 
 * This script will:
 * 1. Show all products in the database
 * 2. Identify products without stock
 * 3. Allow you to delete specific products by SKU
 */

const mongoose = require("mongoose");
const readline = require("readline");
require("dotenv").config();

const ProductSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "SystemConfig" },
  name: String,
  sku: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: "ProductCategory" },
  unitPrice: Number,
  unitType: String,
  isFragile: Boolean,
  hasExpiryDate: Boolean,
  reorderLevel: Number,
  isActive: Boolean,
}, { timestamps: true });

const StockSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "SystemConfig" },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
  batchId: String,
  quantityAvailable: Number,
});

const Product = mongoose.model("Product", ProductSchema);
const Stock = mongoose.model("Stock", StockSchema);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function viewProducts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/insyd-tracker";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB\n");

    // Get all products
    const products = await Product.find({})
      .populate("category", "name")
      .populate("companyId", "companyName")
      .sort({ createdAt: -1 });

    console.log(`Found ${products.length} products in the database:\n`);
    console.log("=" .repeat(100));

    for (const product of products) {
      // Check if product has stock
      const stockCount = await Stock.countDocuments({ productId: product._id });
      
      console.log(`SKU: ${product.sku}`);
      console.log(`Name: ${product.name}`);
      console.log(`Company: ${product.companyId?.companyName || "Unknown"}`);
      console.log(`Category: ${product.category?.name || "Unknown"}`);
      console.log(`Price: ₹${product.unitPrice} per ${product.unitType}`);
      console.log(`Stock Entries: ${stockCount}`);
      console.log(`Active: ${product.isActive ? "Yes" : "No"}`);
      console.log(`Created: ${product.createdAt.toLocaleString()}`);
      console.log("-".repeat(100));
    }

    // Ask if user wants to delete any products
    console.log("\nOptions:");
    console.log("1. Delete a product by SKU");
    console.log("2. Delete all products without stock");
    console.log("3. Exit");
    
    const choice = await question("\nEnter your choice (1-3): ");

    if (choice === "1") {
      const sku = await question("Enter the SKU of the product to delete: ");
      const product = await Product.findOne({ sku });
      
      if (!product) {
        console.log(`\nProduct with SKU "${sku}" not found.`);
      } else {
        const confirm = await question(`\nAre you sure you want to delete "${product.name}" (${sku})? (yes/no): `);
        
        if (confirm.toLowerCase() === "yes") {
          // Delete associated stock entries
          const stockDeleted = await Stock.deleteMany({ productId: product._id });
          await Product.deleteOne({ _id: product._id });
          
          console.log(`\n✓ Deleted product "${product.name}" (${sku})`);
          console.log(`✓ Deleted ${stockDeleted.deletedCount} associated stock entries`);
        } else {
          console.log("\nDeletion cancelled.");
        }
      }
    } else if (choice === "2") {
      // Find products without stock
      const allProducts = await Product.find({});
      const productsWithoutStock = [];
      
      for (const product of allProducts) {
        const stockCount = await Stock.countDocuments({ productId: product._id });
        if (stockCount === 0) {
          productsWithoutStock.push(product);
        }
      }
      
      if (productsWithoutStock.length === 0) {
        console.log("\nNo products without stock found.");
      } else {
        console.log(`\nFound ${productsWithoutStock.length} products without stock:`);
        productsWithoutStock.forEach(p => {
          console.log(`  - ${p.name} (${p.sku})`);
        });
        
        const confirm = await question(`\nDelete all ${productsWithoutStock.length} products? (yes/no): `);
        
        if (confirm.toLowerCase() === "yes") {
          const productIds = productsWithoutStock.map(p => p._id);
          const result = await Product.deleteMany({ _id: { $in: productIds } });
          console.log(`\n✓ Deleted ${result.deletedCount} products without stock`);
        } else {
          console.log("\nDeletion cancelled.");
        }
      }
    }

    rl.close();
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    rl.close();
    process.exit(1);
  }
}

viewProducts();
