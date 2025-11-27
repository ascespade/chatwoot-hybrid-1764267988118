import { execSync } from 'child_process';
import fs from 'fs';

/**
 * Setup Railway project using CLI commands
 */

const PROJECT_ID = '05d6dba2-fca6-4b83-b83e-da166ada8825';
const GITHUB_REPO = 'https://github.com/ascespade/chatwoot-hybrid-1764267988118.git';

async function main() {
  console.log('🚂 Setting up Railway project using CLI...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Check if Railway CLI is installed
    console.log('📋 Checking Railway CLI...');
    try {
      const version = execSync('railway --version', { encoding: 'utf8' });
      console.log(`✅ Railway CLI installed: ${version.trim()}\n`);
    } catch (error) {
      console.log('⚠️ Railway CLI not found');
      console.log('\n📥 Installing Railway CLI...');
      try {
        execSync('curl -fsSL https://railway.com/install.sh | sh', { stdio: 'inherit' });
        console.log('✅ Railway CLI installed\n');
      } catch (err) {
        console.log('❌ Could not install Railway CLI automatically');
        console.log('ℹ️ Please install manually:');
        console.log('   curl -fsSL https://railway.com/install.sh | sh\n');
        return;
      }
    }

    // Login to Railway
    console.log('🔐 Logging in to Railway...');
    try {
      execSync('railway login', { stdio: 'inherit' });
      console.log('✅ Logged in\n');
    } catch (error) {
      console.log('⚠️ Login required - please run: railway login');
    }

    // Link to project
    console.log(`🔗 Linking to project: ${PROJECT_ID}...`);
    try {
      execSync(`railway link -p ${PROJECT_ID}`, { stdio: 'inherit' });
      console.log('✅ Project linked\n');
    } catch (error) {
      console.log('⚠️ Could not link project');
      console.log(`ℹ️ Run manually: railway link -p ${PROJECT_ID}\n`);
    }

    // Check services
    console.log('📋 Checking existing services...');
    try {
      const services = execSync('railway service list', { encoding: 'utf8' });
      console.log(services);
    } catch (error) {
      console.log('⚠️ Could not list services');
    }

    // Create worker service if not exists
    console.log('\n⚙️ Creating Worker service...');
    try {
      // Check if worker service exists
      const services = execSync('railway service list', { encoding: 'utf8' });
      if (services.includes('chatwoot-worker') || services.includes('worker')) {
        console.log('✅ Worker service already exists');
      } else {
        execSync('railway service create chatwoot-worker', { stdio: 'inherit' });
        console.log('✅ Worker service created');
      }
    } catch (error) {
      console.log('⚠️ Could not create service via CLI');
      console.log('ℹ️ You can create it manually in Railway Dashboard\n');
    }

    // Set environment variables
    console.log('\n🔐 Setting environment variables...');
    const envFile = fs.readFileSync('railway.toml', 'utf8');
    const envVars = {};

    // Extract from railway.toml
    const matches = envFile.matchAll(/^(\w+)\s*=\s*"([^"]+)"/gm);
    for (const match of matches) {
      envVars[match[1]] = match[2];
    }

    for (const [key, value] of Object.entries(envVars)) {
      try {
        execSync(`railway variables set ${key}="${value}"`, { stdio: 'inherit' });
      } catch (error) {
        console.log(`⚠️ Could not set ${key}`);
      }
    }
    console.log('✅ Environment variables set\n');

    // Set start command
    console.log('📝 Setting start command...');
    try {
      execSync('railway variables set START_COMMAND="bundle exec sidekiq -C config/sidekiq.yml"', { stdio: 'inherit' });
      console.log('✅ Start command set\n');
    } catch (error) {
      console.log('⚠️ Could not set start command\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RAILWAY SETUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`🔗 Project: https://railway.app/project/${PROJECT_ID}`);
    console.log('⏳ Service will deploy automatically...\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();

