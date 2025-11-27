import fs from 'fs';
import { randomBytes } from 'crypto';
import axios from 'axios';
import { execSync } from 'child_process';
import readline from 'readline';

/**
 * Interactive deployment script for Chatwoot Hybrid Architecture
 * This script will guide you through the deployment process
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('🚀 Chatwoot Hybrid Deployment - Interactive Setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Collect all required information
  console.log('📋 Please provide the following information:\n');

  const github_repo = await question('🔗 GitHub Repository URL: ');
  const supabase_url = await question('🗄️  Supabase Database URL: ');
  const supabase_key = await question('🔑 Supabase Service Role Key: ');
  const railway_token = await question('🚂 Railway API Token: ');
  const render_api_key = await question('🎨 Render API Key: ');
  const frontend_url = await question('🌐 Frontend URL (e.g., https://chatwoot.example.com): ');

  console.log('\n⏳ Starting deployment...\n');

  // Import and run the main deployment function
  const { default: deployFunction } = await import('./run.js');

  try {
    await deployFunction({
      github_repo: github_repo.trim(),
      supabase_url: supabase_url.trim(),
      supabase_key: supabase_key.trim(),
      railway_token: railway_token.trim(),
      render_api_key: render_api_key.trim(),
      frontend_url: frontend_url.trim()
    });

    console.log('\n✅ Deployment script completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Go to Render Dashboard and connect your GitHub repo');
    console.log('2. Render will auto-detect render.yaml');
    console.log('3. Wait for first deployment (5-10 minutes)');
    console.log(`4. Your Chatwoot will be available at: ${frontend_url}`);

  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();

