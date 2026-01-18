<p align="center">
  <img src="https://img.shields.io/badge/build-passing-success" alt="Build Status">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/license-ISC-blue" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen?logo=nodedotjs&logoColor=white" alt="Node.js Version">
  <img src="https://img.shields.io/badge/electron-40.0.0-47848f?logo=electron&logoColor=white" alt="Electron Version">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform">
</p>

<h1 align="center">OpenBuzzer</h1>

<p align="center">
  <strong>Open Source Desktop Application for TimeBuzzer RGB LED Control</strong>
</p>

<p align="center">
  <a href="https://timebuzzer.com/">Website</a> •
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## About

**OpenBuzzer** is an open-source Electron-based desktop application designed to control the RGB LED lighting system of the [TimeBuzzer](https://timebuzzer.com/) device. The application provides an intuitive interface for managing LED animations, brightness, speed, and interactive touch responses across three independent LED zones.

### What is TimeBuzzer?

TimeBuzzer is a physical device that combines time management with visual feedback through RGB LED lighting. This controller application allows you to fully customize and control the LED experience on your TimeBuzzer device.

## Features

### LED Control
- **3-Zone RGB Control**: Independent control of Left, Center/Front, and Right LED zones
- **21+ Built-in Animations**: Including Aurora, Breathing, Candy, Cyber, Disco, Fire, Ice, Jungle, Knight, Matrix, Plasma, Police, Rainbow, Scanner, Strobe, Sunset, Toxic, Volcano, Water, Wave, and more
- **Customizable Brightness**: Adjustable from 0-100%
- **Speed Control**: Global animation speed adjustment (10-200% of base speed)
- **Interactive Touch Responses**: Smooth wipe animations triggered by device interactions

### Media Control
- **Media Key Integration**: Control your media playback directly from the application
- **System-wide Media Control**: Play, pause, skip tracks using system media keys

### ⏱Timer & Focus Mode
- **Pomodoro Timer**: Built-in focus timer with preset durations (5m, 15m, 25m)
- **Visual Feedback**: LED animations synchronized with timer states

### Plugin System
- **Extensible Animation System**: Easy-to-create custom animation plugins
- **Hot-reload Support**: Add new animations without restarting the application
- **Plugin Directory**: Simple JavaScript-based animation plugins

### Configuration
- **Persistent Settings**: All preferences saved automatically
- **Auto-start Support**: Launch with system startup
- **MIDI Communication**: Direct MIDI control for precise LED management

## Installation

### Prerequisites

- **Node.js** >= 16.0.0
- **npm** or **yarn**
- **TimeBuzzer Device** connected via MIDI

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/OpenBuzzer.git
   cd OpenBuzzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Rebuild native modules** (if needed)
   ```bash
   npm run rebuild
   ```

4. **Start the application**
   ```bash
   npm start
   ```

## 📱 Usage

### First Launch

1. Connect your TimeBuzzer device to your computer
2. Launch the application
3. The app will automatically detect and connect to your TimeBuzzer
4. Wait for the initialization animation to complete

### Dashboard Tab

- **Connection Status**: Monitor device connection state
- **Quick Actions**: View recent device interactions
- **System Controls**: Enable/disable LED and Media features

### Lighting Tab

- **Animation Selection**: Choose from 21+ available animations
- **Brightness Slider**: Adjust overall LED brightness (0-100%)
- **Speed Control**: Modify animation speed (10-200%)
- **LED Toggle**: Enable or disable LED functionality

### Actions Tab

- **Media Control**: Toggle media key functionality
- **Touch Interactions**: Configure interactive LED responses
- **Device Settings**: Access advanced configuration options

### Timer Tab

- **Focus Timer**: Start a Pomodoro-style focus session
- **Preset Durations**: Quick access to 5, 15, or 25-minute timers
- **Timer Controls**: Start, pause, and reset functionality

## Creating Custom Animations

The application supports a plugin-based animation system. To create a custom animation:

1. Create a new JavaScript file in `plugins/animations/`
2. Export an animation object with the following structure:

```javascript
module.exports = {
    name: "My Custom Animation",
    interval: 50, // Update interval in milliseconds
    init: (setZone, setRGB, zones) => {
        // Initialization code
    },
    update: (setZone, setRGB, zones, frame) => {
        // Animation update logic
        // Use setZone(zoneIndex, r, g, b) or setRGB(r, g, b)
    },
    stop: () => {
        // Cleanup code (optional)
    }
};
```

3. Restart the application or reload animations
4. Your custom animation will appear in the Lighting tab

### Example Animation

```javascript
// plugins/animations/custom.js
module.exports = {
    name: "Custom Pulse",
    interval: 50,
    init: (setZone, setRGB, zones) => {
        // Initial setup
    },
    update: (setZone, setRGB, zones, frame) => {
        const brightness = Math.sin(frame * 0.1) * 0.5 + 0.5;
        const r = Math.floor(255 * brightness);
        const g = Math.floor(100 * brightness);
        const b = Math.floor(200 * brightness);
        setRGB(r, g, b);
    }
};
```

## Development

### Project Structure

```
OpenBuzzer/
├── src/
│   ├── main.js          # Electron main process
│   ├── renderer.js      # Renderer process logic
│   ├── preload.js       # Preload script
│   ├── index.html       # Application UI
│   └── styles.css       # Application styles
├── plugins/
│   └── animations/      # Animation plugins
├── package.json
└── README.md
```

### Key Technologies

- **Electron 40.0.0**: Cross-platform desktop framework
- **JZZ**: MIDI communication library
- **Fluent UI Web Components**: Modern UI components
- **Node.js**: Runtime environment

### Building

Currently, the application runs in development mode. For production builds, you may need to configure Electron Builder or similar tools.

## Contributing

Contributions are welcome! This is an open-source project, and we appreciate any help you can provide.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add some amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Areas for Contribution

- New animation plugins
- Bug fixes
- Documentation improvements
- UI/UX enhancements
- Performance optimizations
- Localization support

## License

This project is licensed under the **ISC License**.

## Links

- **Website**: [timebuzzer.com](https://timebuzzer.com/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/OpenBuzzer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/OpenBuzzer/discussions)

## Acknowledgments

- TimeBuzzer team for creating the amazing hardware
- Electron community for the excellent framework
- All contributors and users of this project

---

<p align="center">
  Made with ❤️ for the TimeBuzzer community
</p>
