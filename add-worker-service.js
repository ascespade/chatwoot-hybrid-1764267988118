import axios from 'axios';
import fs from 'fs';

/**
 * Add Worker service to Railway project
 */

const ENV_FILE_PATH = 'E:\\chatwoot\\ENV_VARS_COMPLETE.txt';
const PROJECT_ID = '8c25cf50-0dd0-4127-a106-aeac8dfe651b';
const GITHUB_REPO = 'https://github.com/ascespade/chatwoot-hybrid-1764267988118.git';

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

    return response.data?.data?.project || null;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

async function createService(token, projectId, serviceName, githubRepo) {
  try {
    const repoMatch = githubRepo.match(/github\.com[/:]([\w-]+\/[\w.-]+)(?:\.git)?$/);
    const repoName = repoMatch ? repoMatch[1] : null;

    if (!repoName) {
      throw new Error('Invalid GitHub repo URL');
    }

    console.log(`   Creating service from repo: ${repoName}...`);

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
    // Escape special characters
    const escapedValue = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/\n/g, '\\n');

    const response = await axios.post(
      'https://backboard.railway.app/graphql/v2',
      {
        query: `
          mutation {
            variableUpsert(
              serviceId: "${serviceId}"
              name: "${key}"
              value: "${escapedValue}"
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
    return null;
  }
}

async function setStartCommand(token, serviceId, command) {
  try {
    const response = await axios.post(
      'https://backboard.railway.app/graphql/v2',
      {
        query: `
          mutation {
            serviceUpdate(
              id: "${serviceId}"
              input: {
                startCommand: "${command.replace(/"/g, '\\"')}"
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

    return response.data?.data?.serviceUpdate;
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('🚂 Adding Worker Service to Railway Project...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const railwayToken = getEnvVar('RAILWAY_TOKEN');

  if (!railwayToken) {
    throw new Error('RAILWAY_TOKEN not found in env file');
  }

  try {
    // 1. List existing services
    console.log(`📋 Checking project: ${PROJECT_ID}...`);
    const project = await listServices(railwayToken, PROJECT_ID);

    if (!project) {
      throw new Error('Could not access project. Check Railway token and project ID.');
    }

    console.log(`✅ Project: ${project.name || PROJECT_ID}`);
    console.log(`✅ Found ${project.services?.edges?.length || 0} service(s):`);

    if (project.services?.edges) {
      project.services.edges.forEach(({ node }) => {
        console.log(`   - ${node.name} (${node.id})`);
      });
    }

    // 2. Check if worker service exists
    const existingWorker = project.services?.edges?.find(({ node }) =>
      node.name.includes('worker') || node.name.includes('chatwoot-worker')
    );

    let serviceId;

    if (existingWorker) {
      console.log(`\n✅ Worker service already exists: ${existingWorker.node.name}`);
      serviceId = existingWorker.node.id;
    } else {
      console.log('\n🔨 Creating Worker service...');
      const service = await createService(
        railwayToken,
        PROJECT_ID,
        'chatwoot-worker',
        GITHUB_REPO
      );
      serviceId = service.id;
      console.log(`✅ Service created: ${service.name} (${service.id})`);
    }

    // 3. Set start command
    console.log('\n📝 Setting start command...');
    const startCmd = 'bundle exec sidekiq -C config/sidekiq.yml';
    const cmdResult = await setStartCommand(railwayToken, serviceId, startCmd);
    if (cmdResult) {
      console.log('✅ Start command set');
    } else {
      console.log('⚠️ Could not set start command (will use railway.toml)');
    }

    // 4. Set environment variables
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

    let successCount = 0;
    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        const result = await setEnvVar(railwayToken, serviceId, key, value);
        if (result) {
          successCount++;
          console.log(`   ✅ ${key}`);
        } else {
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
    console.log('   Check logs in Railway Dashboard to verify deployment\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }

    console.log('\n📋 If API failed, add manually:');
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

