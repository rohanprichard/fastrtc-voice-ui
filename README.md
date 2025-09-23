# FastRTC Voice Widget

A language-agnostic, embeddable WebRTC voice chat widget that can be easily integrated into any website via CDN or npm. Built as a custom HTML element with a clean, accessible interface.

![FastRTC Voice Widget Demo](https://via.placeholder.com/400x200/4F46E5/FFFFFF?text=FastRTC+Voice+Widget)

Note: You will need to have an endpoint serving TURN server credentials. Read more on the [fastrtc docs](https://fastrtc.org/deployment/) about why it is required!

Here's a simple implementation:

```python
@app.get("/webrtc/turn-credentials")
async def get_turn_credentials():
    return get_twilio_turn_credentials(twilio_sid="", twilio_token="")
```
Serve it at the path mentioned here.

## ✨ Features

- 🎙️ **WebRTC Voice Chat** - Real-time audio communication
- 🖱️ **One-Click Integration** - Simple HTML element embedding
- 📱 **Responsive Design** - Works on desktop and mobile
- 🎨 **Customizable UI** - Multiple themes and positions
- 🔊 **Device Selection** - Choose microphones and speakers
- 🔇 **Mute Controls** - Easy mute/unmute functionality
- 🛠️ **Debug Mode** - Built-in debugging capabilities
- 🌐 **CDN Ready** - No build process required for usage

## 🚀 Quick Start

### CDN Installation (Recommended)

Add the script to your HTML `<head>` section:

```html
<head>
  <!-- GitHub Raw CDN (Primary - Direct from your repository) -->
  <script src="https://raw.githubusercontent.com/rohanprichard/fastrtc-voice-ui/main/dist/fastrtc-voice-widget.umd.js"></script>

  <!-- OR JSDelivr via GitHub Packages (Alternative - requires npm publish) -->
  <!-- <script src="https://cdn.jsdelivr.net/npm/@rohanprichard/fastrtc-voice-widget@latest/dist/fastrtc-voice-widget.umd.js"></script> -->
</head>
```

Then use the widget in your HTML body:

```html
<body>
  <fastrtc-voice-widget api-url="https://your-fastrtc-server.com"></fastrtc-voice-widget>
</body>
```

Here's a basic skeleton of what it would look like.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- GitHub Raw CDN (Primary) -->
  <script src="https://raw.githubusercontent.com/rohanprichard/fastrtc-voice-ui/main/dist/fastrtc-voice-widget.umd.js"></script>
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


## 🔧 Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Setup

```bash
# Clone repository
git clone https://github.com/rohanprichard/fastrtc-voice-ui.git
cd fastrtc-voice-ui

Make changes to the widget.js file, and use npm run build to build the dist.


### Building

The project uses Vite for building:

```bash
npm run build  # Production build
npm run dev    # Development build with watch
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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 📞 Support

For support, create an issue on GitHub and I will try to help where possible.
