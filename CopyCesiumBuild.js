const fs = require('fs-extra');
const path = require('path');

// Directories
const cesiumSource = path.join(__dirname, 'node_modules/cesium/Build/Cesium');
const cesiumDestination = path.join(__dirname, 'public/Cesium');

// Ensure the destination directory exists
fs.ensureDirSync(cesiumDestination);

// Copy the Cesium Build directory
fs.copySync(cesiumSource, cesiumDestination, { overwrite: true });

console.log('Cesium assets copied to public folder successfully!'); 