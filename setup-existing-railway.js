import axios from 'axios';
import fs from 'fs';

/**
 * Setup Worker service in existing Railway project
 */

const ENV_FILE_PATH = 'E:\\chatwoot\\ENV_VARS_COMPLETE.txt';
const EXISTING_PROJECT_ID = '05d6dba2-fca6-4b83-b83e-da166ada8825'; // From your screenshot

function getEnvVar(key) {
  const content = fs.readFileSync(ENV_FILE_PATH, 'utf8');
  const match = content.match(new RegExp(`^${key}\\s*=\\s*["']?([^"'\n]+)["']?`, 'm'));
  return match ? match[1].trim() : null;
}

async function listServices(token, projectId) {
  try {
    const response = await axios.post(
      'https://backboard.railway.app/graphql/v2',
      {
        query: `
          query {
            project(id: "${projectId}") {
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

    return response.data?.data?.project?.services?.edges || [];
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    return [];
  }
}

async function createServiceFromRepo(token, projectId, serviceName, githubRepo) {
  try {
    const repoMatch = githubRepo.match(/github\.com[/:]([\w-]+\/[\w.-]+)(?:\.git)?$/);
    const repoName = repoMatch ? repoMatch[1] : null;

    if (!repoName) {
      throw new Error('Invalid GitHub repo URL');
    }

    // Try to create service from GitHub repo
    const response = await axios.post(
      'https://backboard.railway.app/graphql/v2',
      {
        query: `
          mutation {
            serviceCreate(
              projectId: "${projectId}"
              config: {
                name: "${serviceName}"
                source: {
                  repo: "${repoName}"
                  branch: "main"
                }
              }
            ) {
              id
              name
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

    if (response.data?.data?.serviceCreate) {
      return response.data.data.serviceCreate;
    } else if (response.data?.errors) {
      throw new Error(JSON.stringify(response.data.errors));
    }
    throw new Error('Unknown error');
  } catch (error) {
    if (error.response?.data) {
      throw new Error(JSON.stringify(error.response.data));
    }
    throw error;
  }
}

async function setEnvVar(token, serviceId, key, value) {
  try {
    const response = await axios.post(
      'https://backboard.railway.app/graphql/v2',
      {
        query: `
          mutation {
            variableUpsert(
              serviceId: "${serviceId}"
              name: "${key}"
              value: "${value.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"
            ) {
              id
              name
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

    return response.data?.data?.variableUpsert;
  } catch (error) {
    console.log(`⚠️ Could not set ${key}`);
    return null;
  }
}

async function main() {
  console.log('🚂 Setting up Worker in existing Railway project...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const railwayToken = getEnvVar('RAILWAY_TOKEN');
  const githubRepo = 'https://github.com/ascespade/chatwoot-hybrid-1764267988118.git';

  if (!railwayToken) {
    throw new Error('RAILWAY_TOKEN not found');
  }

  try {
    // List existing services
    console.log(`📋 Checking project: ${EXISTING_PROJECT_ID}...`);
    const services = await listServices(railwayToken, EXISTING_PROJECT_ID);

    console.log(`✅ Found ${services.length} service(s):`);
    services.forEach(({ node }) => {
      console.log(`   - ${node.name} (${node.id})`);
    });

    // Check if worker service exists
    const workerService = services.find(({ node }) =>
      node.name.includes('worker') || node.name.includes('chatwoot-worker')
    );

    let serviceId;

    if (workerService) {
      console.log(`\n✅ Worker service already exists: ${workerService.node.name}`);
      serviceId = workerService.node.id;
    } else {
      console.log('\n🔨 Creating Worker service...');
      const service = await createServiceFromRepo(
        railwayToken,
        EXISTING_PROJECT_ID,
        'chatwoot-worker',
        githubRepo
      );
      serviceId = service.id;
      console.log(`✅ Service created: ${service.name} (${service.id})`);
    }

    // Set environment variables
    console.log('\n🔐 Setting environment variables...');
    const envVars = {
      DATABASE_URL: getEnvVar('DATABASE_URL'),
      REDIS_URL: getEnvVar('REDIS_URL'),
      SECRET_KEY_BASE: getEnvVar('SECRET_KEY_BASE'),
      FRONTEND_URL: getEnvVar('FRONTEND_URL'),
      RAILS_ENV: 'production',
      NODE_ENV: 'production',
      RAILS_LOG_TO_STDOUT: 'true',
      RAILS_MAX_THREADS: '5',
      WORKER_COMMAND: 'bundle exec sidekiq -C config/sidekiq.yml'
    };

    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        await setEnvVar(railwayToken, serviceId, key, value);
      }
    }
    console.log('✅ Environment variables configured');

    // Set start command
    console.log('\n📝 Setting start command...');
    try {
      await axios.post(
        'https://backboard.railway.app/graphql/v2',
        {
          query: `
            mutation {
              serviceUpdate(
                id: "${serviceId}"
                input: {
                  startCommand: "bundle exec sidekiq -C config/sidekiq.yml"
                }
              ) {
                id
                name
              }
            }
          `
        },
        {
          headers: {
            'Authorization': `Bearer ${railwayToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Start command set');
    } catch (error) {
      console.log('⚠️ Could not set start command (will use railway.toml)');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RAILWAY WORKER SETUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`🔗 Project: https://railway.app/project/${EXISTING_PROJECT_ID}`);
    console.log(`⚙️ Service ID: ${serviceId}`);
    console.log('\n⏳ Service will deploy automatically...');
    console.log('   Check logs in Railway Dashboard to verify deployment\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }

    console.log('\n📋 Manual Setup Instructions:');
    console.log(`   1. Go to: https://railway.app/project/${EXISTING_PROJECT_ID}`);
    console.log('   2. Click "New" → "GitHub Repo"');
    console.log(`   3. Select: ${githubRepo}`);
    console.log('   4. Service name: "chatwoot-worker"');
    console.log('   5. Start command: "bundle exec sidekiq -C config/sidekiq.yml"');
    console.log('   6. Add environment variables from railway.toml\n');

    process.exit(1);
  }
}

main();

