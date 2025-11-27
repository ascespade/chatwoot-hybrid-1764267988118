import axios from 'axios';
import fs from 'fs';

/**
 * Add Worker service using Railway Public API (correct method)
 * Based on: https://docs.railway.com/reference/public-api
 */

const ENV_FILE_PATH = 'E:\\chatwoot\\ENV_VARS_COMPLETE.txt';
const PROJECT_ID = 'cb786c47-2d94-46e8-ae72-71eed2dae44a';
const GITHUB_REPO = 'https://github.com/ascespade/chatwoot-hybrid-1764267988118.git';
const API_ENDPOINT = 'https://backboard.railway.com/graphql/v2';

function getEnvVar(key) {
  const content = fs.readFileSync(ENV_FILE_PATH, 'utf8');
  const match = content.match(new RegExp(`^${key}\\s*=\\s*["']?([^"'\n]+)["']?`, 'm'));
  return match ? match[1].trim() : null;
}

async function queryRailwayAPI(token, query, variables = {}) {
  try {
    const response = await axios.post(
      API_ENDPOINT,
      {
        query,
        variables: Object.keys(variables).length > 0 ? variables : undefined
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data?.errors) {
      throw new Error(JSON.stringify(response.data.errors));
    }

    return response.data?.data;
  } catch (error) {
    if (error.response?.data) {
      throw new Error(JSON.stringify(error.response.data));
    }
    throw error;
  }
}

async function main() {
  console.log('🚂 Adding Worker Service using Railway Public API...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const railwayToken = getEnvVar('RAILWAY_TOKEN');
  
  if (!railwayToken) {
    throw new Error('RAILWAY_TOKEN not found');
  }

  try {
    // 1. Get project info
    console.log(`📋 Getting project info: ${PROJECT_ID}...`);
    const projectQuery = `
      query GetProject($projectId: String!) {
        project(id: $projectId) {
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
    `;

    const projectData = await queryRailwayAPI(railwayToken, projectQuery, {
      projectId: PROJECT_ID
    });

    if (!projectData?.project) {
      throw new Error('Project not found or access denied');
    }

    const project = projectData.project;
    console.log(`✅ Project: ${project.name || PROJECT_ID}`);
    console.log(`✅ Services: ${project.services?.edges?.length || 0}`);

    if (project.services?.edges) {
      project.services.edges.forEach(({ node }) => {
        console.log(`   - ${node.name} (${node.id})`);
      });
    }

    // 2. Check if worker exists
    const existingWorker = project.services?.edges?.find(({ node }) => 
      node.name.toLowerCase().includes('worker')
    );

    let serviceId;

    if (existingWorker) {
      console.log(`\n✅ Worker service exists: ${existingWorker.node.name}`);
      serviceId = existingWorker.node.id;
    } else {
      // 3. Create service
      console.log('\n🔨 Creating Worker service...');
      const repoMatch = GITHUB_REPO.match(/github\.com[/:]([\w-]+\/[\w.-]+)(?:\.git)?$/);
      const repoName = repoMatch ? repoMatch[1] : null;

      if (!repoName) {
        throw new Error('Invalid GitHub repo URL');
      }

      const createServiceMutation = `
        mutation CreateService($projectId: String!, $name: String!, $repo: String!) {
          serviceCreate(
            projectId: $projectId
            config: {
              name: $name
              source: {
                repo: $repo
                branch: "main"
              }
            }
          ) {
            id
            name
          }
        }
      `;

      const serviceData = await queryRailwayAPI(railwayToken, createServiceMutation, {
        projectId: PROJECT_ID,
        name: 'chatwoot-worker',
        repo: repoName
      });

      if (serviceData?.serviceCreate) {
        serviceId = serviceData.serviceCreate.id;
        console.log(`✅ Service created: ${serviceData.serviceCreate.name} (${serviceId})`);
      } else {
        throw new Error('Failed to create service');
      }
    }

    // 4. Set start command
    console.log('\n📝 Setting start command...');
    const startCmdMutation = `
      mutation SetStartCommand($serviceId: String!, $command: String!) {
        serviceUpdate(
          id: $serviceId
          input: {
            startCommand: $command
          }
        ) {
          id
          name
        }
      }
    `;

    try {
      await queryRailwayAPI(railwayToken, startCmdMutation, {
        serviceId: serviceId,
        command: 'bundle exec sidekiq -C config/sidekiq.yml'
      });
      console.log('✅ Start command set');
    } catch (error) {
      console.log('⚠️ Could not set start command (will use railway.toml)');
    }

    // 5. Set environment variables
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

    const setVarMutation = `
      mutation SetVariable($serviceId: String!, $name: String!, $value: String!) {
        variableUpsert(
          serviceId: $serviceId
          name: $name
          value: $value
        ) {
          id
          name
        }
      }
    `;

    let successCount = 0;
    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        try {
          await queryRailwayAPI(railwayToken, setVarMutation, {
            serviceId: serviceId,
            name: key,
            value: String(value)
          });
          console.log(`   ✅ ${key}`);
          successCount++;
        } catch (error) {
          console.log(`   ⚠️ ${key} (failed)`);
        }
      }
    }

    console.log(`\n✅ Set ${successCount}/${Object.keys(envVars).length} environment variables`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ WORKER SERVICE ADDED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`🔗 Project: https://railway.app/project/${PROJECT_ID}`);
    console.log(`⚙️ Service ID: ${serviceId}`);
    console.log('\n⏳ Service will deploy automatically...');
    console.log('   Check logs in Railway Dashboard\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    // Show helpful error info
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\n💡 Token issue:');
      console.log('   1. Go to: https://railway.app/account/tokens');
      console.log('   2. Create a new API token');
      console.log('   3. Update RAILWAY_TOKEN in your env file\n');
    } else if (error.message.includes('Project not found')) {
      console.log('\n💡 Project access issue:');
      console.log('   1. Verify project ID is correct');
      console.log('   2. Ensure token has access to this project\n');
    }

    console.log('\n📋 Manual Setup:');
    console.log(`   1. Go to: https://railway.app/project/${PROJECT_ID}`);
    console.log('   2. Click "New" → "GitHub Repo"');
    console.log(`   3. Select: ${GITHUB_REPO}`);
    console.log('   4. Service name: "chatwoot-worker"');
    console.log('   5. Start command: "bundle exec sidekiq -C config/sidekiq.yml"');
    console.log('   6. Add environment variables from railway.toml\n');
    
    process.exit(1);
  }
}

main();

