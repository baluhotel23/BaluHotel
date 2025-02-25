const express = require('express');
const config = require('./config/config');
const setupRoutes = require('./routes/index');

const app = express();
const PORT = config.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup routes
setupRoutes(app);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});