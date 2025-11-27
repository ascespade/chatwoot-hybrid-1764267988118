import fs from 'fs';
import axios from 'axios';
import { default as deployFunction } from './run.js';

/**
 * Auto-deployment script that reads credentials from ENV_VARS_COMPLETE.txt
 * No user input required - everything is automated!
 */

const ENV_FILE_PATH = 'E:\\chatwoot\\ENV_VARS_COMPLETE.txt';

function extractEnvVars(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const vars = {};

    // Extract key-value pairs (supports various formats)
    const patterns = [
      /^([A-Z_]+)\s*=\s*["']?([^"'\n]+)["']?$/gm,
      /^([A-Z_]+)\s*:\s*["']?([^"'\n]+)["']?$/gm,
      /^([A-Z_]+)\s+["']?([^"'\n]+)["']?$/gm
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

    // Try multiple variations of each key
    const supabaseUrl = vars.SUPABASE_URL || vars.DATABASE_URL || vars.SUPABASE_DATABASE_URL ||
                       vars.SUPABASE_DB_URL || vars.POSTGRES_URL || vars.POSTGRESQL_URL;

    const supabaseKey = vars.SUPABASE_KEY || vars.SUPABASE_SERVICE_KEY || vars.SUPABASE_SERVICE_ROLE_KEY ||
                       vars.SUPABASE_ANON_KEY || vars.SUPABASE_API_KEY || 'not-provided';

    const railwayToken = vars.RAILWAY_TOKEN || vars.RAILWAY_API_TOKEN || vars.RAILWAY_API_KEY;

    const renderApiKey = vars.RENDER_API_KEY || vars.RENDER_API_TOKEN || vars.RENDER_KEY || 'not-provided';

    const githubRepo = vars.GITHUB_REPO || vars.REPO_URL || vars.GITHUB_REPOSITORY || vars.REPOSITORY_URL ||
                      vars.GIT_REPO || vars.REPO;

    const frontendUrl = vars.FRONTEND_URL || vars.APP_URL || vars.CHATWOOT_URL || vars.FRONTEND_DOMAIN ||
                       vars.DOMAIN || vars.URL || vars.BASE_URL;

    return {
      SUPABASE_URL: supabaseUrl,
      SUPABASE_KEY: supabaseKey,
      RAILWAY_TOKEN: railwayToken,
      RENDER_API_KEY: renderApiKey,
      GITHUB_REPO: githubRepo,
      FRONTEND_URL: frontendUrl,
      ALL_VARS: vars // Keep all vars for additional checks
    };
  } catch (error) {
    throw new Error(`Failed to read env file: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Chatwoot Auto-Deployment - Reading credentials...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Read credentials from file
    console.log(`📄 Reading credentials from: ${ENV_FILE_PATH}`);
    const credentials = extractEnvVars(ENV_FILE_PATH);

    // Validate critical fields
    const critical = ['SUPABASE_URL', 'RAILWAY_TOKEN', 'FRONTEND_URL'];
    const missing = critical.filter(key => !credentials[key]);

    if (missing.length > 0) {
      throw new Error(`Missing critical credentials: ${missing.join(', ')}`);
    }

    // Warn about optional but recommended fields
    if (!credentials.SUPABASE_KEY || credentials.SUPABASE_KEY === 'not-provided') {
      console.log('⚠️ WARNING: SUPABASE_KEY not found - some operations may fail');
      console.log('   You can continue, but Supabase operations will be limited\n');
      credentials.SUPABASE_KEY = 'not-provided'; // Placeholder
    }

    if (!credentials.RENDER_API_KEY || credentials.RENDER_API_KEY === 'not-provided') {
      console.log('⚠️ WARNING: RENDER_API_KEY not found - Render setup will be manual');
      console.log('   You can continue, but need to set up Render manually\n');
      credentials.RENDER_API_KEY = 'not-provided'; // Placeholder
    }

    // Try to create GitHub repo if not found but GITHUB_TOKEN exists
    if (!credentials.GITHUB_REPO) {
      const githubToken = credentials.ALL_VARS?.GITHUB_TOKEN;
      if (githubToken) {
        console.log('📦 GITHUB_REPO not found, but GITHUB_TOKEN exists...');
        console.log('   Attempting to create a new GitHub repository...\n');

        try {
          const repoName = `chatwoot-hybrid-${Date.now()}`;
          const createRepoResp = await axios.post(
            'https://api.github.com/user/repos',
            {
              name: repoName,
              description: 'Chatwoot Hybrid Deployment - Auto-created',
              private: false,
              auto_init: true
            },
            {
              headers: {
                Authorization: `token ${githubToken}`,
                Accept: 'application/vnd.github.v3+json'
              }
            }
          );

          if (createRepoResp.data?.clone_url) {
            credentials.GITHUB_REPO = createRepoResp.data.clone_url;
            console.log(`✅ GitHub repository created: ${credentials.GITHUB_REPO}\n`);
          } else {
            throw new Error('Failed to get repo URL from GitHub API');
          }
        } catch (error) {
          console.error('❌ Failed to create GitHub repository:', error.message);
          console.log('\n💡 Please create a GitHub repository manually and add:');
          console.log('   GITHUB_REPO=https://github.com/username/repo.git\n');
          throw new Error('GITHUB_REPO is required. Please create a GitHub repository and add GITHUB_REPO to the env file.');
        }
      } else {
        throw new Error('GITHUB_REPO is required. Please create a GitHub repository and add GITHUB_REPO to the env file.');
      }
    }

    console.log('✅ Credentials loaded successfully!\n');
    console.log('📋 Found credentials:');
    console.log(`   ✅ Supabase URL: ${credentials.SUPABASE_URL.substring(0, 50)}...`);
    if (credentials.SUPABASE_KEY !== 'not-provided') {
      console.log(`   ✅ Supabase Key: ${credentials.SUPABASE_KEY.substring(0, 30)}...`);
    } else {
      console.log(`   ⚠️ Supabase Key: Not provided`);
    }
    console.log(`   ✅ Railway Token: ${credentials.RAILWAY_TOKEN.substring(0, 30)}...`);
    if (credentials.RENDER_API_KEY !== 'not-provided') {
      console.log(`   ✅ Render API Key: ${credentials.RENDER_API_KEY.substring(0, 30)}...`);
    } else {
      console.log(`   ⚠️ Render API Key: Not provided`);
    }
    console.log(`   ✅ GitHub Repo: ${credentials.GITHUB_REPO}`);
    console.log(`   ✅ Frontend URL: ${credentials.FRONTEND_URL}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Starting automated deployment...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Run deployment
    await deployFunction({
      github_repo: credentials.GITHUB_REPO.trim(),
      supabase_url: credentials.SUPABASE_URL.trim(),
      supabase_key: credentials.SUPABASE_KEY.trim(),
      railway_token: credentials.RAILWAY_TOKEN.trim(),
      render_api_key: credentials.RENDER_API_KEY.trim(),
      frontend_url: credentials.FRONTEND_URL.trim()
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ AUTO-DEPLOYMENT COMPLETED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Final Steps (Manual):');
    console.log('1. Go to Render Dashboard: https://dashboard.render.com');
    console.log('2. New → Web Service → Connect GitHub');
    console.log('3. Select your repo → Render will auto-detect render.yaml');
    console.log('4. Wait 10-15 minutes for deployment');
    console.log(`5. Your Chatwoot will be at: ${credentials.FRONTEND_URL}\n`);

    console.log('🎉 Everything is ready! Just connect Render and wait! 🚀\n');

  } catch (error) {
    console.error('\n❌ AUTO-DEPLOYMENT FAILED:');
    console.error(`   ${error.message}\n`);

    if (error.message.includes('File not found')) {
      console.log('💡 Make sure the file exists at:');
      console.log(`   ${ENV_FILE_PATH}\n`);
    }

    if (error.message.includes('Missing required') || error.message.includes('Missing critical')) {
      console.log('💡 Make sure your ENV_VARS_COMPLETE.txt contains:');
      console.log('   - DATABASE_URL (for Supabase)');
      console.log('   - RAILWAY_TOKEN');
      console.log('   - FRONTEND_URL');
      console.log('   - GITHUB_REPO (required)\n');
      console.log('Optional but recommended:');
      console.log('   - SUPABASE_KEY (for Supabase operations)');
      console.log('   - RENDER_API_KEY (for Render automation)\n');
    }

    if (error.message.includes('GITHUB_REPO is required')) {
      console.log('💡 To fix this:');
      console.log('   1. Create a new GitHub repository');
      console.log('   2. Add GITHUB_REPO=https://github.com/username/repo.git to your env file\n');
    }

    process.exit(1);
  }
}

main();
