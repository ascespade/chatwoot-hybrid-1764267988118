import { execSync } from 'child_process';
import fs from 'fs';

/**
 * Setup Worker service using Railway CLI
 */

const ENV_FILE_PATH = 'E:\\chatwoot\\ENV_VARS_COMPLETE.txt';

function getEnvVar(key) {
  const content = fs.readFileSync(ENV_FILE_PATH, 'utf8');
  const match = content.match(new RegExp(`^${key}\\s*=\\s*["']?([^"'\n]+)["']?`, 'm'));
  return match ? match[1].trim() : null;
}

async function main() {
  console.log('🚂 Setting up Worker Service using Railway CLI...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. Check current service
    console.log('📋 Checking current service...');
    try {
      const serviceInfo = execSync('npx @railway/cli service', { encoding: 'utf8', stdio: 'pipe' });
      console.log(serviceInfo);
    } catch (error) {
      console.log('⚠️ Could not get service info');
    }

    // 2. Set environment variables from railway.toml
    console.log('\n🔐 Setting environment variables...');
    const envVars = {
      DATABASE_URL: getEnvVar('DATABASE_URL'),
      REDIS_URL: getEnvVar('REDIS_URL'),
      SECRET_KEY_BASE: getEnvVar('SECRET_KEY_BASE'),
      FRONTEND_URL: getEnvVar('FRONTEND_URL'),
      RAILS_ENV: 'production',
      NODE_ENV: 'production',
      RAILS_LOG_TO_STDOUT: 'true',
      RAILS_MAX_THREADS: '5'
    };

    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        try {
          execSync(`npx @railway/cli variables set ${key}="${value}"`, { stdio: 'inherit' });
          console.log(`   ✅ ${key}`);
        } catch (error) {
          console.log(`   ⚠️ ${key} (failed)`);
        }
      }
    }

    // 3. Deploy
    console.log('\n🚀 Deploying Worker service...');
    console.log('   This will use railway.toml configuration\n');
    
    execSync('npx @railway/cli up --detach', { stdio: 'inherit' });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ WORKER SERVICE DEPLOYED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⏳ Service is deploying...');
    console.log('   Check logs: npx @railway/cli logs');
    console.log('   Check status: npx @railway/cli status\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();

