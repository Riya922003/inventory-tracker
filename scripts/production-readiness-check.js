/**
 * Production Readiness Check
 * 
 * This script performs a comprehensive check to ensure the application
 * is ready for production deployment.
 * 
 * Run with: node scripts/production-readiness-check.js
 */

const fs = require('fs');
const path = require('path');

// Try to load dotenv if available
try {
  require('dotenv').config();
} catch (e) {
  console.log('ℹ️  dotenv not available, using existing environment variables\n');
}

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

function pass(message) {
  checks.passed.push(message);
  console.log(`✅ ${message}`);
}

function fail(message) {
  checks.failed.push(message);
  console.log(`❌ ${message}`);
}

function warn(message) {
  checks.warnings.push(message);
  console.log(`⚠️  ${message}`);
}

console.log('🔍 Running Production Readiness Check...\n');

// ========================================
// 1. ENVIRONMENT VARIABLES
// ========================================
console.log('📋 Checking Environment Variables...');

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const productionEnvVars = ['CRON_SECRET'];

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    pass(`${varName} is set`);
  } else {
    fail(`${varName} is missing`);
  }
});

if (process.env.NODE_ENV === 'production') {
  productionEnvVars.forEach(varName => {
    if (process.env[varName]) {
      pass(`${varName} is set (production)`);
    } else {
      fail(`${varName} is missing (required for production)`);
    }
  });
}

// Check for insecure defaults
if (process.env.CRON_SECRET === 'your-secret-key') {
  fail('CRON_SECRET is using default insecure value');
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  warn('JWT_SECRET should be at least 32 characters');
}

if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb')) {
  fail('MONGODB_URI format is invalid');
}

console.log('');

// ========================================
// 2. REQUIRED FILES
// ========================================
console.log('📋 Checking Required Files...');

const requiredFiles = [
  'models/Product.ts',
  'models/Stock.ts',
  'models/Warehouse.ts',
  'models/User.ts',
  'app/api/health/route.ts',
  'app/api/categories/route.ts',
  'lib/env-validation.ts',
  'scripts/pre-production-migration.js',
  'DEPLOYMENT_CHECKLIST.md',
  'PRODUCTION_READINESS_AUDIT.md'
];

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    pass(`${file} exists`);
  } else {
    fail(`${file} is missing`);
  }
});

console.log('');

// ========================================
// 3. CRITICAL CODE CHECKS
// ========================================
console.log('📋 Checking Critical Code Patterns...');

// Check Stock model for compound index
const stockModel = fs.readFileSync(path.join(process.cwd(), 'models/Stock.ts'), 'utf8');
if (stockModel.includes('companyId: 1, batchId: 1')) {
  pass('Stock model has compound index for batchId');
} else {
  fail('Stock model missing compound index for batchId');
}

if (stockModel.includes('batchId: { type: String, required: true, unique: true }')) {
  fail('Stock model still has global unique batchId (should be removed)');
} else {
  pass('Stock model batchId is not globally unique');
}

// Check Product model for compound index
const productModel = fs.readFileSync(path.join(process.cwd(), 'models/Product.ts'), 'utf8');
if (productModel.includes('companyId: 1, sku: 1')) {
  pass('Product model has compound index for SKU');
} else {
  fail('Product model missing compound index for SKU');
}

if (productModel.includes('sku: { type: String, required: true, unique: true')) {
  fail('Product model still has global unique SKU (should be removed)');
} else {
  pass('Product model SKU is not globally unique');
}

// Check cron route for secure secret
const cronRoute = fs.readFileSync(path.join(process.cwd(), 'app/api/cron/update-aging/route.ts'), 'utf8');
if (cronRoute.includes('"your-secret-key"')) {
  fail('Cron route still has insecure default secret');
} else {
  pass('Cron route does not have insecure default');
}

// Check for getCurrentUser usage in create-with-stock
const createWithStock = fs.readFileSync(path.join(process.cwd(), 'app/api/products/create-with-stock/route.ts'), 'utf8');
if (createWithStock.includes('getCurrentUser()')) {
  pass('create-with-stock uses getCurrentUser()');
} else {
  fail('create-with-stock not using getCurrentUser()');
}

if (createWithStock.includes('User.findOne({ role: "super_admin" })')) {
  fail('create-with-stock still looking for super_admin (should use getCurrentUser)');
} else {
  pass('create-with-stock not using super_admin lookup');
}

console.log('');

// ========================================
// 4. PACKAGE.JSON CHECKS
// ========================================
console.log('📋 Checking package.json...');

const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));

const requiredDependencies = [
  'next',
  'react',
  'mongoose',
  'bcryptjs',
  'jsonwebtoken',
  'jose',
  'zod'
];

requiredDependencies.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    pass(`${dep} is installed`);
  } else {
    fail(`${dep} is missing from dependencies`);
  }
});

console.log('');

// ========================================
// 5. TYPESCRIPT CONFIGURATION
// ========================================
console.log('📋 Checking TypeScript configuration...');

if (fs.existsSync(path.join(process.cwd(), 'tsconfig.json'))) {
  pass('tsconfig.json exists');
  const tsconfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tsconfig.json'), 'utf8'));
  
  if (tsconfig.compilerOptions?.strict) {
    pass('TypeScript strict mode enabled');
  } else {
    warn('TypeScript strict mode not enabled');
  }
} else {
  fail('tsconfig.json is missing');
}

console.log('');

// ========================================
// 6. SECURITY CHECKS
// ========================================
console.log('📋 Checking Security...');

// Check for console.log in production code (sample check)
const apiFiles = [
  'app/api/auth/login/route.ts',
  'app/api/products/create-with-stock/route.ts'
];

let consoleLogCount = 0;
apiFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(/console\.(log|error|warn)/g);
    if (matches) {
      consoleLogCount += matches.length;
    }
  }
});

if (consoleLogCount > 0) {
  warn(`Found ${consoleLogCount} console statements in API routes (consider using proper logging)`);
} else {
  pass('No console statements in checked API routes');
}

console.log('');

// ========================================
// SUMMARY
// ========================================
console.log('═'.repeat(60));
console.log('📊 SUMMARY');
console.log('═'.repeat(60));
console.log(`✅ Passed: ${checks.passed.length}`);
console.log(`❌ Failed: ${checks.failed.length}`);
console.log(`⚠️  Warnings: ${checks.warnings.length}`);
console.log('');

if (checks.failed.length === 0) {
  console.log('🎉 All critical checks passed!');
  console.log('');
  console.log('📝 Next Steps:');
  console.log('   1. Run: node scripts/pre-production-migration.js');
  console.log('   2. Test the application thoroughly');
  console.log('   3. Follow DEPLOYMENT_CHECKLIST.md');
  console.log('   4. Deploy to production');
  console.log('');
  process.exit(0);
} else {
  console.log('❌ Some critical checks failed!');
  console.log('');
  console.log('Failed Checks:');
  checks.failed.forEach(msg => console.log(`   - ${msg}`));
  console.log('');
  console.log('Please fix these issues before deploying to production.');
  console.log('');
  process.exit(1);
}
