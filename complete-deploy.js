import fs from 'fs';
import axios from 'axios';
import { execSync } from 'child_process';

/**
 * Complete automated deployment - Creates everything including Render service
 */

const ENV_FILE_PATH = 'E:\\chatwoot\\ENV_VARS_COMPLETE.txt';

function extractEnvVars(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const vars = {};

  const patterns = [
    /^([A-Z_]+)\s*=\s*["']?([^"'\n]+)["']?$/gm,
    /^([A-Z_]+)\s*:\s*["']?([^"'\n]+)["']?$/gm,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key && value) {
        vars[key] = value;
      }
    }
  }

  return {
    DATABASE_URL: vars.DATABASE_URL || vars.SUPABASE_URL,
    REDIS_URL: vars.REDIS_URL,
    SECRET_KEY_BASE: vars.SECRET_KEY_BASE,
    FRONTEND_URL: vars.FRONTEND_URL || vars.APP_URL,
    RAILWAY_TOKEN: vars.RAILWAY_TOKEN,
    RENDER_API_KEY: vars.RENDER_API_KEY,
    GITHUB_TOKEN: vars.GITHUB_TOKEN,
    GITHUB_REPO: vars.GITHUB_REPO || 'https://github.com/ascespade/chatwoot-hybrid-1764267988118.git'
  };
}

async function createRenderService(apiKey, githubRepo, envVars) {
  console.log('\n🎨 Creating Render Web Service...');

  try {
    // Extract repo name from GitHub URL
    const repoMatch = githubRepo.match(/github\.com[/:]([\w-]+\/[\w.-]+)(?:\.git)?$/);
    const repoName = repoMatch ? repoMatch[1] : null;

    if (!repoName) {
      throw new Error('Could not parse GitHub repo name');
    }

    // Create service using Render API
    const response = await axios.post(
      'https://api.render.com/v1/services',
      {
        type: 'web_service',
        name: 'chatwoot-web',
        repo: `https://github.com/${repoName}`,
        branch: 'main',
        buildCommand: `export NODE_OPTIONS="--max-old-space-size=2048"
corepack enable
corepack prepare pnpm@10.2.0 --activate
bundle install --jobs 2 --retry 3
pnpm install --frozen-lockfile
bundle exec rails assets:precompile RAILS_ENV=production`,
        startCommand: 'export RAILS_LOG_TO_STDOUT=true\nbundle exec rails s -p $PORT -b 0.0.0.0',
        planId: 'starter', // Free plan
        region: 'oregon',
        envVars: Object.entries(envVars).map(([key, value]) => ({
          key,
          value: String(value)
        }))
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data?.service) {
      console.log(`✅ Render service created: ${response.data.service.serviceDetailsUrl}`);
      return response.data.service;
    } else {
      throw new Error('Failed to create Render service');
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ Render API Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
    throw error;
  }
}

async function main() {
  console.log('🚀 Complete Automated Deployment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Read credentials
    console.log('📄 Reading credentials...');
    const creds = extractEnvVars(ENV_FILE_PATH);

    console.log('✅ Credentials loaded:');
    console.log(`   - Database: ${creds.DATABASE_URL.substring(0, 50)}...`);
    console.log(`   - Redis: ${creds.REDIS_URL.substring(0, 50)}...`);
    console.log(`   - Frontend: ${creds.FRONTEND_URL}`);
    console.log(`   - Render API: ${creds.RENDER_API_KEY ? 'Found' : 'Missing'}`);
    console.log(`   - Railway Token: ${creds.RAILWAY_TOKEN ? 'Found' : 'Missing'}\n`);

    // Check if render.yaml exists
    if (!fs.existsSync('render.yaml')) {
      throw new Error('render.yaml not found. Run auto-deploy.js first.');
    }

    // Read render.yaml to get env vars
    const renderYaml = fs.readFileSync('render.yaml', 'utf8');
    const envVars = {};

    // Extract env vars from render.yaml
    const envVarMatches = renderYaml.matchAll(/- key: ([A-Z_]+)\s+value: "([^"]+)"/g);
    for (const match of envVarMatches) {
      envVars[match[1]] = match[2];
    }

    console.log('📋 Environment variables extracted from render.yaml\n');

    // Create Render service
    if (creds.RENDER_API_KEY) {
      try {
        const renderService = await createRenderService(
          creds.RENDER_API_KEY,
          creds.GITHUB_REPO,
          envVars
        );

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ RENDER SERVICE CREATED SUCCESSFULLY!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`🔗 Service URL: ${renderService.serviceDetailsUrl}`);
        console.log(`🌐 Live URL: ${renderService.service?.serviceDetailsUrl || 'Will be available after deployment'}`);
        console.log('\n⏳ Deployment will start automatically...');
        console.log('   Build time: ~10-15 minutes');
        console.log('   First deployment includes database migrations\n');
      } catch (error) {
        console.log('\n⚠️ Could not create Render service via API');
        console.log('ℹ️ You can create it manually:');
        console.log('   1. Go to https://dashboard.render.com');
        console.log('   2. New → Web Service → Connect GitHub');
        console.log(`   3. Select repo: ${creds.GITHUB_REPO}`);
        console.log('   4. Render will auto-detect render.yaml\n');
      }
    } else {
      console.log('⚠️ RENDER_API_KEY not found - skipping Render automation');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ COMPLETE DEPLOYMENT FINISHED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

main();

