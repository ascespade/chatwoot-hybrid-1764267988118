import fs from 'fs';
import axios from 'axios';
import { execSync } from 'child_process';

/**
 * Complete project verification
 */

const ENV_FILE_PATH = 'E:\\chatwoot\\ENV_VARS_COMPLETE.txt';

function getEnvVar(key) {
  try {
    const content = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    const match = content.match(new RegExp(`^${key}\\s*=\\s*["']?([^"'\n]+)["']?`, 'm'));
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

async function verifyRailwayProject(token, projectId) {
  console.log(`\n🚂 Verifying Railway Project: ${projectId}...`);
  
  try {
    const response = await axios.post(
      'https://backboard.railway.com/graphql/v2',
      {
        query: `
          query {
            project(id: "${projectId}") {
              id
              name
              services {
                edges {
                  node {
                    id
                    name
                    source {
                      ... on GitHubSource {
                        repo
                        branch
                      }
                    }
                  }
                }
              }
            }
          }
        `
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data?.data?.project) {
      const project = response.data.data.project;
      console.log(`   ✅ Project: ${project.name || projectId}`);
      console.log(`   ✅ Services: ${project.services?.edges?.length || 0}`);
      
      if (project.services?.edges) {
        project.services.edges.forEach(({ node }) => {
          console.log(`      - ${node.name} (${node.id})`);
        });
      }
      
      return project;
    }
    return null;
  } catch (error) {
    console.log(`   ⚠️ Could not verify (API issue): ${error.message.substring(0, 50)}...`);
    return null;
  }
}

function verifyFiles() {
  console.log('\n📁 Verifying Files...');
  
  const requiredFiles = [
    'render.yaml',
    'railway.toml',
    'package.json',
    'run.js',
    'auto-deploy.js'
  ];

  const results = {};
  
  for (const file of requiredFiles) {
    const exists = fs.existsSync(file);
    results[file] = exists;
    
    if (exists) {
      const stats = fs.statSync(file);
      console.log(`   ✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    } else {
      console.log(`   ❌ ${file} (MISSING)`);
    }
  }
  
  return results;
}

function verifyGitHub() {
  console.log('\n🔗 Verifying GitHub...');
  
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    console.log(`   ✅ Remote: ${remote}`);
    
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    console.log(`   ✅ Branch: ${branch}`);
    
    const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();
    console.log(`   ✅ Last commit: ${lastCommit}`);
    
    return { remote, branch, lastCommit };
  } catch (error) {
    console.log(`   ❌ Git error: ${error.message}`);
    return null;
  }
}

function verifyEnvVars() {
  console.log('\n🔐 Verifying Environment Variables...');
  
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'SECRET_KEY_BASE',
    'FRONTEND_URL',
    'RAILWAY_TOKEN',
    'RENDER_API_KEY'
  ];

  const results = {};
  
  for (const key of required) {
    const value = getEnvVar(key);
    results[key] = !!value;
    
    if (value) {
      const display = value.length > 40 ? `${value.substring(0, 40)}...` : value;
      console.log(`   ✅ ${key}: ${display}`);
    } else {
      console.log(`   ⚠️ ${key}: NOT FOUND`);
    }
  }
  
  return results;
}

function verifyRenderYaml() {
  console.log('\n🎨 Verifying render.yaml...');
  
  try {
    const content = fs.readFileSync('render.yaml', 'utf8');
    
    const checks = {
      hasService: content.includes('type: web'),
      hasBuildCommand: content.includes('buildCommand'),
      hasStartCommand: content.includes('startCommand'),
      hasDatabaseUrl: content.includes('DATABASE_URL'),
      hasRedisUrl: content.includes('REDIS_URL'),
      hasFrontendUrl: content.includes('FRONTEND_URL')
    };
    
    let allGood = true;
    for (const [check, passed] of Object.entries(checks)) {
      if (passed) {
        console.log(`   ✅ ${check}`);
      } else {
        console.log(`   ❌ ${check}`);
        allGood = false;
      }
    }
    
    return allGood;
  } catch (error) {
    console.log(`   ❌ Error reading render.yaml: ${error.message}`);
    return false;
  }
}

function verifyRailwayToml() {
  console.log('\n🚂 Verifying railway.toml...');
  
  try {
    const content = fs.readFileSync('railway.toml', 'utf8');
    
    const checks = {
      hasBuild: content.includes('[build]'),
      hasDeploy: content.includes('[deploy]'),
      hasStartCommand: content.includes('startCommand'),
      hasService: content.includes('[service]'),
      hasVariables: content.includes('[service.variables]'),
      hasDatabaseUrl: content.includes('DATABASE_URL'),
      hasRedisUrl: content.includes('REDIS_URL')
    };
    
    let allGood = true;
    for (const [check, passed] of Object.entries(checks)) {
      if (passed) {
        console.log(`   ✅ ${check}`);
      } else {
        console.log(`   ❌ ${check}`);
        allGood = false;
      }
    }
    
    return allGood;
  } catch (error) {
    console.log(`   ❌ Error reading railway.toml: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Complete Project Verification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Files
  const files = verifyFiles();
  
  // 2. GitHub
  const git = verifyGitHub();
  
  // 3. Environment Variables
  const envVars = verifyEnvVars();
  
  // 4. render.yaml
  const renderYamlOk = verifyRenderYaml();
  
  // 5. railway.toml
  const railwayTomlOk = verifyRailwayToml();
  
  // 6. Railway Project
  const railwayToken = getEnvVar('RAILWAY_TOKEN');
  const projectIds = [
    'cb786c47-2d94-46e8-ae72-71eed2dae44a',
    '8c25cf50-0dd0-4127-a106-aeac8dfe651b',
    '05d6dba2-fca6-4b83-b83e-da166ada8825'
  ];
  
  if (railwayToken) {
    for (const projectId of projectIds) {
      await verifyRailwayProject(railwayToken, projectId);
    }
  } else {
    console.log('\n⚠️ RAILWAY_TOKEN not found - skipping Railway verification');
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const fileCount = Object.values(files).filter(Boolean).length;
  console.log(`📁 Files: ${fileCount}/${Object.keys(files).length} ✅`);
  
  if (git) {
    console.log(`🔗 GitHub: Connected ✅`);
  } else {
    console.log(`🔗 GitHub: Not connected ❌`);
  }
  
  const envCount = Object.values(envVars).filter(Boolean).length;
  console.log(`🔐 Environment Variables: ${envCount}/${Object.keys(envVars).length} ✅`);
  
  console.log(`🎨 render.yaml: ${renderYamlOk ? '✅' : '❌'}`);
  console.log(`🚂 railway.toml: ${railwayTomlOk ? '✅' : '❌'}`);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (fileCount === Object.keys(files).length && git && envCount >= 4 && renderYamlOk && railwayTomlOk) {
    console.log('✅ ✅ ✅ PROJECT IS COMPLETE AND READY! ✅ ✅ ✅\n');
    console.log('📋 Next Steps:');
    console.log('   1. Add Worker service in Railway Dashboard');
    console.log('   2. Connect GitHub to Render (if not connected)');
    console.log('   3. Wait for deployment\n');
  } else {
    console.log('⚠️ Some components need attention\n');
  }
}

main();

