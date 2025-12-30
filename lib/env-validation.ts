/**
 * Environment Variable Validation
 * Validates required environment variables at application startup
 */

interface EnvConfig {
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN?: string;
  CRON_SECRET?: string;
  NODE_ENV?: string;
}

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
] as const;

const productionRequiredEnvVars = [
  ...requiredEnvVars,
  'CRON_SECRET',
] as const;

export function validateEnv(): EnvConfig {
  const env = process.env;
  const isProduction = env.NODE_ENV === 'production';
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  const varsToCheck = isProduction ? productionRequiredEnvVars : requiredEnvVars;
  
  for (const varName of varsToCheck) {
    if (!env[varName] || env[varName]?.trim() === '') {
      missing.push(varName);
    }
  }

  // Check for insecure defaults
  if (env.CRON_SECRET === 'your-secret-key') {
    warnings.push('CRON_SECRET is using default value. This is insecure!');
  }

  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long');
  }

  // Validate MongoDB URI format
  if (env.MONGODB_URI && !env.MONGODB_URI.startsWith('mongodb')) {
    warnings.push('MONGODB_URI should start with mongodb:// or mongodb+srv://');
  }

  // Report errors
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    
    if (isProduction) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    } else {
      console.error('\n⚠️  Application may not function correctly without these variables\n');
    }
  }

  // Report warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Environment variable warnings:');
    warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
    console.warn('');
  }

  // Success message
  if (missing.length === 0 && warnings.length === 0) {
    // Environment variables validated successfully
  }

  return {
    MONGODB_URI: env.MONGODB_URI!,
    JWT_SECRET: env.JWT_SECRET!,
    JWT_EXPIRES_IN: env.JWT_EXPIRES_IN || '7d',
    CRON_SECRET: env.CRON_SECRET,
    NODE_ENV: env.NODE_ENV || 'development',
  };
}

// Validate on import (runs at startup)
if (typeof window === 'undefined') {
  // Only run on server-side
  try {
    validateEnv();
  } catch (error) {
    console.error('Environment validation failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}
