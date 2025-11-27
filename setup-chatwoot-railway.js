import { execSync } from 'child_process';
import fs from 'fs';

/**
 * Complete Chatwoot setup on Railway using Docker
 */

const CHATWOOT_REPO = 'https://github.com/chatwoot/chatwoot.git';
const SECRET_KEY_BASE = execSync('openssl rand -hex 64', { encoding: 'utf8' }).trim();

async function main() {
  console.log('🚀 Setting up Chatwoot on Railway (Docker)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. Get Postgres variables
    console.log('📋 Getting Postgres connection info...');
    execSync('npx @railway/cli service', { stdio: 'inherit' }); // Select Postgres
    
    const postgresVars = execSync('npx @railway/cli variables', { encoding: 'utf8' });
    console.log(postgresVars);

    // Extract Postgres info
    const pgHost = postgresVars.match(/PGHOST[^\n]+/)?.[0]?.split('│')[1]?.trim() || '';
    const pgPort = postgresVars.match(/PGPORT[^\n]+/)?.[0]?.split('│')[1]?.trim() || '5432';
    const pgUser = postgresVars.match(/PGUSER[^\n]+/)?.[0]?.split('│')[1]?.trim() || '';
    const pgPassword = postgresVars.match(/PGPASSWORD[^\n]+/)?.[0]?.split('│')[1]?.trim() || '';
    const pgDatabase = postgresVars.match(/PGDATABASE[^\n]+/)?.[0]?.split('│')[1]?.trim() || '';

    const DATABASE_URL = `postgres://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;
    console.log(`✅ DATABASE_URL: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

    // 2. Get Valkey (Redis) variables
    console.log('📋 Getting Valkey connection info...');
    execSync('npx @railway/cli service', { stdio: 'inherit' }); // Select Valkey
    
    const valkeyVars = execSync('npx @railway/cli variables', { encoding: 'utf8' });
    console.log(valkeyVars);

    // Extract Valkey info
    const valkeyHost = valkeyVars.match(/VALKEY_HOST[^\n]+/)?.[0]?.split('│')[1]?.trim() || '';
    const valkeyPort = valkeyVars.match(/VALKEY_PORT[^\n]+/)?.[0]?.split('│')[1]?.trim() || '6379';
    const valkeyPassword = valkeyVars.match(/VALKEY_PASSWORD[^\n]+/)?.[0]?.split('│')[1]?.trim() || '';
    const valkeyUser = valkeyVars.match(/VALKEY_USER[^\n]+/)?.[0]?.split('│')[1]?.trim() || 'default';

    const REDIS_URL = `redis://${valkeyUser}:${valkeyPassword}@${valkeyHost}:${valkeyPort}`;
    console.log(`✅ REDIS_URL: ${REDIS_URL.replace(/:[^:@]+@/, ':****@')}\n`);

    // 3. Get Chatwoot service URL
    console.log('📋 Getting Chatwoot service URL...');
    execSync('npx @railway/cli service', { stdio: 'inherit' }); // Select Chatwoot
    
    const chatwootVars = execSync('npx @railway/cli variables', { encoding: 'utf8' });
    const railwayUrl = chatwootVars.match(/RAILWAY_PUBLIC_DOMAIN[^\n]+/)?.[0]?.split('│')[1]?.trim() || 
                      chatwootVars.match(/RAILWAY_STATIC_URL[^\n]+/)?.[0]?.split('│')[1]?.trim() || '';
    
    const FRONTEND_URL = railwayUrl ? `https://${railwayUrl}` : 'https://YOURDOMAIN.com';
    console.log(`✅ FRONTEND_URL: ${FRONTEND_URL}\n`);

    // 4. Set Chatwoot environment variables
    console.log('🔐 Setting Chatwoot environment variables...');
    
    const envVars = {
      'RAILS_ENV': 'production',
      'NODE_ENV': 'production',
      'INSTALLATION_ENV': 'docker',
      'SECRET_KEY_BASE': SECRET_KEY_BASE,
      'DATABASE_URL': DATABASE_URL,
      'REDIS_URL': REDIS_URL,
      'RAILS_LOG_TO_STDOUT': 'true',
      'RAILS_SERVE_STATIC_FILES': 'true',
      'ACTION_MAILER_DEFAULT_FROM': 'chatwoot@example.com',
      'FRONTEND_URL': FRONTEND_URL
    };

    // Note: Railway CLI variables command syntax might be different
    // We'll create a script to set them
    console.log('\n📝 Environment variables to set:');
    for (const [key, value] of Object.entries(envVars)) {
      console.log(`   ${key}=${value.length > 50 ? value.substring(0, 50) + '...' : value}`);
    }

    // Save to file for reference
    const envFile = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync('.env.railway', envFile);
    console.log('\n✅ Environment variables saved to .env.railway');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SETUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 Next Steps:');
    console.log('1. Set environment variables in Railway Dashboard');
    console.log('2. Deploy Chatwoot service');
    console.log('3. Run migrations: bundle exec rails db:chatwoot_prepare');
    console.log(`4. Access Chatwoot at: ${FRONTEND_URL}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();

