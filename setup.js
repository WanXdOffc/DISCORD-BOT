import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Setup script - Create necessary folder structure
 */
function setupFolders() {
  const folders = [
    'command/music',
    'command/moderation',
    'command/economy',
    'command/leveling',
    'command/games',
    'command/utility',
    'lib/database/schemas',
    'lib/handlers/events',
    'lib/utils',
    'lib/web',
    'views',
    'asset/images',
    'asset/fonts',
    'asset/data',
    'logs',
    'trash',
  ];

  console.log('🔧 Setting up folder structure...\n');

  let created = 0;
  let skipped = 0;

  folders.forEach(folder => {
    const folderPath = join(process.cwd(), folder);
    
    if (!existsSync(folderPath)) {
      try {
        mkdirSync(folderPath, { recursive: true });
        console.log(`✅ Created: ${folder}`);
        created++;
      } catch (error) {
        console.error(`❌ Failed to create: ${folder}`, error.message);
      }
    } else {
      console.log(`⏭️  Exists: ${folder}`);
      skipped++;
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log(`📁 Folder setup complete!`);
  console.log(`   Created: ${created} folders`);
  console.log(`   Skipped: ${skipped} folders (already exist)`);
  console.log('='.repeat(50));
  console.log('\n📝 Next steps:');
  console.log('   1. Copy .env.example to .env');
  console.log('   2. Fill in your credentials in .env');
  console.log('   3. Run: node deploy-commands.js');
  console.log('   4. Run: npm start\n');
}

// Run setup
setupFolders();