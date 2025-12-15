import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Verifying Discord Hosei BOT Installation...\n');

let errors = 0;
let warnings = 0;

// Check required folders
const requiredFolders = [
  'views',
  'command',
  'lib',
  'lib/handlers',
  'lib/handlers/events',
  'lib/utils',
  'lib/web',
  'lib/database',
];

console.log('📁 Checking folder structure...');
requiredFolders.forEach(folder => {
  if (existsSync(folder)) {
    console.log(`  ✅ ${folder}`);
  } else {
    console.log(`  ❌ ${folder} - MISSING!`);
    errors++;
  }
});

// Check views files
console.log('\n📄 Checking view files...');
const requiredViews = ['index.ejs', 'dashboard.ejs', 'guild.ejs', 'error.ejs'];
if (existsSync('views')) {
  const viewFiles = readdirSync('views');
  requiredViews.forEach(view => {
    if (viewFiles.includes(view)) {
      console.log(`  ✅ views/${view}`);
    } else {
      console.log(`  ❌ views/${view} - MISSING!`);
      errors++;
    }
  });
} else {
  console.log('  ❌ views folder not found!');
  errors++;
}

// Check environment variables
console.log('\n🔐 Checking environment variables...');
const requiredEnv = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'CLIENT_SECRET',
  'MONGODB_URI',
  'SESSION_SECRET',
];

const optionalEnv = [
  'OPENAI_API_KEY',
  'OPENROUTER_API_KEY',
];

requiredEnv.forEach(env => {
  if (process.env[env]) {
    console.log(`  ✅ ${env}`);
  } else {
    console.log(`  ❌ ${env} - NOT SET!`);
    errors++;
  }
});

console.log('\n⚠️  Optional variables:');
optionalEnv.forEach(env => {
  if (process.env[env]) {
    console.log(`  ✅ ${env} (AI features enabled)`);
  } else {
    console.log(`  ⚠️  ${env} (AI features disabled)`);
    warnings++;
  }
});

// Check node_modules
console.log('\n📦 Checking dependencies...');
const criticalPackages = [
  'discord.js',
  '@discordjs/voice',
  'discord-player',
  'express',
  'mongoose',
  'libsodium-wrappers',
];

criticalPackages.forEach(pkg => {
  try {
    const pkgPath = join(process.cwd(), 'node_modules', pkg);
    if (existsSync(pkgPath)) {
      console.log(`  ✅ ${pkg}`);
    } else {
      console.log(`  ❌ ${pkg} - NOT INSTALLED!`);
      errors++;
    }
  } catch {
    console.log(`  ❌ ${pkg} - ERROR!`);
    errors++;
  }
});

// Check @discordjs/voice version
console.log('\n🔊 Checking voice package version...');
try {
  const voicePkg = await import('@discordjs/voice');
  console.log('  ✅ @discordjs/voice is installed');
  
  // Read package.json to check version
  const pkgJsonPath = join(process.cwd(), 'node_modules/@discordjs/voice/package.json');
  if (existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(await import('fs').then(fs => 
      fs.promises.readFile(pkgJsonPath, 'utf-8')
    ));
    const version = pkgJson.version;
    if (version.startsWith('0.17')) {
      console.log(`  ⚠️  Version ${version} - Update recommended!`);
      console.log('     Run: npm install @discordjs/voice@latest');
      warnings++;
    } else {
      console.log(`  ✅ Version ${version} - OK!`);
    }
  }
} catch (error) {
  console.log('  ❌ @discordjs/voice - NOT FOUND!');
  errors++;
}

// Check libsodium
console.log('\n🔒 Checking encryption library...');
try {
  await import('libsodium-wrappers');
  console.log('  ✅ libsodium-wrappers installed');
} catch {
  console.log('  ⚠️  libsodium-wrappers not found');
  console.log('     This may cause music encryption issues');
  console.log('     Run: npm install libsodium-wrappers');
  warnings++;
}

// Check command files
console.log('\n🎮 Checking commands...');
let commandCount = 0;
const commandFolders = ['music', 'moderation', 'utility'];
commandFolders.forEach(folder => {
  const path = join('command', folder);
  if (existsSync(path)) {
    const files = readdirSync(path).filter(f => f.endsWith('.js'));
    commandCount += files.length;
    console.log(`  ✅ ${folder}: ${files.length} commands`);
  } else {
    console.log(`  ⚠️  ${folder}: folder not found`);
    warnings++;
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Verification Summary');
console.log('='.repeat(50));
console.log(`Commands found: ${commandCount}`);
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);

if (errors === 0 && warnings === 0) {
  console.log('\n✅ Perfect! Everything is configured correctly!');
  console.log('   Run: npm start');
} else if (errors === 0) {
  console.log('\n⚠️  Setup is OK, but there are some warnings.');
  console.log('   Bot will work, but some features may be limited.');
  console.log('   Run: npm start');
} else {
  console.log('\n❌ Setup has errors! Please fix them before running the bot.');
  console.log('\n💡 Quick fixes:');
  console.log('   1. Run: npm run setup (create folders)');
  console.log('   2. Copy .env.example to .env and fill in values');
  console.log('   3. Run: npm install');
  console.log('   4. Create missing view files in views/ folder');
}

console.log('\n📖 For detailed help, see: QUICKSTART.md or FIX_ISSUES.md\n');

process.exit(errors > 0 ? 1 : 0);