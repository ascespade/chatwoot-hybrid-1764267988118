import fs from 'fs';
import path from 'path';

/**
 * Helper script to extract environment variables from ENV_VARS_COMPLETE.txt
 * Usage: node extract-env-vars.js [path-to-env-file]
 */
function extractEnvVars(filePath = 'E:\\chatwoot\\ENV_VARS_COMPLETE.txt') {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      console.log('\n📝 Please provide the path to your ENV_VARS_COMPLETE.txt file');
      return null;
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

    // Display extracted variables
    console.log('📋 Extracted Environment Variables:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const requiredVars = {
      SUPABASE_URL: vars.SUPABASE_URL || vars.DATABASE_URL,
      SUPABASE_KEY: vars.SUPABASE_KEY || vars.SUPABASE_SERVICE_KEY || vars.SUPABASE_SERVICE_ROLE_KEY,
      RAILWAY_TOKEN: vars.RAILWAY_TOKEN || vars.RAILWAY_API_TOKEN,
      RENDER_API_KEY: vars.RENDER_API_KEY || vars.RENDER_API_TOKEN,
      GITHUB_REPO: vars.GITHUB_REPO || vars.REPO_URL,
      FRONTEND_URL: vars.FRONTEND_URL || vars.APP_URL || vars.CHATWOOT_URL
    };

    console.log('Required Variables for MCP Tool:\n');
    for (const [key, value] of Object.entries(requiredVars)) {
      if (value) {
        const displayValue = value.length > 50 ? `${value.substring(0, 50)}...` : value;
        console.log(`✅ ${key}: ${displayValue}`);
      } else {
        console.log(`❌ ${key}: NOT FOUND`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Save to .env.example for reference
    const envExample = Object.entries(requiredVars)
      .map(([key, value]) => {
        if (value) {
          return `${key}=${value}`;
        }
        return `# ${key}=your_value_here`;
      })
      .join('\n');

    fs.writeFileSync('.env.example', envExample);
    console.log('💾 Saved to .env.example for reference\n');

    return requiredVars;
  } catch (error) {
    console.error('❌ Error extracting variables:', error.message);
    return null;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];
  extractEnvVars(filePath);
}

export { extractEnvVars };

