#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const commands = {
  build: {
    description: 'Build the widget for production',
    action: () => {
      console.log('Building FastRTC Voice Widget...');
      try {
        execSync('npm run build', { stdio: 'inherit' });
        console.log('✅ Build completed successfully!');
        console.log('');
        console.log('Usage:');
        console.log('1. Add to your HTML head (IMPORTANT - must be in <head>):');
        console.log('   <script src="https://npm.pkg.github.com/@rohanprichard/fastrtc-voice-widget@latest/dist/fastrtc-voice-widget.umd.js"></script>');
        console.log('');
        console.log('2. Use in your HTML body:');
        console.log('   <fastrtc-voice-widget api-url="http://localhost:8000"></fastrtc-voice-widget>');
        console.log('   (Replace localhost:8000 with your actual WebRTC API URL)');
        console.log('');
        console.log('⚠️  IMPORTANT: Script must be in <head> section, not at bottom of page!');
        console.log('');
        console.log('3. Optional attributes:');
        console.log('   - api-url: Your WebRTC API URL (required)');
        console.log('   - auth-token: Authentication token (optional)');
        console.log('   - show-device-selection: Show device selection menu (optional)');
        console.log('   - is-connected: Demo mode - shows connected state (optional)');
        console.log('');
        console.log('4. Widget States:');
        console.log('   - Idle: Plain/neutral button - starts voice chat');
        console.log('   - Connecting: Orange pulsing animation');
        console.log('   - Connected: Red button with expanded controls');
        console.log('   - Mute button: Plain (not muted) → Yellow (muted)');
        console.log('');
        console.log('5. Device Selection:');
        console.log('   - Click settings icon (⚙️) in top-right corner');
        console.log('   - Requests permissions only when clicked (on-demand)');
        console.log('   - Lists all available microphones and speakers');
        console.log('   - Real-time device switching during calls');
        console.log('');
        console.log('6. Audio Features:');
        console.log('   - Hidden audio element with autoplay for remote stream');
        console.log('   - Mute button properly mutes/unmutes local microphone');
        console.log('   - Smaller icons (16px) for cleaner appearance');
        console.log('   - Wider pill design for better proportions');
      } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
      }
    }
  },
  dev: {
    description: 'Start development server with watch mode',
    action: () => {
      console.log('Starting development server...');
      try {
        execSync('npm run dev', { stdio: 'inherit' });
      } catch (error) {
        console.error('❌ Development server failed:', error.message);
        process.exit(1);
      }
    }
  },
  help: {
    description: 'Show this help message',
    action: () => {
      console.log('FastRTC Voice Widget CLI');
      console.log('');
      console.log('Usage: npx fastrtc-voice-widget <command>');
      console.log('');
      console.log('Commands:');
      Object.entries(commands).forEach(([name, cmd]) => {
        console.log(`  ${name.padEnd(8)} - ${cmd.description}`);
      });
      console.log('');
      console.log('Examples:');
      console.log('  npx fastrtc-voice-widget build');
      console.log('  npx fastrtc-voice-widget dev');
      console.log('  npx fastrtc-voice-widget help');
    }
  }
};

function main() {
  const command = process.argv[2] || 'help';

  if (commands[command]) {
    commands[command].action();
  } else {
    console.log(`Unknown command: ${command}`);
    console.log('');
    commands.help.action();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
