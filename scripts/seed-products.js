// Run with: node --env-file=.env scripts/seed-products.js

const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found. Run with: node --env-file=.env scripts/seed-products.js");
  process.exit(1);
}

// Minimal schemas — just enough to read/write
const CategorySchema = new mongoose.Schema(
  {
    companyId: mongoose.Schema.Types.ObjectId,
    name: String,
    agingConcern: String,
    agingDays: Number,
    isFragile: { type: Boolean, default: false },
    requiresPhotoVerification: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ProductSchema = new mongoose.Schema(
  {
    companyId: mongoose.Schema.Types.ObjectId,
    sku: String,
    name: String,
    category: mongoose.Schema.Types.ObjectId,
    unitPrice: Number,
    unitType: String,
    isFragile: { type: Boolean, default: false },
    hasExpiryDate: { type: Boolean, default: false },
    reorderLevel: { type: Number, default: 10 },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.index({ companyId: 1, sku: 1 }, { unique: true });

const ProductCategory =
  mongoose.models.ProductCategory ||
  mongoose.model("ProductCategory", CategorySchema);

const Product =
  mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB\n");

  // Pull companyId from whatever category already exists
  const existingCat = await ProductCategory.findOne({}).lean();
  if (!existingCat) {
    console.error("No company data found. Complete onboarding in the app first.");
    process.exit(1);
  }
  const companyId = existingCat.companyId;
  console.log(`Using companyId: ${companyId}\n`);

  // Upsert 4 categories
  const catDefs = [
    { name: "Food & Grains",        agingConcern: "moderate", agingDays: 90  },
    { name: "Dairy & Beverages",    agingConcern: "expiry",   requiresPhotoVerification: true },
    { name: "Industrial Materials", agingConcern: "slow",     agingDays: 365 },
    { name: "Packaging Supplies",   agingConcern: "slow",     agingDays: 365 },
  ];

  const cats = {};
  for (const c of catDefs) {
    const cat = await ProductCategory.findOneAndUpdate(
      { companyId, name: c.name },
      { companyId, isActive: true, isFragile: false, requiresPhotoVerification: false, ...c },
      { upsert: true, new: true }
    );
    cats[c.name] = cat._id;
    console.log(`Category ready: ${c.name}`);
  }

  // 10 products
  const products = [
    {
      name: "Basmati Rice (Premium)",
      sku: "GRN-001",
      category: cats["Food & Grains"],
      unitPrice: 85,
      unitType: "kilogram",
      reorderLevel: 500,
      isFragile: false,
      hasExpiryDate: false,
    },
    {
      name: "Wheat Flour",
      sku: "GRN-002",
      category: cats["Food & Grains"],
      unitPrice: 45,
      unitType: "kilogram",
      reorderLevel: 300,
      isFragile: false,
      hasExpiryDate: false,
    },
    {
      name: "Refined Sugar",
      sku: "GRN-003",
      category: cats["Food & Grains"],
      unitPrice: 42,
      unitType: "kilogram",
      reorderLevel: 200,
      isFragile: false,
      hasExpiryDate: false,
    },
    {
      name: "Sunflower Oil",
      sku: "OIL-001",
      category: cats["Food & Grains"],
      unitPrice: 130,
      unitType: "liter",
      reorderLevel: 100,
      isFragile: true,
      hasExpiryDate: true,
    },
    {
      name: "Toor Dal",
      sku: "GRN-004",
      category: cats["Food & Grains"],
      unitPrice: 110,
      unitType: "kilogram",
      reorderLevel: 150,
      isFragile: false,
      hasExpiryDate: false,
    },
    {
      name: "Full Cream Milk",
      sku: "DRY-001",
      category: cats["Dairy & Beverages"],
      unitPrice: 62,
      unitType: "liter",
      reorderLevel: 200,
      isFragile: false,
      hasExpiryDate: true,
    },
    {
      name: "Packaged Butter",
      sku: "DRY-002",
      category: cats["Dairy & Beverages"],
      unitPrice: 520,
      unitType: "kilogram",
      reorderLevel: 50,
      isFragile: false,
      hasExpiryDate: true,
    },
    {
      name: "Steel Pipes (1 inch)",
      sku: "IND-001",
      category: cats["Industrial Materials"],
      unitPrice: 280,
      unitType: "meter",
      reorderLevel: 100,
      isFragile: false,
      hasExpiryDate: false,
    },
    {
      name: "Corrugated Boxes (Large)",
      sku: "PKG-001",
      category: cats["Packaging Supplies"],
      unitPrice: 25,
      unitType: "box",
      reorderLevel: 500,
      isFragile: false,
      hasExpiryDate: false,
    },
    {
      name: "Glass Jars (500ml)",
      sku: "PKG-002",
      category: cats["Packaging Supplies"],
      unitPrice: 18,
      unitType: "piece",
      reorderLevel: 1000,
      isFragile: true,
      hasExpiryDate: false,
    },
  ];

  console.log("\nCreating products...\n");
  let created = 0;
  let skipped = 0;

  for (const p of products) {
    try {
      await Product.create({ companyId, ...p, isActive: true, images: [] });
      console.log(`  ✓  ${p.name}  (${p.sku})`);
      created++;
    } catch (err) {
      if (err.code === 11000) {
        console.log(`  —  Already exists, skipped: ${p.sku}`);
        skipped++;
      } else {
        throw err;
      }
    }
  }

  console.log(`\n✓ Done: ${created} created, ${skipped} skipped`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
