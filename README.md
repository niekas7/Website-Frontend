# CanSat Real-Time Tracking System

A web-based platform for real-time tracking and visualization of CanSat projects in flight. This application enables teams to monitor their CanSat's position, altitude, and telemetry data in a 3D environment.

## Features

- 3D visualization of CanSat location using Cesium JS
- Real-time tracking with position updates
- Terrain and building visualization
- Interactive map navigation
- Telemetry data display
- Support for multiple tracking devices
- Mobile-responsive design

## Technologies Used

- **Frontend**: Vue.js 3, Cesium JS
- **Styling**: CSS with Orbitron font for space-themed UI
- **Maps**: Cesium for 3D globe and mapping capabilities
- **Real-time Updates**: WebSockets for live data streaming

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Web browser with WebGL support

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/cansat-tracking.git
   cd cansat-tracking
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Configure your Cesium Ion access token (if necessary):
   - Create a `.env` file in the project root
   - Add your Cesium Ion access token: `VITE_CESIUM_TOKEN=your-token-here`

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal).

## Usage

1. The application will display a 3D globe centered on Lithuania.
2. Use the mouse to navigate:
   - Left-click + drag to rotate
   - Right-click + drag to pan
   - Scroll to zoom in/out
3. CanSat tracking:
   - The current position of your CanSat appears as a marker on the map
   - Real-time data updates as your CanSat transmits information
   - Click on the marker to view telemetry data

## Configuration

The system can be configured to track specific CanSat parameters by modifying the data processing modules. See the documentation in the `docs` folder for more details on customizing the tracking capabilities.

## Deployment

For production deployment:

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist` directory, ready to be deployed to any static web server.

## Project Structure

```
cansat-tracking/
├── frontend/              # Frontend application
│   ├── public/            # Static assets
│   ├── src/               # Source files
│   │   ├── assets/        # Images and other assets
│   │   ├── components/    # Vue components
│   │   ├── views/         # Page views
│   │   ├── App.vue        # Main application component
│   │   └── main.js        # Application entry point
│   └── index.html         # HTML template
├── docs/                  # Documentation
└── README.md              # This file
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)

## Team

- [niekas7](https://github.com/niekas7) - Project Lead
- [Team Member 1](https://github.com/teammember1) - Role
- [Team Member 2](https://github.com/teammember2) - Role

## Acknowledgments

- [Cesium](https://cesium.com/) for their amazing 3D mapping platform
- [KTU](https://ktu.edu/) for supporting the CanSat project
- All contributors and team members

---

*This project is part of the CanSat competition, a student space engineering challenge.* 
