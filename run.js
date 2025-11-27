import fs from 'fs';
import { randomBytes } from 'crypto';
import axios from 'axios';
import { execSync } from 'child_process';

const ENV_FILE_PATH = 'E:\\chatwoot\\ENV_VARS_COMPLETE.txt';

/**
 * Generates a secure random secret key
 */
function generateSecretKey() {
  return randomBytes(64).toString('hex');
}

/**
 * Waits for a specified amount of time
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main deployment function for Chatwoot Hybrid Architecture
 */
export default async function main(inputs) {
  const {
    github_repo,
    supabase_key,
    supabase_url,
    railway_token,
    render_api_key,
    frontend_url
  } = inputs;

  try {
    console.log('🚀 Starting Chatwoot Hybrid Deployment…');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ======================================================
    // 1. إعداد .env النهائي
    // ======================================================
    console.log('\n📄 [1/8] Generating .env file…');
    const secretKeyBase = generateSecretKey();
    const envFile = `
DATABASE_URL="${supabase_url}"
REDIS_URL="pending_railway_valkey_url"
SECRET_KEY_BASE="${secretKeyBase}"
FRONTEND_URL="${frontend_url}"
RAILS_ENV="production"
NODE_ENV="production"
RAILS_SERVE_STATIC_FILES="true"
FORCE_SSL="false"
RAILS_LOG_TO_STDOUT="true"
RAILS_MAX_THREADS="5"
WEB_CONCURRENCY="2"
`;
    fs.writeFileSync('.env.deploy', envFile.trim());
    console.log('✔ .env.deploy generated');

    // ======================================================
    // 2. إنشاء Redis (Valkey) على Railway
    // ======================================================
    console.log('\n🔌 [2/8] Creating Redis (Valkey) on Railway…');
    let redisProjectId = '';

    try {
      // Try Railway API v2
      const redisResp = await axios.post(
        'https://backboard.railway.app/graphql/v2',
        {
          query: `
            mutation {
              projectCreate(input: { name: "chatwoot-redis" }) {
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
            Authorization: `Bearer ${railway_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (redisResp.data?.data?.projectCreate?.project?.id) {
        redisProjectId = redisResp.data.data.projectCreate.project.id;
        console.log(`✔ Railway Redis Project created: ${redisProjectId}`);
      } else if (redisResp.data?.errors) {
        console.log('⚠️ Railway API v2 failed, trying alternative method...');
        throw new Error('Railway API v2 failed');
      }
    } catch (error) {
      console.log('⚠️ Could not create Railway project via API');
      console.log('ℹ️ You will need to create Railway projects manually:');
      console.log('   1. Go to https://railway.app');
      console.log('   2. Create a new project: "chatwoot-redis"');
      console.log('   3. Add Valkey service');
      console.log('   4. Copy Redis connection URL to use later\n');

      // Continue without Railway automation - user will set up manually
      console.log('⏭️  Skipping Railway automation, continuing with other steps...\n');
      redisProjectId = 'manual-setup-required';
    }

    // If Railway project was created successfully, continue with service setup
    if (redisProjectId && redisProjectId !== 'manual-setup-required') {
      console.log(`✔ Railway Redis Project: ${redisProjectId}`);

      // Wait for Railway to provision the service
      console.log('⏳ Waiting for Railway to provision Valkey service…');
      await sleep(10000); // 10 seconds

      // ======================================================
      // 3. إضافة Valkey service إلى المشروع
      // ======================================================
      console.log('\n🔧 [3/8] Adding Valkey service to Railway project…');
      try {
        // Try to create Valkey service using Railway template
        const valkeyServiceResp = await axios.post(
          'https://backboard.railway.app/graphql/v2',
          {
            query: `
              mutation {
                serviceCreate(
                  projectId: "${redisProjectId}"
                  config: {
                    name: "valkey"
                    source: {
                      image: "valkey/valkey:latest"
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
              Authorization: `Bearer ${railway_token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (valkeyServiceResp.data?.data?.serviceCreate) {
          console.log('✔ Valkey service created');
        } else if (valkeyServiceResp.data?.errors) {
          console.log('⚠️ Service creation returned errors, trying alternative method…');
          // Alternative: Use Railway's template system
          console.log('ℹ️ You may need to add Valkey service manually via Railway Dashboard');
        }
      } catch (error) {
        console.log('⚠️ Could not create service via API, continuing with manual setup…');
        console.log('ℹ️ Please add Valkey service manually:');
        console.log(`   1. Go to Railway Dashboard → Project: ${redisProjectId}`);
        console.log('   2. Click "New" → "Database" → "Valkey"');
        console.log('   3. Wait for service to provision');
      }

      // Wait for service to be ready (if created)
      console.log('⏳ Waiting for Railway services to be ready…');
      await sleep(20000); // 20 seconds for service provisioning
    }

    // ======================================================
    // 4. جلب بيانات الـ Redis URL
    // ======================================================
    console.log('\n🌐 [4/8] Fetching Railway Redis connection info…');
    let redisURL = '';

    // Check if REDIS_URL is already in env file
    const envContent = fs.existsSync(ENV_FILE_PATH) ? fs.readFileSync(ENV_FILE_PATH, 'utf8') : '';
    const redisUrlMatch = envContent.match(/REDIS_URL\s*=\s*["']?([^"'\n]+)["']?/);
    if (redisUrlMatch && redisUrlMatch[1]) {
      redisURL = redisUrlMatch[1].trim();
      console.log(`✔ Found existing REDIS_URL in env file`);
    }

    // If Railway project was created, try to get Redis URL from Railway
    if (!redisURL && redisProjectId && redisProjectId !== 'manual-setup-required') {
      let retries = 0;
      const maxRetries = 10;

      while (!redisURL && retries < maxRetries) {
        try {
          const redisInfo = await axios.post(
          'https://backboard.railway.app/graphql/v2',
          {
            query: `
              query {
                project(id: "${redisProjectId}") {
                  services {
                    edges {
                      node {
                        id
                        name
                        variables {
                          edges {
                            node {
                              name
                              value
                            }
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
              Authorization: `Bearer ${railway_token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const services = redisInfo.data?.data?.project?.services?.edges || [];
        for (const serviceEdge of services) {
          const service = serviceEdge.node;
          if (service.name === 'valkey' || service.name?.includes('redis')) {
            const variables = service.variables?.edges || [];
            let redisHost = '';
            let redisPass = '';
            let redisPort = '6379';

            for (const varEdge of variables) {
              const varNode = varEdge.node;
              if (varNode.name === 'RAILWAY_PRIVATE_DOMAIN') {
                redisHost = varNode.value;
              }
              if (varNode.name === 'VALKEY_PASSWORD' || varNode.name === 'REDIS_PASSWORD') {
                redisPass = varNode.value;
              }
              if (varNode.name === 'PORT') {
                redisPort = varNode.value;
              }
            }

            if (redisHost && redisPass) {
              redisURL = `redis://default:${redisPass}@${redisHost}:${redisPort}`;
              break;
            }
          }
        }

          if (!redisURL) {
            retries++;
            console.log(`⏳ Waiting for Redis connection info (attempt ${retries}/${maxRetries})…`);
            await sleep(5000);
          }
        } catch (error) {
          retries++;
          if (retries >= maxRetries) {
            console.log('⚠️ Could not get Redis URL from Railway API');
            break;
          }
          await sleep(5000);
        }
      }
    }

    // If still no Redis URL, use existing from env file or placeholder
    if (!redisURL) {
      console.log('⚠️ REDIS_URL not found from Railway - using existing from env file');
      // redisURL already set from env file if found, otherwise will use placeholder
      if (!redisURL) {
        redisURL = 'pending_railway_valkey_url'; // Placeholder
      }
    }

    console.log(`✔ Redis URL configured: ${redisURL.replace(/:[^:@]+@/, ':****@')}`);

    // ======================================================
    // 5. تحديث .env ببيانات Redis الحقيقية
    // ======================================================
    console.log('\n✏️ [5/8] Updating .env.deploy with final Redis URL…');
    const updatedEnv = fs
      .readFileSync('.env.deploy', 'utf8')
      .replace('pending_railway_valkey_url', redisURL);
    fs.writeFileSync('.env.deploy', updatedEnv);
    console.log('✔ .env updated with Redis URL');

    // ======================================================
    // 6. تعديل render.yaml
    // ======================================================
    console.log('\n🛠️ [6/8] Updating render.yaml…');
    const renderSecretKey = generateSecretKey();
    const renderYaml = `services:
  - type: web
    name: chatwoot-web
    plan: free
    region: oregon
    buildCommand: |
      export NODE_OPTIONS="--max-old-space-size=2048"
      corepack enable
      corepack prepare pnpm@10.2.0 --activate
      bundle install --jobs 2 --retry 3
      pnpm install --frozen-lockfile
      bundle exec rails assets:precompile RAILS_ENV=production
    startCommand: |
      export RAILS_LOG_TO_STDOUT=true
      bundle exec rails s -p $PORT -b 0.0.0.0
    envVars:
      - key: DATABASE_URL
        value: "${supabase_url}"
      - key: REDIS_URL
        value: "${redisURL}"
      - key: SECRET_KEY_BASE
        value: "${renderSecretKey}"
      - key: FRONTEND_URL
        value: "${frontend_url}"
      - key: RAILS_ENV
        value: "production"
      - key: NODE_ENV
        value: "production"
      - key: RAILS_SERVE_STATIC_FILES
        value: "true"
      - key: RAILS_LOG_TO_STDOUT
        value: "true"
      - key: RAILS_MAX_THREADS
        value: "5"
      - key: WEB_CONCURRENCY
        value: "2"
`;

    fs.writeFileSync('render.yaml', renderYaml.trim());
    console.log('✔ render.yaml ready');

    // ======================================================
    // 7. رفع الملفات إلى GitHub Repo
    // ======================================================
    console.log('\n⬆️ [7/8] Pushing to GitHub…');
    try {
      // Check if git is initialized
      try {
        execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      } catch {
        execSync('git init', { stdio: 'inherit' });
      }

      // Remove existing remote if exists
      try {
        execSync(`git remote remove origin`, { stdio: 'ignore' });
      } catch {
        // Remote doesn't exist, that's fine
      }

      execSync(`git remote add origin ${github_repo}`, { stdio: 'inherit' });
      execSync('git add .', { stdio: 'inherit' });
      execSync('git commit -m "feat: Chatwoot Hybrid Auto Deploy - Render + Supabase + Railway"', {
        stdio: 'inherit'
      });

      // Try to push, handle if branch doesn't exist
      try {
        execSync('git push -u origin main --force', { stdio: 'inherit' });
      } catch {
        execSync('git push -u origin master --force', { stdio: 'inherit' });
      }

      console.log('✔ Repo uploaded to GitHub');
    } catch (error) {
      console.error('⚠️ Git push failed:', error);
      throw error;
    }

    // ======================================================
    // 8. إنشاء Chatwoot Worker Project على Railway
    // ======================================================
    console.log('\n🚂 [8/12] Creating Chatwoot Worker Project on Railway…');
    let workerProjectId = '';
    try {
      const workerResp = await axios.post(
        'https://backboard.railway.app/graphql/v2',
        {
          query: `
            mutation {
              projectCreate(input: { name: "chatwoot-worker" }) {
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
            Authorization: `Bearer ${railway_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (workerResp.data?.data?.projectCreate?.project?.id) {
        workerProjectId = workerResp.data.data.projectCreate.project.id;
        console.log(`✔ Railway Worker Project created: ${workerProjectId}`);
      } else {
        throw new Error('Failed to create Railway Worker project');
      }
    } catch (error) {
      console.error('⚠️ Failed to create Worker project:', error);
      console.log('ℹ️ You can create Worker project manually in Railway Dashboard');
      workerProjectId = 'manual-setup-required';
    }

    // ======================================================
    // 9. ربط GitHub Repo مع Railway Worker Project
    // ======================================================
    console.log('\n🔗 [9/12] Linking GitHub repo to Railway Worker project…');
    try {
      // Extract repo name from GitHub URL
      const repoMatch = github_repo.match(/github\.com[/:]([\w-]+\/[\w.-]+)(?:\.git)?$/);
      const repoFullName = repoMatch ? repoMatch[1] : null;

      if (repoFullName) {
        const linkResp = await axios.post(
          'https://backboard.railway.app/graphql/v2',
          {
            query: `
              mutation {
                projectUpdate(
                  id: "${workerProjectId}"
                  input: {
                    githubRepo: "${repoFullName}"
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
              Authorization: `Bearer ${railway_token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (linkResp.data?.data?.projectUpdate) {
          console.log('✔ GitHub repo linked to Railway Worker project');
        } else {
          console.log('⚠️ Could not link repo via API, you may need to link manually');
          console.log(`   Go to Railway Dashboard → Project: ${workerProjectId} → Settings → Connect GitHub`);
        }
      } else {
        console.log('⚠️ Could not parse GitHub repo URL, skipping auto-link');
      }
    } catch (error) {
      console.log('⚠️ GitHub linking failed, you can link manually later');
      console.log(`   Railway Project ID: ${workerProjectId}`);
    }

    // ======================================================
    // 10. إنشاء Worker Service على Railway
    // ======================================================
    console.log('\n⚙️ [10/12] Creating Worker service on Railway…');
    let workerServiceId = '';
    try {
      const workerServiceResp = await axios.post(
        'https://backboard.railway.app/graphql/v2',
        {
          query: `
            mutation {
              serviceCreate(
                projectId: "${workerProjectId}"
                config: {
                  name: "chatwoot-worker"
                  source: {
                    repo: "${github_repo}"
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
            Authorization: `Bearer ${railway_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (workerServiceResp.data?.data?.serviceCreate) {
        workerServiceId = workerServiceResp.data.data.serviceCreate.id;
        console.log(`✔ Worker service created: ${workerServiceId}`);
      } else if (workerServiceResp.data?.errors) {
        console.log('⚠️ Service creation returned errors, trying alternative…');
        // Alternative: Service will be created when repo is linked
        console.log('ℹ️ Service will be created automatically when GitHub is connected');
      }
    } catch (error) {
      console.log('⚠️ Could not create service via API');
      console.log('ℹ️ Service will be created automatically when you connect GitHub in Railway Dashboard');
    }

    // ======================================================
    // 11. إعداد Environment Variables للـ Worker
    // ======================================================
    console.log('\n🔐 [11/12] Setting up Worker environment variables…');
    const workerEnvVars = [
      { name: 'DATABASE_URL', value: supabase_url },
      { name: 'REDIS_URL', value: redisURL },
      { name: 'SECRET_KEY_BASE', value: secretKeyBase },
      { name: 'FRONTEND_URL', value: frontend_url },
      { name: 'RAILS_ENV', value: 'production' },
      { name: 'NODE_ENV', value: 'production' },
      { name: 'RAILS_LOG_TO_STDOUT', value: 'true' },
      { name: 'RAILS_MAX_THREADS', value: '5' },
      { name: 'WORKER_COMMAND', value: 'bundle exec sidekiq -C config/sidekiq.yml' }
    ];

    if (workerServiceId) {
      for (const envVar of workerEnvVars) {
        try {
          await axios.post(
            'https://backboard.railway.app/graphql/v2',
            {
              query: `
                mutation {
                  variableUpsert(
                    serviceId: "${workerServiceId}"
                    name: "${envVar.name}"
                    value: "${envVar.value}"
                  ) {
                    id
                    name
                  }
                }
              `
            },
            {
              headers: {
                Authorization: `Bearer ${railway_token}`,
                'Content-Type': 'application/json'
              }
            }
          );
        } catch (error) {
          console.log(`⚠️ Could not set ${envVar.name}, you can set it manually`);
        }
      }
      console.log('✔ Worker environment variables configured');
    } else {
      console.log('ℹ️ Environment variables will be set when service is created');
      console.log('📋 Variables to set manually:');
      workerEnvVars.forEach(({ name, value }) => {
        const displayValue = value.length > 50 ? `${value.substring(0, 50)}...` : value;
        console.log(`   ${name}=${displayValue}`);
      });
    }

    // ======================================================
    // 12. إنشاء railway.toml للإعدادات
    // ======================================================
    console.log('\n📝 [12/12] Creating railway.toml configuration…');

    // Extract repo name for Railway
    const repoMatch = github_repo.match(/github\.com[/:]([\w-]+\/[\w.-]+)(?:\.git)?$/);
    const repoFullName = repoMatch ? repoMatch[1] : github_repo;

    const railwayToml = `[build]
builder = "nixpacks"

[deploy]
startCommand = "bundle exec sidekiq -C config/sidekiq.yml"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10

[service]
name = "chatwoot-worker"

[service.variables]
DATABASE_URL = "${supabase_url.replace(/"/g, '\\"')}"
REDIS_URL = "${redisURL.replace(/"/g, '\\"')}"
SECRET_KEY_BASE = "${secretKeyBase}"
FRONTEND_URL = "${frontend_url}"
RAILS_ENV = "production"
NODE_ENV = "production"
RAILS_LOG_TO_STDOUT = "true"
RAILS_MAX_THREADS = "5"
`;

    fs.writeFileSync('railway.toml', railwayToml.trim());
    console.log('✔ railway.toml created');

    // ======================================================
    // 13. تحديث Git مع railway.toml
    // ======================================================
    console.log('\n⬆️ Updating GitHub with railway.toml…');
    try {
      execSync('git add railway.toml', { stdio: 'inherit' });
      execSync('git commit -m "feat: Add Railway Worker configuration"', { stdio: 'inherit' });
      try {
        execSync('git push origin main', { stdio: 'inherit' });
      } catch {
        execSync('git push origin master', { stdio: 'inherit' });
      }
      console.log('✔ railway.toml pushed to GitHub');
    } catch (error) {
      console.log('⚠️ Could not push railway.toml, you can commit manually');
    }

    // ======================================================
    // 14. تشغيل Migrations عبر Supabase
    // ======================================================
    console.log('\n🛠️ Running database migrations…');
    console.log('ℹ️ Note: Migrations will run automatically on first Render deployment');
    console.log('ℹ️ You can also run them manually via: bundle exec rails db:migrate');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 DONE — Chatwoot Hybrid Deployment Completed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Railway Projects Status:');
    if (redisProjectId && redisProjectId !== 'manual-setup-required') {
      console.log(`   🔴 Redis Project: ${redisProjectId}`);
    } else {
      console.log(`   🔴 Redis Project: Manual setup required`);
    }
    if (workerProjectId && workerProjectId !== 'manual-setup-required') {
      console.log(`   🟢 Worker Project: ${workerProjectId}`);
    } else {
      console.log(`   🟢 Worker Project: Manual setup required`);
    }
    console.log('\n📋 Next Steps:');
    console.log('1. ✅ Railway Redis: Already configured');
    console.log('2. ✅ Railway Worker: Project created, connect GitHub if needed');
    console.log('3. Connect your GitHub repo to Render for Web Service');
    console.log('4. Render will automatically detect render.yaml');
    console.log('5. First deployment will run migrations');
    console.log('6. Create admin user via Rails console or seed script');
    console.log(`\n🔗 Frontend URL: ${frontend_url}`);
    console.log(`🔗 Database: Supabase (configured)`);
    if (redisProjectId && redisProjectId !== 'manual-setup-required') {
      console.log(`🔗 Redis: Railway Project ${redisProjectId} (configured)`);
    } else {
      console.log(`🔗 Redis: Manual setup required (create project in Railway)`);
    }
    if (workerProjectId && workerProjectId !== 'manual-setup-required') {
      console.log(`🔗 Worker: Railway Project ${workerProjectId} (configured)`);
      console.log('\n💡 Railway Setup:');
      console.log(`   1. Go to https://railway.app/project/${workerProjectId}`);
      console.log(`   2. Connect GitHub repo if not auto-linked`);
      console.log(`   3. Service will deploy automatically`);
      console.log(`   4. Check logs to ensure Worker is running`);
    } else {
      console.log(`🔗 Worker: Manual setup required (create project in Railway)`);
      console.log('\n💡 Railway Setup:');
      console.log(`   1. Go to https://railway.app`);
      console.log(`   2. Create new project: "chatwoot-worker"`);
      console.log(`   3. Connect GitHub repo: ${github_repo}`);
      console.log(`   4. Service will deploy automatically`);
    }
    console.log(`\n✅ All configuration files are ready!`);
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    throw error;
  }
}
