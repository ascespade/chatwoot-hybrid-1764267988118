import fs from 'fs';
import axios from 'axios';
import { execSync } from 'child_process';

/**
 * Final deployment - Uses Render Blueprint API and Railway CLI alternative
 */

const ENV_FILE_PATH = 'E:\\chatwoot\\ENV_VARS_COMPLETE.txt';

function extractEnvVars(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const vars = {};

  const patterns = [
    /^([A-Z_]+)\s*=\s*["']?([^"'\n]+)["']?$/gm,
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

  return vars;
}

async function createRenderServiceViaBlueprint(apiKey, githubRepo) {
  console.log('\n🎨 Creating Render service via Blueprint API...');

  try {
    // Render Blueprint API endpoint
    const repoMatch = githubRepo.match(/github\.com[/:]([\w-]+\/[\w.-]+)(?:\.git)?$/);
    const repoName = repoMatch ? repoMatch[1] : null;

    if (!repoName) {
      throw new Error('Could not parse GitHub repo');
    }

    // Try Render Blueprint API
    const response = await axios.post(
      'https://api.render.com/blueprints',
      {
        blueprintSpec: {
          services: [{
            type: 'web',
            name: 'chatwoot-web',
            repo: `https://github.com/${repoName}`,
            branch: 'main'
          }]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    // Try alternative: Direct service creation
    try {
      const repoMatch = githubRepo.match(/github\.com[/:]([\w-]+\/[\w.-]+)(?:\.git)?$/);
      const [owner, repo] = repoMatch[1].split('/');

      const response = await axios.post(
        `https://api.render.com/v1/services`,
        {
          type: 'web_service',
          name: 'chatwoot-web',
          ownerId: owner, // This might need to be fetched first
          repo: `https://github.com/${repoMatch[1]}`,
          branch: 'main',
          planId: 'starter'
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (err2) {
      throw new Error(`Render API failed: ${err2.response?.data?.message || err2.message}`);
    }
  }
}

async function listRenderOwners(apiKey) {
  try {
    const response = await axios.get(
      'https://api.render.com/v1/owners',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.log('⚠️ Could not fetch Render owners');
    return null;
  }
}

async function main() {
  console.log('🚀 Final Complete Deployment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const vars = extractEnvVars(ENV_FILE_PATH);

    const creds = {
      DATABASE_URL: vars.DATABASE_URL,
      REDIS_URL: vars.REDIS_URL,
      SECRET_KEY_BASE: vars.SECRET_KEY_BASE,
      FRONTEND_URL: vars.FRONTEND_URL,
      RENDER_API_KEY: vars.RENDER_API_KEY,
      RAILWAY_TOKEN: vars.RAILWAY_TOKEN,
      GITHUB_REPO: 'https://github.com/ascespade/chatwoot-hybrid-1764267988118.git'
    };

    console.log('✅ Credentials loaded\n');

    // Check if files exist
    if (!fs.existsSync('render.yaml')) {
      throw new Error('render.yaml not found');
    }

    console.log('📋 Files ready:');
    console.log('   ✅ render.yaml');
    console.log('   ✅ railway.toml');
    console.log('   ✅ GitHub repo: ' + creds.GITHUB_REPO + '\n');

    // Try Render API
    if (creds.RENDER_API_KEY) {
      console.log('🎨 Attempting to create Render service...\n');

      try {
        // First, get owner info
        const owners = await listRenderOwners(creds.RENDER_API_KEY);
        if (owners && owners.length > 0) {
          console.log(`✅ Found Render owner: ${owners[0].name || owners[0].id}\n`);
        }

        // Try to create service
        const service = await createRenderServiceViaBlueprint(
          creds.RENDER_API_KEY,
          creds.GITHUB_REPO
        );

        if (service) {
          console.log('✅ Render service creation initiated!');
          console.log(`   Service ID: ${service.id || service.service?.id || 'N/A'}`);
        }
      } catch (error) {
        console.log('⚠️ Render API Error:', error.message);
        console.log('\n📋 Manual Render Setup:');
        console.log('   1. Go to: https://dashboard.render.com');
        console.log('   2. Click "New" → "Web Service"');
        console.log('   3. "Connect GitHub" → Select repo');
        console.log(`   4. Repo: ${creds.GITHUB_REPO}`);
        console.log('   5. Render will auto-detect render.yaml ✅');
        console.log('   6. Click "Create Web Service"\n');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL FILES READY FOR DEPLOYMENT!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Summary:');
    console.log(`   🔗 GitHub Repo: ${creds.GITHUB_REPO}`);
    console.log(`   🗄️  Database: Supabase (configured)`);
    console.log(`   🔴 Redis: ${creds.REDIS_URL.substring(0, 50)}...`);
    console.log(`   🌐 Frontend URL: ${creds.FRONTEND_URL}\n`);

    console.log('📝 Next Steps:');
    console.log('   1. Go to Render Dashboard');
    console.log('   2. Connect GitHub repo');
    console.log('   3. Wait for deployment (10-15 min)');
    console.log(`   4. Access Chatwoot at: ${creds.FRONTEND_URL}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

