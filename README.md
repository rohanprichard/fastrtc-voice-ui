# FastRTC Voice Widget

A language-agnostic, embeddable WebRTC voice chat widget that can be easily integrated into any website via CDN or npm. Built as a custom HTML element with a clean, accessible interface.

![FastRTC Voice Widget Demo](https://via.placeholder.com/400x200/4F46E5/FFFFFF?text=FastRTC+Voice+Widget)

## ✨ Features

- 🎙️ **WebRTC Voice Chat** - Real-time audio communication
- 🖱️ **One-Click Integration** - Simple HTML element embedding
- 📱 **Responsive Design** - Works on desktop and mobile
- 🎨 **Customizable UI** - Multiple themes and positions
- 🔊 **Device Selection** - Choose microphones and speakers
- 🔇 **Mute Controls** - Easy mute/unmute functionality
- 🛠️ **Debug Mode** - Built-in debugging capabilities
- 🌐 **CDN Ready** - No build process required for basic usage

## 🚀 Quick Start

### CDN Installation (Recommended)

Add the script to your HTML `<head>` section:

```html
<head>
  <script src="https://unpkg.com/@rohanprichard/fastrtc-voice-widget@latest/dist/fastrtc-voice-widget.js"></script>
</head>
```

Then use the widget in your HTML body:

```html
<body>
  <fastrtc-voice-widget api-url="https://your-webrtc-server.com"></fastrtc-voice-widget>
</body>
```

### NPM Installation

```bash
npm install @rohanprichard/fastrtc-voice-widget
```

Then import and use in your JavaScript:

```javascript
import 'fastrtc-voice-widget';

document.body.innerHTML += '<fastrtc-voice-widget api-url="https://your-webrtc-server.com"></fastrtc-voice-widget>';
```

## 📖 Usage

### Basic Implementation

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <script src="https://unpkg.com/@rohanprichard/fastrtc-voice-widget@latest/dist/fastrtc-voice-widget.js"></script>
</head>
<body>
  <fastrtc-voice-widget
    api-url="https://your-webrtc-server.com"
    auth-token="your-auth-token">
  </fastrtc-voice-widget>
</body>
</html>
```

### Configuration Options

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `api-url` | string | - | **Required.** Your WebRTC server URL |
| `auth-token` | string | - | Optional authentication token |
| `menu-position` | string | "bottom-right" | Widget position: "top", "top-left", "top-right", "bottom", "bottom-left", "bottom-right" |
| `dark-mode` | boolean | false | Enable dark theme |
| `debug` | boolean | false | Enable debug logging |
| `show-device-selection` | boolean | false | Show device selection on load |
| `is-connected` | boolean | false | Demo mode - shows connected state |

### Advanced Configuration

```html
<fastrtc-voice-widget
  api-url="https://your-webrtc-server.com"
  auth-token="your-auth-token"
  menu-position="top-left"
  dark-mode
  debug
  show-device-selection>
</fastrtc-voice-widget>
```

## 🎨 Widget States

The widget has several visual states:

- **Idle**: Neutral button - click to start voice chat
- **Connecting**: Orange pulsing animation
- **Connected**: Red button with expanded controls
- **Muted**: Yellow mute button when microphone is muted

## 🛠️ Device Management

The widget includes comprehensive device management:

- **On-demand permissions** - Only requests access when needed
- **Real-time switching** - Change devices during active calls
- **Device enumeration** - Lists all available microphones and speakers
- **Audio output** - Dedicated hidden audio element for remote stream

## 🎯 CLI Commands

This package includes a CLI tool for development:

```bash
# Install CLI globally
npm install -g @rohanprichard/fastrtc-voice-widget

# Build for production
fastrtc-voice-widget build

# Start development server
fastrtc-voice-widget dev

# Show help
fastrtc-voice-widget help
```

## 📦 Package Contents

```
dist/
├── fastrtc-voice-widget.umd.js    # UMD build for CDN
├── fastrtc-voice-widget.umd.js.map # Source map
src/
├── widget.js                      # Main widget source
cli.js                             # CLI tool
package.json                       # Package configuration
```

## 🔧 Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Setup

```bash
# Clone repository
git clone https://github.com/rohanprichard/fastrtc-voice-ui.git
cd fastrtc-voice-ui

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Project Structure

```
├── src/
│   └── widget.js          # Main widget component
├── cli.js                 # CLI tool
├── vite.config.js         # Build configuration
├── package.json           # Package metadata
└── README.md              # This file
```

### Building

The project uses Vite for building:

```bash
npm run build  # Production build
npm run dev    # Development build with watch
```

## 🎮 API Reference

### Custom Element: `<fastrtc-voice-widget>`

#### Properties
- `isConnected` - Boolean indicating WebRTC connection status
- `isMicMuted` - Boolean indicating microphone mute status
- `isExpanded` - Boolean indicating if widget is expanded

#### Methods
- `connect()` - Initiate WebRTC connection
- `disconnect()` - Close WebRTC connection
- `toggleMute()` - Toggle microphone mute state
- `selectInputDevice(deviceId)` - Change input device
- `selectOutputDevice(deviceId)` - Change output device

#### Events
- `connection-established` - Fired when WebRTC connection is made
- `connection-lost` - Fired when WebRTC connection is lost
- `microphone-muted` - Fired when microphone is muted
- `microphone-unmuted` - Fired when microphone is unmuted

### Usage Example

```javascript
// Get widget reference
const widget = document.querySelector('fastrtc-voice-widget');

// Listen for events
widget.addEventListener('connection-established', () => {
  console.log('Voice chat connected!');
});

widget.addEventListener('microphone-muted', () => {
  console.log('Microphone muted');
});

// Programmatically control widget
widget.connect();
widget.toggleMute();
```

## 🔍 Troubleshooting

### Common Issues

1. **No audio devices found**
   - Ensure HTTPS is used (required for WebRTC)
   - Check browser permissions
   - Try refreshing the page

2. **Connection failed**
   - Verify `api-url` is correct
   - Check server is running and accessible
   - Review browser console for errors

3. **Widget not appearing**
   - Ensure script is loaded in `<head>`
   - Check for JavaScript errors in console
   - Verify custom element is properly defined

### Debug Mode

Enable debug mode to see detailed logging:

```html
<fastrtc-voice-widget debug api-url="..."></fastrtc-voice-widget>
```

Check browser console for detailed logs and connection information.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Build the project (`npm run build`)
5. Test your changes
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Style

- Use 2 spaces for indentation
- Follow ES6+ standards
- Add JSDoc comments for new functions
- Test your changes thoroughly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with WebRTC APIs
- Styled with modern CSS
- Tested across multiple browsers
- Designed for accessibility

## 📞 Support

For support, email [your-email@example.com] or create an issue on GitHub.

---

**Made with ❤️ for the WebRTC community**
