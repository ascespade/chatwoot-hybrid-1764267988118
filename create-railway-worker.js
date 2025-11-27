import axios from 'axios';
import fs from 'fs';

/**
 * Create Railway Worker service using correct API
 */

const ENV_FILE_PATH = 'E:\\chatwoot\\ENV_VARS_COMPLETE.txt';

function getEnvVar(key) {
  const content = fs.readFileSync(ENV_FILE_PATH, 'utf8');
  const match = content.match(new RegExp(`^${key}\\s*=\\s*["']?([^"'\n]+)["']?`, 'm'));
  return match ? match[1].trim() : null;
}

async function listRailwayProjects(token) {
  try {
    const response = await axios.post(
      'https://backboard.railway.app/graphql/v2',
      {
        query: `
          query {
            me {
              projects {
                edges {
                  node {
                    id
                    name
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

    return response.data?.data?.me?.projects?.edges || [];
  } catch (error) {
    console.error('Error listing projects:', error.response?.data || error.message);
    return [];
  }
}

async function createRailwayProject(token, name) {
  try {
    const response = await axios.post(
      'https://backboard.railway.app/graphql/v2',
      {
        query: `
          mutation {
            projectCreate(input: { name: "${name}" }) {
              project {
                id
                name
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

    if (response.data?.data?.projectCreate?.project) {
      return response.data.data.projectCreate.project;
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

async function createService(token, projectId, serviceName, githubRepo) {
  try {
    // Extract repo name
    const repoMatch = githubRepo.match(/github\.com[/:]([\w-]+\/[\w.-]+)(?:\.git)?$/);
    const repoName = repoMatch ? repoMatch[1] : null;

    if (!repoName) {
      throw new Error('Invalid GitHub repo URL');
    }

    // Try to create service
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

async function setServiceEnvVar(token, serviceId, key, value) {
  try {
    const response = await axios.post(
      'https://backboard.railway.app/graphql/v2',
      {
        query: `
          mutation {
            variableUpsert(
              serviceId: "${serviceId}"
              name: "${key}"
              value: "${value.replace(/"/g, '\\"')}"
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
    console.log(`⚠️ Could not set ${key}:`, error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('🚂 Creating Railway Worker Service...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const railwayToken = getEnvVar('RAILWAY_TOKEN');
  const githubRepo = 'https://github.com/ascespade/chatwoot-hybrid-1764267988118.git';
  const databaseUrl = getEnvVar('DATABASE_URL');
  const redisUrl = getEnvVar('REDIS_URL');
  const secretKeyBase = getEnvVar('SECRET_KEY_BASE');
  const frontendUrl = getEnvVar('FRONTEND_URL');

  if (!railwayToken) {
    throw new Error('RAILWAY_TOKEN not found');
  }

  try {
    // 1. List existing projects
    console.log('📋 Listing Railway projects...');
    const projects = await listRailwayProjects(railwayToken);

    console.log(`✅ Found ${projects.length} project(s):`);
    projects.forEach(({ node }) => {
      console.log(`   - ${node.name} (${node.id})`);
    });

    // 2. Find or create worker project
    let workerProject = projects.find(({ node }) =>
      node.name.includes('worker') || node.name.includes('chatwoot-worker')
    );

    if (!workerProject) {
      console.log('\n🔨 Creating new Worker project...');
      const newProject = await createRailwayProject(railwayToken, 'chatwoot-worker');
      workerProject = { node: newProject };
      console.log(`✅ Created project: ${newProject.name} (${newProject.id})`);
    } else {
      console.log(`\n✅ Using existing project: ${workerProject.node.name}`);
    }

    const projectId = workerProject.node.id;

    // 3. Create service
    console.log('\n⚙️ Creating Worker service...');
    try {
      const service = await createService(railwayToken, projectId, 'chatwoot-worker', githubRepo);
      console.log(`✅ Service created: ${service.name} (${service.id})`);

      // 4. Set environment variables
      console.log('\n🔐 Setting environment variables...');
      const envVars = {
        DATABASE_URL: databaseUrl,
        REDIS_URL: redisUrl,
        SECRET_KEY_BASE: secretKeyBase,
        FRONTEND_URL: frontendUrl,
        RAILS_ENV: 'production',
        NODE_ENV: 'production',
        RAILS_LOG_TO_STDOUT: 'true',
        RAILS_MAX_THREADS: '5',
        WORKER_COMMAND: 'bundle exec sidekiq -C config/sidekiq.yml'
      };

      for (const [key, value] of Object.entries(envVars)) {
        if (value) {
          await setServiceEnvVar(railwayToken, service.id, key, value);
        }
      }
      console.log('✅ Environment variables set');

      // 5. Set start command
      console.log('\n📝 Setting start command...');
      await axios.post(
        'https://backboard.railway.app/graphql/v2',
        {
          query: `
            mutation {
              serviceUpdate(
                id: "${service.id}"
                input: {
                  startCommand: "bundle exec sidekiq -C config/sidekiq.yml"
                }
              ) {
                id
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
      ).catch(() => {
        console.log('⚠️ Could not set start command via API (will use railway.toml)');
      });

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ RAILWAY WORKER SERVICE CREATED!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`🔗 Project: https://railway.app/project/${projectId}`);
      console.log(`⚙️ Service: ${service.name} (${service.id})`);
      console.log('\n⏳ Service will deploy automatically...');

    } catch (error) {
      console.log('\n⚠️ Could not create service via API');
      console.log('ℹ️ Service will be created when you connect GitHub:');
      console.log(`   1. Go to: https://railway.app/project/${projectId}`);
      console.log('   2. Click "New" → "GitHub Repo"');
      console.log(`   3. Select: ${githubRepo}`);
      console.log('   4. Service will deploy automatically\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();

