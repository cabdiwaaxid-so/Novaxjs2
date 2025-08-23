# NovaxJS - Modern Web Framework for Node.js (v8.3.0)

![NovaxJS Logo](https://www.novaxjs2.site/logo.png)

## 🚀 Introduction

NovaxJS is a lightweight, high-performance web framework for Node.js designed for building modern web applications and APIs. With its minimalist design and powerful features, NovaxJS provides developers with an elegant solution for server-side development.

## ✨ Features

- **Blazing Fast** - Optimized for performance with low memory footprint
- **Intuitive Routing** - Simple yet powerful route definitions with parameter support (named regex groups)
- **Dual Template Engine** - Supports both HTML templates with Novax syntax and JavaScript template files
- **Advanced File Handling** - Robust file uploads with configurable limits and validation (maxSize in MB)
- **Middleware Pipeline** - Flexible middleware architecture with error handling (`useMiddleware`, `useErrorMiddleware`)
- **Static File Serving** - Efficient static file delivery with automatic MIME type detection and static path prefix stripping
- **CORS Support** - Configurable CORS policies with preflight handling (`cors` method)
- **Plugin System** - Extensible architecture for adding framework features (plugin context exposes addMethod, addRoute, addMiddleware, addErrorMiddleware, setConfig, getConfig)
- **Comprehensive Error Handling** - Custom error pages and error middleware stack (`on(statusCode, handler)` for 400–599)
- **Request Parsing** - Built-in support for JSON, form-data, and urlencoded bodies
- **Response Helpers** - Convenient methods for common response patterns (`res.set`, `res.status`, `res.redirect`)
- **Global Styles/JS** - Inject CSS and JavaScript globally across responses
- **Custom Error Pages** - Define handlers for specific HTTP status codes
- **File Downloads** - Easy file sending with proper content-type handling
- **Request Utilities** - IP detection, protocol detection, and full URL construction
- **HTML Minifier** - Minification for HTML output (enabled by default)
- **View Helpers** - Register custom helpers for templates


## 🔄 What's New in v8.3.0

### Template Engine & Rendering
- **Full JS/HTML Template Support**: Enhanced built-in template engine with improved context, helpers, and conditional/loop logic.
- **Third-Party View Engine Support**: Now supports engines like Pug, EJS, etc. via `setViewEngine(engine, options)`.
- **Automatic Views Directory**: Always creates views directory if missing.
- **Helper Registration**: `addHelper(name, fn)` and `addHelpers({ ... })` methods for both built-in and third-party engines.
- **Advanced Conditional/Loop Syntax**: Improved `{{#if}}`, `{{#each}}`, and context-aware helpers in HTML templates.

### Core Enhancements
- **Minification for HTML, CSS, JS**: All responses (HTML, CSS, JS) are minified by default. Custom minifiers for each type.
- **Improved Static File Serving**: Minifies static HTML/CSS/JS, uses correct MIME type, and supports custom static directories.
- **Enhanced Error Handling**: More robust error middleware, custom error pages, and better fallback logic.
- **Flexible View Engine API**: Accepts both string ("novax") and module for third-party engines, with strict validation.
- **Plugin Context Improvements**: Plugin context now exposes all extension points and supports method binding.

### API Changes
- **sendFile**: Now minifies HTML/CSS/JS files before sending.
- **render**: Improved context, error handling, and async support for JS templates.
- **setViewEngine**: Accepts both built-in and third-party engines, with auto-detection and fallback.

## 📦 Installation

```bash
npm install novaxjs2
```


## 🎯 Quick Start

```javascript
const Nova = require('novaxjs2');
const app = new Nova();

// Basic route with HTML response
app.get('/', (req, res) => {
  res.send('<h1>Welcome to NovaxJS</h1>');
});

// Route with middleware
app.get('/protected', authenticate, (req, res) => {
  res.send('<h1>Protected Content</h1>');
});

// Route group
app.group('/api', (api) => {
  api.get('/users', getUsers);
  api.post('/users', createUser);
});

// Start server with callback
app.at(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## 🆕 New API Highlights


### Initialization

```javascript
app.init({
  staticPath: 'public',
  minifier: true, // Minifies HTML, CSS, JS
  fileConfig: {
    maxSize: 100,
    allowedTypes: ['image/jpeg', 'image/png'],
    keepOriginalName: true,
    maxFiles: 10
  }
});
```

### View Helpers

Helpers can be defined in several ways:


**1. When setting the view engine:**

```javascript
// Built-in Novax engine (HTML or JS)
app.setViewEngine('novax', {
  viewsPath: './views',
  viewsType: 'html', // or 'js'
  helpers: {
    formatDate: date => new Date(date).toLocaleDateString(),
    upper: str => str.toUpperCase()
  }
});

// Third-party engine (e.g. Pug)
const pug = require('pug');
app.setViewEngine(pug, {
  viewsPath: './templates',
  viewsType: 'pug',
  helpers: {
    shout: str => str.toUpperCase() + '!'
  }
});
```

**2. Register a single helper:**

```javascript
app.addHelper('formatDate', date => new Date(date).toLocaleDateString());
```

**3. Register multiple helpers at once:**

```javascript
app.addHelpers({
  upper: str => str.toUpperCase(),
  lower: str => str.toLowerCase()
});
```

Helpers are available in both HTML and JS templates.

#### Usage Examples


**HTML Template Example (`profile.html`):**
```html
<h1>{{ upper(user.name) }}</h1>
<p>Joined: {{ formatDate(user.joined) }}</p>
{{#if user.isAdmin}}
  <span>Admin</span>
{{/if}}
<ul>
  {{#each user.friends}}
    <li>{{this.name}}</li>
  {{/each}}
</ul>
```

**JS Template Example (`profile.js`):**
```javascript
module.exports = ({user, upper, formatDate}) => `
  <h1>${upper(user.name)}</h1>
  <p>Joined: ${formatDate(user.joined)}</p>
`;
```

## 📚 Comprehensive Documentation

### Core Application

#### Instantiation
```javascript
const app = new Nova();

// With global CSS
app.style = `
  body { font-family: Arial; margin: 0; padding: 20px; }
  h1 { color: #333; }
`;

// With global JavaScript
app.js = `
  console.log('Global script loaded');
  document.addEventListener('DOMContentLoaded', init);
`;

// With file upload configuration
app.setFileConfig({
  maxSize: 100, // 100MB
  allowedTypes: ['image/jpeg', 'image/png'],
  keepOriginalName: true,
  maxFiles: 10
});
```

#### Server Configuration Options
```javascript
// Basic usage
app.at(3000); // Port only

// With host and callback
app.at(3000, '0.0.0.0', () => {
  console.log('Server listening on all interfaces');
});

// With just callback
app.at(3000, () => {
  console.log('Server ready');
});

// With HTTPS (requires Node.js https module)
const https = require('https');
const fs = require('fs');
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};
app.server = https.createServer(options, app.server);
app.at(443);
```

### Routing System

#### HTTP Methods
```javascript
// GET route
app.get('/products', (req, res) => {
  res.json([{ id: 1, name: 'Product A' }]);
});

// POST route with body parsing
app.post('/products', (req, res) => {
  console.log('Received product:', req.body);
  res.status(201).json({ success: true });
});

// PUT route
app.put('/products/:id', (req, res) => {
  res.send(`Updating product ${req.params.id}`);
});

// DELETE route
app.delete('/products/:id', (req, res) => {
  res.send(`Deleting product ${req.params.id}`);
});

// PATCH route
app.patch('/products/:id', (req, res) => {
  res.send(`Partially updating product ${req.params.id}`);
});
```

#### Route Parameters
```javascript
// Single parameter (named regex group)
app.get('/users/:userId', (req, res) => {
  res.send(`User ID: ${req.params.userId}`);
});

// Multiple parameters
app.get('/posts/:postId/comments/:commentId', (req, res) => {
  res.json({
    post: req.params.postId,
    comment: req.params.commentId
  });
});
```

#### Route Groups
```javascript
// Grouped routes with common prefix
app.group('/api/v1', (api) => {
  api.get('/products', getProducts);
  api.post('/products', createProduct);
  
  // Nested groups
  api.group('/users', (users) => {
    users.get('/', getUsers);
    users.post('/', createUser);
    users.get('/:id', getUser);
  });
});
```

#### Route Middleware
```javascript
// Authentication middleware
const authenticate = (req, res, next) => {
  if (req.headers['x-api-key'] === 'secret') {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
};

// Logging middleware
const logger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
};

// Data validation middleware
const validateProduct = (req, res, next) => {
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }
  next();
};

// Applying middleware to route
app.post('/products', authenticate, logger, validateProduct, (req, res) => {
  // Create product logic
  res.status(201).json({ success: true });
});
```

### Request Handling

#### Available Properties
```javascript
app.get('/request-info', (req, res) => {
  res.json({
    // Basic properties
    method: req.method,
    url: req.url,
    path: url.parse(req.url).pathname,
    
    // Network information
    ip: req.ip,
    protocol: req.protocol,
    secure: req.protocol === 'https',
    hostname: req.headers.host,
    fullUrl: req.fullUrl,
    
    // Parsed data
    query: req.query,    // Query string parameters
    body: req.body,      // Parsed request body
    files: req.files,    // Uploaded files
    params: req.params,  // Route parameters
    
    // Headers
    headers: req.headers
  });
});
```

#### Body Parsing Examples
```javascript
// JSON body
app.post('/api/users', (req, res) => {
  // req.body will be parsed JSON
  const user = {
    id: Date.now(),
    ...req.body
  };
  res.status(201).json(user);
});

// URL-encoded form
app.post('/contact', (req, res) => {
  // req.body contains parsed form data
  console.log('Contact form submission:', req.body);
  res.redirect('/thank-you');
});

// File upload
app.post('/upload', (req, res) => {
  // req.files contains uploaded files
  // req.body contains other form fields
  const fileInfo = req.files.document;
  res.json({
    originalName: fileInfo.name,
    savedName: fileInfo.newname,
    size: fileInfo.size,
    url: `/uploads/${fileInfo.newname}`
  });
});

// Multipart form with mixed data
app.post('/profile', (req, res) => {
  const { name, bio } = req.body;
  const avatar = req.files.avatar;
  
  // Process data
  res.json({
    profile: { name, bio },
    avatarUrl: `/uploads/${avatar.newname}`
  });
});
```

### Response Handling

#### Response Methods
```javascript
// Basic responses
app.get('/text', (req, res) => {
  res.send('Plain text response');
});

app.get('/html', (req, res) => {
  res.send('<h1>HTML Response</h1><p>With tags</p>');
});

app.get('/json', (req, res) => {
  res.json({ message: 'JSON response', status: 'success' });
});

// Status codes
app.get('/created', (req, res) => {
  res.status(201).send('Resource created');
});

app.get('/unauthorized', (req, res) => {
  res.status(401).json({ error: 'Authentication required' });
});

// Fluent interface
app.get('/fluent', (req, res) => {
  res
    .status(200)
    .set({
      'X-Custom-Header': 'value',
      'Cache-Control': 'no-cache'
    })
    .json({ data: 'response' });
});

// Redirects
app.get('/old-route', (req, res) => {
  res.redirect('/new-route');
});

app.get('/temporary', (req, res) => {
  res.redirect(307, '/new-location'); // Status code can be specified
});

// Headers
app.get('/custom-headers', (req, res) => {
  res.set({
    'X-Custom-Header': 'value',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  }).send('Headers set');
});

// Cookies
app.get('/set-cookie', (req, res) => {
  res.setHeader('Set-Cookie', 'sessionId=12345; HttpOnly');
  res.send('Cookie set');
});
```

#### File Responses
```javascript
// Send file with automatic content-type
app.get('/download-pdf', (req, res) => {
  app.sendFile('./documents/report.pdf', res);
});

// Explicit content-type
app.get('/download-csv', (req, res) => {
  app.sendFile('./data/export.csv', 'text/csv', res);
});

// Alternative syntax
app.get('/manual-file', (req, res) => {
  const filePath = path.join(__dirname, 'files', 'manual.pdf');
  app.sendFile(filePath, 'application/pdf', res);
});

// With error handling
app.get('/download', (req, res) => {
  try {
    app.sendFile('./important.docx', res);
  } catch (err) {
    res.status(500).send('Failed to download file');
  }
});
```

### Middleware System

#### Application-Level Middleware
```javascript
// Runs for every request
app.useMiddleware((req, res, next) => {
  console.log('Request received at', new Date());
  next(); // Pass control to next middleware
});

// Conditional middleware
app.useMiddleware((req, res, next) => {
  if (req.path.startsWith('/api')) {
    req.apiRequest = true;
  }
  next();
});

// Async middleware
app.useMiddleware(async (req, res, next) => {
  try {
    req.user = await User.findByToken(req.headers.authorization);
    next();
  } catch (err) {
    next(err); // Pass to error handlers
  }
});

// Body parsing middleware
app.useMiddleware((req, res, next) => {
  if (req.method === 'POST' && !req.headers['content-type']) {
    req.headers['content-type'] = 'application/json';
  }
  next();
});
```

#### Error Handling Middleware
```javascript
// Basic error handler
app.useErrorMiddleware((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send('Something went wrong');
});

// Status code specific
app.useErrorMiddleware((err, req, res, next) => {
  if (err.statusCode === 404) {
    res.status(404).send('Custom not found message');
  } else {
    next(err); // Pass to next error handler
  }
});

// Production vs development
app.useErrorMiddleware((err, req, res, next) => {
  const response = {
    message: err.message
  };
  
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  
  res.status(err.status || 500).json(response);
});

// File upload error handling
app.useErrorMiddleware((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'File too large' });
  } else if (err.code === 'INVALID_FILE_TYPE') {
    res.status(415).json({ error: 'Invalid file type' });
  } else {
    next(err);
  }
});
```

### Static File Serving

#### Basic Setup
```javascript
// Serve files from /public directory
app.serveStatic('public');

