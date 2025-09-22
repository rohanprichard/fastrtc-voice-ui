// FastRTC Voice Widget - Language-agnostic embeddable widget
class FastRTCVoiceWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isWebRTCConnected = false;
    this.isConnecting = false;
    this.peerConnection = null;
    this.currentStream = null;
    this.dataChannel = null;
    this.audioOutputElement = null;
    this.shadowClickListenerAdded = false;
    this.playbackStarted = false;
    this.debugEnabled = false;

    // Device state
    this.inputDevices = [];
    this.outputDevices = [];
    this.selectedInputDeviceId = '';
    this.selectedOutputDeviceId = '';

    // UI state
    this.isExpanded = false;
    this.isMicMuted = false;
    this.menuPosition = 'bottom-right';
    this.isDarkMode = false;
  }

  static get observedAttributes() {
    return ['debug', 'menu-position', 'dark-mode'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'debug') {
      this.debugEnabled = this.hasAttribute('debug');
    } else if (name === 'menu-position') {
      const menuPosition = this.getAttribute('menu-position');
      if (menuPosition && ['top', 'top-left', 'top-right', 'bottom', 'bottom-left', 'bottom-right'].includes(menuPosition)) {
        this.menuPosition = menuPosition;
      } else {
        this.menuPosition = 'bottom-right';
      }
      this.render();
    } else if (name === 'dark-mode') {
      this.isDarkMode = this.hasAttribute('dark-mode');
      this.render();
    }
  }

  debugLog(...args) {
    if (this.debugEnabled) {
      console.log(...args);
    }
  }

  connectedCallback() {
    try {
      this.apiUrl = this.getAttribute('api-url') || '';
      this.authToken = this.getAttribute('auth-token') || '';
      this.showDeviceSelection = this.hasAttribute('show-device-selection');
      this.debugEnabled = this.hasAttribute('debug');

      // Get menu position attribute
      const menuPosition = this.getAttribute('menu-position');
      if (menuPosition && ['top', 'top-left', 'top-right', 'bottom', 'bottom-left', 'bottom-right'].includes(menuPosition)) {
        this.menuPosition = menuPosition;
      } else {
        this.menuPosition = 'bottom-right'; // default
      }

      // Get dark mode attribute
      this.isDarkMode = this.hasAttribute('dark-mode');

    // Check for demo attributes
    if (this.hasAttribute('is-connected')) {
      this.isWebRTCConnected = true;
    }

      this.render();
      this.setupEventListeners();
      // Device enumeration now happens only when settings button is clicked
    } catch (error) {
      console.error('Error in connectedCallback:', error);
    }
  }

  disconnectedCallback() {
    this.cleanup();
  }

  // WebRTC functionality
  async getTurnCredentials() {
    try {
      const response = await fetch(`${this.apiUrl}/webrtc/turn-credentials`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get TURN credentials: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching TURN credentials:', error);
      return {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      };
    }
  }

  async enumerateDevices() {
    // Only enumerate devices if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.warn('MediaDevices API not available');
      return;
    }

    try {

      // Request microphone access first to get permissions
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true
          }
        });
        // Stop the stream immediately after getting permissions
        stream.getTracks().forEach(track => track.stop());
        console.log('Microphone access granted for device enumeration');
      } catch (micError) {
        // Continue anyway - some devices might still be enumerable
      }

      // Now enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();

      this.inputDevices = devices
        .filter(device => device.kind === 'audioinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: (device.label && device.label.trim())
            ? device.label.trim()
            : (device.deviceId === 'default' ? 'Default Microphone' : 'Unknown Microphone')
        }));

      this.outputDevices = devices
        .filter(device => device.kind === 'audiooutput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: (device.label && device.label.trim())
            ? device.label.trim()
            : (device.deviceId === 'default' ? 'Default Speaker' : 'Unknown Speaker')
        }));

      

      if (!this.selectedInputDeviceId && this.inputDevices.length > 0) {
        this.selectedInputDeviceId = this.inputDevices[0].deviceId || 'default';
      }
      if (!this.selectedOutputDeviceId && this.outputDevices.length > 0) {
        this.selectedOutputDeviceId = this.outputDevices[0].deviceId || 'default';
      }

      this.rebuildDeviceMenu();
      this.updateDeviceMenus();
    } catch (error) {
      console.error('Error enumerating devices:', error);

      // If enumeration fails, try to get basic device info
      if (error.name === 'NotAllowedError') {
        // User denied permission, but we can still show default devices
        this.inputDevices = [{
          deviceId: 'default',
          label: 'Default Microphone'
        }];
        this.outputDevices = [{
          deviceId: 'default',
          label: 'Default Speaker'
        }];
        
      } else {
        // For other errors, show placeholder devices
        this.inputDevices = [{
          deviceId: '',
          label: 'No microphone detected'
        }];
        this.outputDevices = [{
          deviceId: '',
          label: 'No speaker detected'
        }];
        
      }

      this.rebuildDeviceMenu();
      this.updateDeviceMenus();
    }
  }

  async setupWebRTC() {
    if (!this.audioOutputElement) {
      console.error("Audio output element not found");
      return;
    }

    try {
      const constraints = {
        audio: this.selectedInputDeviceId ? {
          deviceId: { exact: this.selectedInputDeviceId },
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true
        } : {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      

      this.currentStream = stream;
      this.peerConnection = new RTCPeerConnection(await this.getTurnCredentials());

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, stream);
      });

      // Handle remote tracks
      this.peerConnection.addEventListener("track", (evt) => {

        if (evt.track.kind === 'audio') {
          if (this.audioOutputElement) {
            if (this.audioOutputElement.srcObject !== evt.streams[0]) {
              // New remote stream attached; reset playback flag so we re-trigger play()
              this.playbackStarted = false;
              this.audioOutputElement.srcObject = evt.streams[0];

              // Set volume and unmute
              this.audioOutputElement.volume = 1.0;
              this.audioOutputElement.muted = false;
              // Defer to unified playback handler to avoid multiple play() calls
              this.ensurePlayback();
            } else {
              
            }
          } else {
            console.error("❌ Audio element not found!");
          }
        } else {
          
        }
      });

      // Create data channel
      this.dataChannel = this.peerConnection.createDataChannel("text");
      this.dataChannel.onopen = () => {
        // If data channel opens and we're not marked as connected, force connection state
        if (!this.isWebRTCConnected) {
          this.isWebRTCConnected = true;
          this.isConnecting = false;
          this.updateUI();

          // Force unmute audio element when data channel opens
          this.forceUnmuteAudio();
        }
      };
      this.dataChannel.onclose = () => {};
      this.dataChannel.onerror = (error) => console.error("Data channel error:", error);
      this.dataChannel.onmessage = (event) => {
        // If we receive data channel messages and we're not marked as connected, force connection state
        if (!this.isWebRTCConnected) {
          this.isWebRTCConnected = true;
          this.updateUI();

          // Force unmute audio element when data channel messages arrive
          this.forceUnmuteAudio();
        }
      };

      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      const randomId = Math.random().toString(36).substring(7);
      const webrtcId = randomId;

      // Handle ICE candidates
      this.peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
          fetch(`${this.apiUrl}/webrtc/offer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              candidate: candidate.toJSON(),
              webrtc_id: webrtcId,
              type: "ice-candidate",
            })
          });
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {

        // If ICE is connected and we have data channel messages, consider it connected
        if (this.peerConnection.iceConnectionState === 'connected' ||
            this.peerConnection.iceConnectionState === 'completed') {
          if (!this.isWebRTCConnected) {
            this.isWebRTCConnected = true;
            this.isConnecting = false;
            this.updateUI();

            // Force unmute audio element when ICE connected
            this.forceUnmuteAudio();
          }
        } else if (this.peerConnection.iceConnectionState === 'failed' ||
                   this.peerConnection.iceConnectionState === 'disconnected') {
          this.isWebRTCConnected = false;
          this.isConnecting = false;
          this.updateUI();
        }
      };

      this.peerConnection.onconnectionstatechange = () => {

        if (this.peerConnection.connectionState === 'connected') {
          this.isWebRTCConnected = true;
          this.isConnecting = false;
          this.updateUI();

          // Force unmute audio element when connected
          this.forceUnmuteAudio();
        } else if (this.peerConnection.connectionState === 'connecting') {
          
        } else if (this.peerConnection.connectionState === 'new') {
          
        } else if (this.peerConnection.connectionState === 'failed') {
          this.isWebRTCConnected = false;
          this.isConnecting = false;
          this.updateUI();
        } else if (this.peerConnection.connectionState === 'disconnected' ||
                   this.peerConnection.connectionState === 'closed') {
          this.isWebRTCConnected = false;
          this.isConnecting = false;
          this.updateUI();
        }
      };

      // Send offer to server
      const response = await fetch(`${this.apiUrl}/webrtc/offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sdp: offer.sdp,
          type: offer.type,
          webrtc_id: webrtcId
        })
      });

      let serverResponse;
      try {
        serverResponse = await response.json();

        // Validate server response
        if (!serverResponse || typeof serverResponse !== 'object') {
          throw new Error('Invalid server response: not an object');
        }

        if (!serverResponse.sdp || !serverResponse.type) {
          throw new Error('Invalid server response: missing sdp or type');
        }

        // Create proper RTCSessionDescription object
        const answer = new RTCSessionDescription({
          type: serverResponse.type,
          sdp: serverResponse.sdp
        });

        await this.peerConnection.setRemoteDescription(answer);

      } catch (parseError) {
        // Handle JSON parsing errors or validation errors
        console.error("Error parsing server response:", parseError);
        console.error("Server response was:", serverResponse);
        throw new Error(`Failed to parse server response: ${parseError.message}`);
      }

    } catch (error) {
      console.error("Error in WebRTC setup process:", error);

      // Provide more specific error messages
      if (error.name === 'NotAllowedError') {
        alert("Microphone access denied. Please allow microphone access in your browser settings.");
      } else if (error.name === 'NotFoundError') {
        alert("No microphone found. Please connect a microphone and try again.");
      } else if (error.name === 'NotReadableError') {
        alert("Microphone is in use by another application. Please close other apps using the microphone.");
      } else if (error.message.includes('Failed to parse SessionDescription')) {
        alert("WebRTC connection failed: Invalid server response. Please check your WebRTC backend.");
        console.error("Server response was:", serverResponse);
      } else {
        alert("WebRTC connection failed: " + error.message);
      }

      // Clean up on error
      this.isWebRTCConnected = false;
      this.updateUI();
    }
  }

  async shutdownWebRTC() {
    console.log("Shutting down WebRTC connection...");

    if (this.peerConnection) {
      const senders = this.peerConnection.getSenders();
      senders.forEach(sender => {
        if (sender.track) {
          console.log(`Stopping track: ${sender.track.kind}`);
          sender.track.stop();
        }
      });

      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => {
        track.stop();
      });
      this.currentStream = null;
    }

    console.log("WebRTC connection closed and microphone access released.");
    this.isWebRTCConnected = false;
    this.updateUI();
  }

  async handleToggleVoiceChat() {
    if (this.isWebRTCConnected) {
      await this.shutdownWebRTC();
    } else {
      if (this.isConnecting) {
        console.log("Connection attempt already in progress.");
        return;
      }

      // RTCPeerConnection will be created inside setupWebRTC()

      this.isConnecting = true;
      this.updateUI();
      console.log("Attempting to start voice chat setup...");

      try {
        await this.setupWebRTC();
        // Don't reset isConnecting here - let the event handlers in setupWebRTC() handle state transitions
        // The connection state will be managed by the ICE/connection state change handlers
      } catch (error) {
        console.error("Error during setupWebRTC:", error);
        // Only reset connecting state on actual error
        this.isConnecting = false;
        this.updateUI();
      }
      // Note: If setupWebRTC() succeeds, the event handlers will set isWebRTCConnected = true
      // and isConnecting = false, which will trigger UI updates automatically
    }
  }

  async handleInputDeviceChange(deviceId) {
    // Only proceed if deviceId is valid
    if (!deviceId || deviceId === '') {
      console.warn('Invalid input device ID:', deviceId);
      return;
    }

    const selected = this.inputDevices.find(d => (d.deviceId || 'default') === deviceId);
    console.log('Selected input device info:', selected || { deviceId, note: 'Not found in inputDevices' });

    this.selectedInputDeviceId = deviceId;
    this.updateDeviceMenus();

    // If we're connected, we need to replace the input track
    if (this.isWebRTCConnected && this.peerConnection && this.currentStream) {
      try {
        console.log(`Switching input device to: ${deviceId}`);

        // Get new stream with selected device
        const constraints = {
          audio: deviceId && deviceId !== 'default' ? {
            deviceId: { exact: deviceId },
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true
          } : {
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true
          },
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("New microphone stream obtained.");

        // Stop old tracks
        this.currentStream.getTracks().forEach(track => {
          track.stop();
        });

        // Replace tracks in peer connection
        const sender = this.peerConnection.getSenders().find(s =>
          s.track && s.track.kind === 'audio'
        );

        if (sender && newStream.getAudioTracks().length > 0) {
          await sender.replaceTrack(newStream.getAudioTracks()[0]);
          console.log("Audio track replaced successfully.");
        } else {
          console.error("Could not find audio sender or new audio track.");
        }

        // Update stream reference
        this.currentStream = newStream;

      } catch (error) {
        console.error('Error changing input device during connection:', error);
        // Try to revert the device selection if it failed
        const originalDevice = this.selectedInputDeviceId;
        this.selectedInputDeviceId = originalDevice;
        this.updateDeviceMenus();
      }
    }
  }

  async handleOutputDeviceChange(deviceId) {
    // Only proceed if deviceId is valid
    if (!deviceId || deviceId === '') {
      console.warn('Invalid output device ID:', deviceId);
      return;
    }

    const selected = this.outputDevices.find(d => (d.deviceId || 'default') === deviceId);
    console.log('Selected output device info:', selected || { deviceId, note: 'Not found in outputDevices' });

    this.selectedOutputDeviceId = deviceId;
    this.updateDeviceMenus();

    if (this.audioOutputElement && this.audioOutputElement.setSinkId) {
      try {
        // Only try to set sink ID if it's not the default device
        if (deviceId !== 'default') {
          await this.audioOutputElement.setSinkId(deviceId);
          console.log(`Audio output device changed to: ${deviceId}`);
        } else {
          console.log('Using default audio output device');
        }
      } catch (error) {
        console.error('Error setting audio output device:', error);
      }
    } else {
      console.warn('Audio output device change not supported in this browser');
    }
  }

  async handleMuteToggle() {
    if (!this.isWebRTCConnected || !this.peerConnection || !this.currentStream) {
      console.warn('Cannot toggle mute - not connected or no stream');
      return;
    }

    try {
      // Get all audio tracks from the current stream
      const audioTracks = this.currentStream.getAudioTracks();

      if (audioTracks.length === 0) {
        console.warn('No audio tracks found in current stream');
        return;
      }

      // Toggle mute state
      this.isMicMuted = !this.isMicMuted;

      // Enable/disable all audio tracks (this stops/starts sending audio)
      audioTracks.forEach(track => {
        track.enabled = !this.isMicMuted;
      });

      console.log(`Microphone ${this.isMicMuted ? 'muted' : 'unmuted'}`);

      // Find the audio sender in the peer connection
      const sender = this.peerConnection.getSenders().find(s =>
        s.track && s.track.kind === 'audio'
      );

      if (sender) {
        // Update the sender to reflect the mute state
        // The track.enabled property change should be sufficient
        // but we can also update the sender if needed
        console.log('Audio sender found, mute state updated');
      }

      this.updateUI();
    } catch (error) {
      console.error('Error toggling mute:', error);
      // Revert the state if there was an error
      this.isMicMuted = !this.isMicMuted;
      this.updateUI();
    }
  }

  // UI functionality
  render() {
    const container = document.createElement('div');
    container.className = 'widget-container';

    const style = document.createElement('style');
    style.textContent = `
      .widget-container {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        ${this.isDarkMode ? `
          background: #1f2937;
          border: 1px solid #374151;
        ` : `
          background: #ffffff;
          border: 1px solid #e5e7eb;
        `}
        border-radius: 24px;
        padding: 8px 16px 8px 12px;
        ${this.isDarkMode ? `
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
        ` : `
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        `}
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-sizing: border-box;
        position: relative;
        transition: all 0.2s ease;
        max-width: 320px;
        min-width: 200px;
      }

      .widget-container:hover {
        ${this.isDarkMode ? `
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
        ` : `
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        `}
      }

      .widget-buttons {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .mic-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        ${this.isDarkMode ? `
          background: #1f2937;
          border: 2px solid #374151;
        ` : `
          background: #ffffff;
          border: 2px solid #e5e7eb;
        `}
        cursor: pointer;
        transition: all 0.2s ease;
        outline: none;
        flex-shrink: 0;
      }

      .mic-button.active {
        ${this.isDarkMode ? `
          background: #dc2626;
          border-color: #b91c1c;
        ` : `
          background: #ef4444;
          border-color: #dc2626;
        `}
        color: #ffffff;
      }

      .mic-button.connecting {
        ${this.isDarkMode ? `
          background: #d97706;
          border-color: #b45309;
        ` : `
          background: #f59e0b;
          border-color: #d97706;
        `}
        color: #ffffff;
      }

      .mic-button.muted {
        background: #fbbf24;
        ${this.isDarkMode ? `
          border-color: #d97706;
        ` : `
          border-color: #f59e0b;
        `}
        ${this.isDarkMode ? `
          color: #111827 !important;
        ` : `
          color: #111827 !important;
        `}
      }

      .mic-button.muted svg, .mic-button.muted svg * {
        ${this.isDarkMode ? `
          stroke: #111827 !important;
        ` : `
          stroke: #111827 !important;
        `}
      }

      /* Call button (idle state) - plain/neutral */
      .mic-button:not(.active):not(.connecting):not(.muted) {
        ${this.isDarkMode ? `
          background: #1f2937;
          border-color: #374151;
          color: #f9fafb;
        ` : `
          background: #ffffff;
          border-color: #e5e7eb;
          color: #374151;
        `}
      }

      .mic-button:not(.active):not(.connecting):not(.muted) svg {
        ${this.isDarkMode ? `
          color: #f9fafb;
        ` : `
          color: #374151;
        `}
      }

      .mic-button:hover {
        transform: scale(1.05);
      }

      .mic-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .text-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .primary-text {
        font-size: 13px;
        font-weight: 500;
        ${this.isDarkMode ? `
          color: #f9fafb;
        ` : `
          color: #111827;
        `}
        margin: 0;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .secondary-text {
        font-size: 11px;
        ${this.isDarkMode ? `
          color: #d1d5db;
        ` : `
          color: #6b7280;
        `}
        margin: 0;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .menu-container {
        position: absolute;
        top: 50%;
        right: 8px;
        transform: translateY(-50%);
        z-index: 10;
      }

      .settings-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        ${this.isDarkMode ? `
          background: #111827;
          color: #f9fafb;
        ` : `
          background: #f3f4f6;
          color: #374151;
        `}
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        outline: none;
      }

      .settings-button:hover {
        ${this.isDarkMode ? `
          background: #374151;
          color: #f9fafb;
        ` : `
          background: #e5e7eb;
          color: #374151;
        `}
      }

      .settings-button svg {
        ${this.isDarkMode ? `
          color: #f9fafb;
        ` : `
          color: #374151;
        `}
      }

      .device-menu {
        position: absolute;
        ${this.isDarkMode ? `
          background: #1f2937;
          border: 1px solid #374151;
        ` : `
          background: white;
          border: 1px solid #e5e7eb;
        `}
        border-radius: 8px;
        ${this.isDarkMode ? `
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
        ` : `
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        `}
        min-width: 200px;
        z-index: 1000;
        display: none;
      }

      /* Device menu positioning */
      .device-menu[data-position="top"] {
        bottom: calc(100% + 4px);
        right: 0;
        transform: none;
      }

      .device-menu[data-position="top-left"] {
        bottom: calc(100% + 4px);
        right: 0;
        transform: none;
      }

      .device-menu[data-position="top-right"] {
        bottom: calc(100% + 4px);
        left: 0;
        transform: none;
      }

      .device-menu[data-position="bottom"] {
        top: calc(100% + 4px);
        right: 0;
        transform: none;
      }

      .device-menu[data-position="bottom-left"] {
        top: calc(100% + 4px);
        right: 0;
        transform: none;
      }

      .device-menu[data-position="bottom-right"] {
        top: calc(100% + 4px);
        left: 0;
        transform: none;
      }

      .device-menu.open {
        display: block;
      }

      .device-menu-section {
        padding: 8px;
      }

      .device-menu-label {
        font-size: 9px;
        font-weight: 500;
        ${this.isDarkMode ? `
          color: #9ca3af;
        ` : `
          color: #9ca3af;
        `}
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0 8px 4px;
      }

      .device-option {
        display: flex;
        align-items: center;
        padding: 8px;
        cursor: pointer;
        border-radius: 4px;
        transition: background-color 0.15s ease;
      }

      .device-option:hover {
        ${this.isDarkMode ? `
          background-color: #374151;
        ` : `
          background-color: #f3f4f6;
        `}
      }

      .device-option.selected {
        ${this.isDarkMode ? `
          background-color: #3b82f6;
        ` : `
          background-color: #eff6ff;
        `}
        color: #ffffff;
      }

      .device-option.selected label {
        color: #ffffff;
        font-weight: 500;
      }

      .device-option input[type="radio"] {
        margin-right: 8px;
      }

      .device-option label {
        flex: 1;
        cursor: pointer;
        font-size: 11px;
        ${this.isDarkMode ? `
          color: #d1d5db;
        ` : `
          color: #6b7280;
        `}
      }

      .audio-element {
        position: absolute;
        visibility: hidden;
        width: 1px;
        height: 1px;
        pointer-events: none;
        opacity: 0;
      }

      .audio-element[autoplay] {
        /* Ensure autoplay works */
      }

      .hidden {
        display: none !important;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .connecting-animation {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `;

    // Create the main button
    const micButton = document.createElement('button');
    micButton.className = `mic-button ${this.isWebRTCConnected ? 'active' : ''} ${this.isConnecting ? 'connecting' : ''}`;
    micButton.setAttribute('aria-label', this.isWebRTCConnected ? 'Stop voice chat' : 'Start voice chat');
    micButton.setAttribute('data-role', 'call');

    if (this.isConnecting && !this.isWebRTCConnected) {
      micButton.classList.add('connecting-animation');
    }

    // Add screen reader text
    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = this.isWebRTCConnected ? 'Stop Voice Chat' : 'Start Voice Chat';

    // Add icons based on state (Lucide-style SVGs)
    const callIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone-icon lucide-phone"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>'
      
    micButton.innerHTML = callIcon;
    micButton.appendChild(srText);

    // Create text container
    const textContainer = document.createElement('div');
    textContainer.className = 'text-container';

    const primaryText = document.createElement('p');
    primaryText.className = 'primary-text';
    primaryText.textContent = (this.isConnecting && !this.isWebRTCConnected) ? 'Connecting...' : this.isWebRTCConnected ? 'Connected' : 'Click to start!';

    const secondaryText = document.createElement('p');
    secondaryText.className = 'secondary-text';
    secondaryText.textContent = 'Click to disconnect';
    if (!this.isWebRTCConnected) {
      secondaryText.style.display = 'none';
    }

    textContainer.appendChild(primaryText);
    textContainer.appendChild(secondaryText);

    // Create device menu if needed
    let menuContainer = null;
    if (this.showDeviceSelection) {
      menuContainer = document.createElement('div');
      menuContainer.className = 'menu-container';

      const settingsButton = document.createElement('button');
      settingsButton.className = 'settings-button';
      settingsButton.setAttribute('aria-label', 'Device settings');
      settingsButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-icon lucide-settings"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>';

      const deviceMenu = document.createElement('div');
      deviceMenu.className = 'device-menu';
      deviceMenu.setAttribute('data-position', this.menuPosition);
      this.buildDeviceMenuContent(deviceMenu);

      settingsButton.addEventListener('click', async (e) => {
        e.stopPropagation();

        // If devices haven't been enumerated yet, do it now
        if (this.inputDevices.length === 0 && this.outputDevices.length === 0) {
          console.log('Settings button clicked - enumerating devices...');
          await this.enumerateDevices();
        }

        deviceMenu.classList.toggle('open');
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!menuContainer.contains(e.target)) {
          deviceMenu.classList.remove('open');
        }
      });

      menuContainer.appendChild(settingsButton);
      menuContainer.appendChild(deviceMenu);
    }

    // Create expanded state buttons if connected
    if (this.isWebRTCConnected) {
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'widget-buttons';

      // Hang up button (red)
      const hangUpButton = document.createElement('button');
      hangUpButton.className = 'mic-button active';
      hangUpButton.setAttribute('aria-label', 'Hang up');
      hangUpButton.setAttribute('data-role', 'hangup');
      hangUpButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone-off-icon lucide-phone-off"><path d="M10.1 13.9a14 14 0 0 0 3.732 2.668 1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2 18 18 0 0 1-12.728-5.272"/><path d="M22 2 2 22"/><path d="M4.76 13.582A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 .244.473"/></svg>'

      // Mute button
      const muteButton = document.createElement('button');
      muteButton.className = `mic-button ${this.isMicMuted ? 'muted' : ''}`;
      muteButton.setAttribute('aria-label', this.isMicMuted ? 'Unmute microphone' : 'Mute microphone');
      muteButton.setAttribute('data-role', 'mute');
      muteButton.innerHTML = this.isMicMuted
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic-off-icon lucide-mic-off"><path d="M12 19v3"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M16.95 16.95A7 7 0 0 1 5 12v-2"/><path d="M18.89 13.23A7 7 0 0 0 19 12v-2"/><path d="m2 2 20 20"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic-icon lucide-mic"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 19v3"/><path d="M8 22h8"/></svg>'
      buttonsContainer.appendChild(hangUpButton);
      buttonsContainer.appendChild(muteButton);
      container.appendChild(buttonsContainer);
    } else {
      container.appendChild(micButton);
    }

    container.appendChild(textContainer);

    if (menuContainer) {
      // Position the menu container absolutely over the button area
      container.style.position = 'relative';
      container.appendChild(menuContainer);
    }

    // Hidden audio element with autoplay for remote stream (preserve across re-renders)
    const existingAudioElement = this.audioOutputElement;
    const existingStream = existingAudioElement?.srcObject || null;

    if (existingAudioElement) {
      this.audioOutputElement = existingAudioElement;
    } else {
      this.audioOutputElement = document.createElement('audio');
      this.audioOutputElement.className = 'audio-element';
      this.audioOutputElement.id = 'fastrtcvoice-widget-audio';
      this.audioOutputElement.autoplay = true;
      this.audioOutputElement.playsInline = true;
      this.audioOutputElement.controls = false;
      this.audioOutputElement.muted = false;
      this.audioOutputElement.volume = 1.0;

    // Add debugging events to audio element (only once per element)
      this.audioOutputElement.addEventListener('error', (e) => {
        console.error('Audio element error:', e);
      });
    }

    // Add click handler to the widget container to enable audio playback (once)
    if (!this.shadowClickListenerAdded) {
      this.shadowRoot.addEventListener('click', () => {
        if (this.audioOutputElement) {
          if (this.audioOutputElement.muted) {
            console.log('🔊 User clicked widget - attempting to unmute audio');
            this.forceUnmuteAudio();
          }
          this.ensurePlayback();
        }
      });
      this.shadowClickListenerAdded = true;
    }

    container.appendChild(this.audioOutputElement);

    // If there was an existing stream attached before re-render, ensure it remains attached
    if (existingStream && !this.audioOutputElement.srcObject) {
      this.audioOutputElement.srcObject = existingStream;
    }

    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(container);
  }

  updateUI() {
    this.render();
    this.setupEventListeners();
  }

  updateDeviceMenus() {
    // This would update the radio button states in the device menu
    const deviceMenu = this.shadowRoot.querySelector('.device-menu');
    if (deviceMenu) {
      const inputRadios = deviceMenu.querySelectorAll('input[name="input-device"]');
      const outputRadios = deviceMenu.querySelectorAll('input[name="output-device"]');

      inputRadios.forEach(radio => {
        radio.checked = radio.value === this.selectedInputDeviceId;
        const option = radio.closest('.device-option');
        option.classList.toggle('selected', radio.checked);
      });

      outputRadios.forEach(radio => {
        radio.checked = radio.value === this.selectedOutputDeviceId;
        const option = radio.closest('.device-option');
        option.classList.toggle('selected', radio.checked);
      });
    }
  }

  buildDeviceMenuContent(deviceMenu) {
    if (!deviceMenu) return;

    // Clear existing content
    deviceMenu.innerHTML = '';

    // Input devices section
    const inputSection = document.createElement('div');
    inputSection.className = 'device-menu-section';

    const inputLabel = document.createElement('div');
    inputLabel.className = 'device-menu-label';
    inputLabel.textContent = 'Input Device';
    inputSection.appendChild(inputLabel);

    this.inputDevices.forEach((device) => {
      const option = document.createElement('div');
      option.className = `device-option ${device.deviceId === this.selectedInputDeviceId ? 'selected' : ''}`;

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'input-device';
      radio.value = device.deviceId || 'default';
      radio.checked = device.deviceId === this.selectedInputDeviceId;

      const label = document.createElement('label');
      label.textContent = device.label;

      option.appendChild(radio);
      option.appendChild(label);

      option.addEventListener('click', () => {
        this.handleInputDeviceChange(device.deviceId || 'default');
        deviceMenu.classList.remove('open');
      });

      inputSection.appendChild(option);
    });

    // Output devices section
    const outputSection = document.createElement('div');
    outputSection.className = 'device-menu-section';

    const outputLabel = document.createElement('div');
    outputLabel.className = 'device-menu-label';
    outputLabel.textContent = 'Output Device';
    outputSection.appendChild(outputLabel);

    this.outputDevices.forEach((device) => {
      const option = document.createElement('div');
      option.className = `device-option ${device.deviceId === this.selectedOutputDeviceId ? 'selected' : ''}`;

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'output-device';
      radio.value = device.deviceId || 'default';
      radio.checked = device.deviceId === this.selectedOutputDeviceId;

      const label = document.createElement('label');
      label.textContent = device.label;

      option.appendChild(radio);
      option.appendChild(label);

      option.addEventListener('click', () => {
        this.handleOutputDeviceChange(device.deviceId || 'default');
        deviceMenu.classList.remove('open');
      });

      outputSection.appendChild(option);
    });

    deviceMenu.appendChild(inputSection);
    deviceMenu.appendChild(outputSection);
  }

  rebuildDeviceMenu() {
    const deviceMenu = this.shadowRoot && this.shadowRoot.querySelector('.device-menu');
    if (deviceMenu) {
      this.buildDeviceMenuContent(deviceMenu);
    }
  }

  setupEventListeners() {
    // Main mic button (for start/stop)
    const micButton = this.shadowRoot.querySelector('.mic-button[data-role="call"]');
    if (micButton) {
      micButton.addEventListener('click', () => this.handleToggleVoiceChat());
    }

    // Hang up button (red)
    const hangUpButton = this.shadowRoot.querySelector('.mic-button[data-role="hangup"]');
    if (hangUpButton && !hangUpButton.hasEventListener) {
      hangUpButton.addEventListener('click', () => this.handleToggleVoiceChat());
      hangUpButton.hasEventListener = true;
    }

    // Mute button (toggle)
    const muteButton = this.shadowRoot.querySelector('.mic-button[data-role="mute"]');
    if (muteButton && !muteButton.hasEventListener) {
      muteButton.addEventListener('click', () => {
        this.handleMuteToggle();
        // Update icon and class immediately to reflect state
        const isMutedNow = this.isMicMuted;
        muteButton.classList.toggle('muted', isMutedNow);
        muteButton.setAttribute('aria-label', isMutedNow ? 'Unmute microphone' : 'Mute microphone');
        muteButton.innerHTML = isMutedNow
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic-off-icon lucide-mic-off"><path d="M12 19v3"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M16.95 16.95A7 7 0 0 1 5 12v-2"/><path d="M18.89 13.23A7 7 0 0 0 19 12v-2"/><path d="m2 2 20 20"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic-icon lucide-mic"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 19v3"/><path d="M8 22h8"/></svg>';
      });
      muteButton.hasEventListener = true;
    }
  }

  cleanup() {
    this.shutdownWebRTC();

    if (this.audioOutputElement) {
      console.log('Cleaning up audio element');
      this.audioOutputElement.srcObject = null;
      this.audioOutputElement.pause();
    }
    this.playbackStarted = false;
  }

  // Force unmute audio element with multiple techniques
  forceUnmuteAudio() {
    if (!this.audioOutputElement) {
      console.error('Audio element not found');
      return;
    }

    // Method 1: Direct property setting
    this.audioOutputElement.muted = false;
    this.audioOutputElement.volume = 1.0;

    // Method 2: Try to set sink ID (for output device control)
    if (this.audioOutputElement.setSinkId && this.selectedOutputDeviceId) {
      this.audioOutputElement.setSinkId(this.selectedOutputDeviceId).catch(() => {});
    }

    // Method 3: Delegate actual playback to a single unified handler
    

    this.ensurePlayback();
    
  }

  // Ensure playback starts only once to avoid overlapping play() calls
  ensurePlayback() {
    if (!this.audioOutputElement || this.playbackStarted === true) return;
    if (!this.audioOutputElement.srcObject) return;

    if (this.audioOutputElement.paused) {
      const playPromise = this.audioOutputElement.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.playbackStarted = true;
        }).catch(error => {
          
        });
      }
    } else {
      this.playbackStarted = true;
    }
  }

  // Debug method to check audio status
  debugAudioStatus() {
    console.group('🔊 Audio Status Debug');
    console.log('Audio element exists:', !!this.audioOutputElement);
    console.log('Audio element muted:', this.audioOutputElement?.muted);
    console.log('Audio element volume:', this.audioOutputElement?.volume);
    console.log('Audio element srcObject:', this.audioOutputElement?.srcObject);
    console.log('Audio element paused:', this.audioOutputElement?.paused);
    console.log('Audio element readyState:', this.audioOutputElement?.readyState);
    console.log('WebRTC connected:', this.isWebRTCConnected);
    console.log('Peer connection state:', this.peerConnection?.connectionState);
    console.log('Current stream tracks:', this.currentStream?.getTracks().length || 0);
    console.log('Peer connection senders:', this.peerConnection?.getSenders().length || 0);

    if (this.peerConnection) {
      const receivers = this.peerConnection.getReceivers();
      console.log('Peer connection receivers:', receivers.length);
      receivers.forEach((receiver, index) => {
        console.log(`Receiver ${index}:`, {
          track: receiver.track ? {
            kind: receiver.track.kind,
            id: receiver.track.id,
            enabled: receiver.track.enabled,
            readyState: receiver.track.readyState
          } : null
        });
      });
    }

    if (this.audioOutputElement?.srcObject) {
      const stream = this.audioOutputElement.srcObject;
      console.log('Audio stream details:', {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().map(t => ({
          kind: t.kind,
          id: t.id,
          enabled: t.enabled,
          readyState: t.readyState
        }))
      });
    }

    console.groupEnd();
  }
}

// Register the web component
if (!customElements.get('fastrtcvoice-widget')) {
  customElements.define('fastrtcvoice-widget', FastRTCVoiceWidget);
}

// Rely on the browser's native custom element upgrade lifecycle

// Export for use in other contexts
window.FastRTCVoiceWidget = FastRTCVoiceWidget;