// Files will be available at:
// /public/images/logo.png -> /images/logo.png
// /public/css/style.css -> /css/style.css

// The static path prefix (e.g., /public) is stripped from the URL automatically.

// With custom prefix
app.serveStatic('assets');
// The static path prefix /assets is stripped from the URL.
```

#### Advanced Configuration
```javascript
// Custom static directory with security
app.serveStatic('uploads');
app.useMiddleware((req, res, next) => {
  if (req.path.startsWith('/uploads')) {
    // Verify token for protected uploads
    const token = req.query.token;
    if (!isValidToken(token)) {
      return res.status(403).send('Forbidden');
    }
  }
  next();
});

// Multiple static directories
app.serveStatic('public'); // For general assets
app.serveStatic('node_modules/bootstrap/dist'); // For vendor files
app.useMiddleware((req, res, next) => {
  if (req.url.startsWith('/vendor')) {
    req.url = req.url.replace('/vendor', '');
  }
  next();
});
```

### File Uploads

#### Configuration Options
```javascript
// Complete configuration
app.setFileConfig({
  maxSize: 50,          // 50MB max file size (in MB, converted to bytes internally)
  allowedTypes: [       // Allowed MIME types
    'image/jpeg',
    'image/png',
    'application/pdf'
  ],
  maxFiles: 5,          // Maximum files per upload
  keepOriginalName: false, // Randomize filenames
});

// Individual settings
app.setFileSizeLimit(100); // 100MB
app.setAllowedFileTypes(['image/*']); // All image types
app.setMaxFiles(10);
app.setKeepOriginalName(true);

// Wildcard MIME types
app.setAllowedFileTypes([
  'image/*',      // All images
  'application/pdf',
  'text/plain'
]);

// Custom validation
app.useMiddleware((req, res, next) => {
  if (req.files) {
    for (const file of Object.values(req.files)) {
      if (file.size > customLimit) {
        return res.status(413).send('Custom size limit exceeded');
      }
    }
  }
  next();
});
```

#### Handling Uploads
```javascript
app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded');
  }

  const file = req.files.avatar;
  
  res.json({
    originalName: file.name,
    savedName: file.newname,
    size: file.size,
    type: file.type,
    path: file.path
  });
});

// Multiple files
app.post('/gallery', (req, res) => {
  const files = req.files.images; // Array when multiple
  
  const results = files.map(file => ({
    name: file.name,
    url: `/uploads/${file.newname}`,
    size: file.size
  }));
  
  res.json({ uploaded: results });
});

// Mixed form data and files
app.post('/profile', (req, res) => {
  const { username, bio } = req.body;
  const avatar = req.files.avatar;
  
  // Process data
  res.json({
    profile: { username, bio },
    avatarUrl: `/uploads/${avatar.newname}`
  });
});
```

### Template Engine

#### HTML Templates
```html
<!-- views/profile.html -->
<div class="profile">
  <h1>{{user.name}}</h1>
  <img src="{{user.avatar}}" alt="Profile picture">
  
  {{#if user.isAdmin}}
    <div class="admin-badge">Administrator</div>
  {{/if}}
  
  <ul class="friends">
    {{#each user.friends}}
      <li>
        {{this.name}}
        {{#if this.isClose}}⭐{{/if}}
      </li>
    {{/each}}
  </ul>
  
  {{#with user.settings as |settings|}}
    <div class="settings">
      <p>Theme: {{settings.theme}}</p>
      <p>Notifications: {{settings.notifications}}</p>
    </div>
  {{/with}}
</div>
```

#### JavaScript Templates
```javascript
// views/profile.js
module.exports = function(data) {
  const { user } = data;
  
  // Async operation example
  return someAsyncOperation().then(result => {
    return `
      <div class="profile">
        <h1>${user.name}</h1>
        <img src="${user.avatar}" alt="Profile picture">
        
        ${user.isAdmin ? '<div class="admin-badge">Administrator</div>' : ''}
        
        <ul class="friends">
          ${user.friends.map(friend => `
            <li>
              ${friend.name}
              ${friend.isClose ? '⭐' : ''}
            </li>
          `).join('')}
        </ul>
        
        <div class="async-result">
          ${result}
        </div>
      </div>
    `;
  });
};

// Alternative module export
module.exports = {
  render: function(data) {
    return `Hello ${data.name}`;
  },
  helper: function() {
    return 'Helper function';
  }
};
```

#### Configuration
```javascript
// Basic setup (views directory is created if it doesn't exist)
app.setViewEngine('novax', {
  viewsPath: './templates'
});


// With JavaScript templates
app.setViewEngine('novax', {
  viewsPath: './views',
  viewsType: 'js'
});

// With HTML templates (explicit)
app.setViewEngine('novax', {
  viewsPath: './templates',
  viewsType: 'html' // Default
});

// With third-party engine (e.g. Pug)
const pug = require('pug');
app.setViewEngine(pug, {
  viewsPath: './templates',
  viewsType: 'pug'
});
```

#### Rendering Templates
```javascript

// Basic rendering
app.get('/profile', (req, res) => {
  app.render('profile', {
    user: {
      name: 'Alice',
      avatar: '/images/alice.jpg',
      isAdmin: true,
      friends: [
        { name: 'Bob', isClose: true },
        { name: 'Charlie', isClose: false }
      ],
      settings: {
        theme: 'dark',
        notifications: 'enabled'
      }
    }
  }).then(html => res.send(html));
});


// With error handling
app.get('/dashboard', (req, res) => {
  app.render('dashboard', { user: req.user })
    .then(html => res.send(html))
    .catch(err => {
      console.error('Render error:', err);
      res.status(500).send('Error loading page');
    });
});


// With global styles/scripts
app.get('/page', (req, res) => {
  app.render('page', { title: 'Home' })
    .then(content => {
      res.send(content); // Will include global CSS and JS
    });
});


// Async data fetching
app.get('/async-page', async (req, res) => {
  try {
    const data = await fetchData();
    const html = await app.render('async-template', { user: req.user });
    res.send(html);
  } catch (err) {
    res.status(500).send('Error');
  }
});
```

### Error Handling

#### Custom Error Pages
```javascript
// Register a custom error handler for a specific status code (400–599)
app.on(404, (err, req, res) => `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Page Not Found</title>
    <style>
      body { font-family: Arial; text-align: center; padding: 50px; }
      h1 { color: #d33; }
      .details { margin: 20px; padding: 15px; background: #f5f5f5; }
    </style>
  </head>
  <body>
    <h1>404 - Not Found</h1>
    <p>The requested page could not be found.</p>
    ${process.env.NODE_ENV === 'development' ? `
      <div class="details">
        <p><strong>URL:</strong> ${req.url}</p>
        <p><strong>Method:</strong> ${req.method}</p>
      </div>
    ` : ''}
  </body>
  </html>
`);

// 500 Server Error
app.on(500, (err) => `
  <h1>Server Error</h1>
  <p>${err.message}</p>
  ${process.env.NODE_ENV === 'development' ? 
    `<pre>${err.stack}</pre>` : ''}
`);

// Custom business error
app.on(402, () => `
  <h1>Payment Required</h1>
  <p>Please upgrade your account to access this feature</p>
  <a href="/pricing">View pricing plans</a>
`);
```

#### Error Middleware
```javascript
// JSON error responses for API routes
app.useErrorMiddleware((err, req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  } else {
    next(err); // Pass to next error handler
  }
});

// HTML error pages for regular routes
app.useErrorMiddleware((err, req, res, next) => {
  res.status(err.statusCode || 500);
  
  // Check if accepts HTML
  const acceptsHtml = req.accepts('html');
  const acceptsJson = req.accepts('json');
  
  if (acceptsHtml) {
    // Try custom error handler first
    if (app.customErrors[err.statusCode || 500]) {
      const errorContent = app.customErrors[err.statusCode || 500](err, req, res);
      res.send(errorContent);
    } else {
      // Fallback to default
      res.send(`
        <h1>${err.statusCode || 500} Error</h1>
        <p>${err.message}</p>
        ${process.env.NODE_ENV === 'development' ? `<pre>${err.stack}</pre>` : ''}
      `);
    }
  } else if (acceptsJson) {
    res.json({ error: err.message });
  } else {
    res.send(err.message);
  }
});

// File upload specific errors
app.useErrorMiddleware((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'File size exceeds limit' });
  } else if (err.code === 'INVALID_FILE_TYPE') {
    res.status(415).json({ error: 'Invalid file type' });
  } else if (err.code === 'LIMIT_FILE_COUNT') {
    res.status(413).json({ error: 'Too many files' });
  } else {
    next(err);
  }
});
```

### Plugin System

#### Creating a Plugin
```javascript
// logger.js
module.exports = function(context, options = {}) {
  const { setConfig, addMiddleware, addMethod, getConfig, addRoute } = context;
  const config = {
    level: options.level || 'info',
    format: options.format || 'simple'
  };
  
  // Set plugin configuration
  setConfig('logger', config);
  
  // Add request logging middleware
  addMiddleware((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const message = `${req.method} ${req.url} ${res.statusCode} ${duration}ms`;
      log(message, 'info');
    });
    next();
  });
  
  // Add logging method
  addMethod('log', (message, level = 'info') => {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevel = getConfig('logger').level;
    
    if (levels.indexOf(level) <= levels.indexOf(currentLevel)) {
      const timestamp = new Date().toISOString();
      console[level](`[${timestamp}] ${message}`);
    }
  });
  
  // Add debug route if in development
  if (process.env.NODE_ENV === 'development') {
    addRoute('get', '/_logs', (req, res) => {
      res.json({ logs: getLogs() });
    });
  }
  
  return {
    name: 'logger',
    version: '1.0.0',
    description: 'Request logging plugin'
  };
};

// Usage
app.usePlugin(require('./logger'), { level: 'debug' });
app.log('Application started');
```

#### Using Plugins
```javascript
// Authentication plugin
const authPlugin = require('./auth-plugin');
app.usePlugin(authPlugin, {
  secret: process.env.JWT_SECRET,
  routes: ['/api']
});

// Database plugin
const dbPlugin = require('novax-db');
app.usePlugin(dbPlugin, {
  connectionString: process.env.DB_URL,
  models: './models'
});

// Now db methods are available
app.get('/users', async (req, res) => {
  const users = await app.db.find('users');
  res.json(users);
});

// Plugin context provides: addMethod, addRoute, addMiddleware, addErrorMiddleware, setConfig, getConfig
```

### Configuration

#### CORS Configuration
```javascript
// Basic CORS
app.cors({
  origins: ['https://example.com']
});

// Advanced CORS
app.cors({
  origins: [
    'https://example.com',
    'https://api.example.com',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  headers: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Custom-Header'
  ],
  credentials: true,
  maxAge: 86400,
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining']
});

```

#### Security Headers
```javascript
// Add security headers middleware
app.useMiddleware((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Content-Security-Policy': `
      default-src 'self';
      script-src 'self' 'unsafe-inline' https://cdn.example.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https://*.example.com;
      font-src 'self' https://fonts.gstatic.com;
      connect-src 'self' https://api.example.com;
      frame-ancestors 'none';
    `.replace(/\s+/g, ' '),
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=()'
  });
  next();
});

// Rate limiting middleware
app.useMiddleware((req, res, next) => {
  const ip = req.ip;
  const current = rateLimiter[ip] || 0;
  
  if (current >= 100) {
    return res.status(429).send('Too many requests');
  }
  
  rateLimiter[ip] = current + 1;
  setTimeout(() => {
    rateLimiter[ip] = Math.max(0, (rateLimiter[ip] || 0) - 1);
  }, 60000);
  
  next();
});
```

## 🏗️ Architecture

NovaxJS follows these core principles:

1. **Minimalist Core**: Only essential features in the core framework
2. **Extensible**: Plugin system for adding functionality
3. **Unopinionated**: Flexible structure for different use cases
4. **Performance Focused**: Optimized for speed and low memory usage
5. **Security Conscious**: Safe defaults and validation for all operations

### Core Components

1. **Server Layer**: HTTP server with request/response handling
2. **Routing System**: Flexible route definitions with middleware support
3. **Template Engine**: Dual-mode rendering (HTML and JavaScript)
4. **File Handling**: Uploads, downloads, and static file serving
5. **Middleware Pipeline**: Request/response processing chain
6. **Error Handling**: Customizable error responses and logging
7. **Plugin API**: Extensibility point for framework features

### Lifecycle of a Request

1. **Incoming Request**: Server receives HTTP request
2. **CORS Handling**: Preflight checks if applicable
3. **Body Parsing**: JSON, form-data, or urlencoded parsing
4. **Middleware Execution**: Application-level middleware stack
5. **Route Matching**: Find matching route based on path and method
6. **Route Middleware**: Route-specific middleware execution
7. **Route Handler**: Main route logic execution
8. **Response Generation**: Send response or render template
9. **Error Handling**: If any errors occur in the pipeline
10. **Final Response**: Send final response to client

## 📜 License

ISC License

---

This documentation covers all features and capabilities of NovaxJS v8.3.0. For more examples and advanced usage patterns, please refer to the official documentation website.