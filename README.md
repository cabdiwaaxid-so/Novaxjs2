# NovaxJS - Modern Web Framework for Node.js (v9.4.1)

![NovaxJS Logo](https://www.novaxjs2.site/logo.png)

## 🚀 Introduction

NovaxJS is a lightweight, high-performance web framework for Node.js designed for building modern web applications and APIs. With its minimalist design and powerful features, NovaxJS provides developers with an elegant solution for server-side development.

## ✨ Features

- **Blazing Fast** - Optimized for performance with low memory footprint
- **Intuitive Routing** - Simple yet powerful route definitions with parameter support (named regex groups)
- **Advanced Template Engine** - Enhanced HTML templates with new @ syntax including @include directives, destructuring, and function calls
- **File Include Support** - New `@include('file.html')` and `@include('file.html', {data})` syntax
- **Destructuring Support** - Object and array destructuring in `@var` declarations
- **Function Call Support** - Direct function calls in templates with `@functionName(args)`
- **Advanced File Handling** - Robust file uploads with configurable limits and validation (maxSize in MB)
- **Middleware Pipeline** - Flexible middleware architecture with error handling (`useMiddleware`, `useErrorMiddleware`)
- **Static File Serving** - Efficient static file delivery with automatic MIME type detection and static path prefix stripping
- **CORS Support** - Configurable CORS policies with preflight handling (`cors` method)
- **Plugin System** - Extensible architecture for adding framework features
- **Comprehensive Error Handling** - Custom error pages and error middleware stack (`on(statusCode, handler)` for 400–599)
- **Request Parsing** - Built-in support for JSON, form-data, and urlencoded bodies
- **Response Helpers** - Convenient methods for common response patterns (`res.set`, `res.status`, `res.redirect`, `res.cookie`)
- **Cookie Management** - Built-in cookie parsing and manipulation (`req.cookies`, `res.cookie`, `req.clearCookie`)
- **Global Styles/JS** - Inject CSS and JavaScript globally across responses
- **Custom Error Pages** - Define handlers for specific HTTP status codes
- **File Downloads** - Easy file sending with proper content-type handling
- **Request Utilities** - IP detection, protocol detection, and full URL construction
- **HTML Minifier** - Minification for HTML, CSS, and JavaScript output (enabled by default)
- **View Helpers** - Register custom helpers for templates
- **Router Modularization** - Use external router modules with `useRouter()` method

## 🔄 What's New in v9.4.1

 ### Smart Minification
- **Selective Minification**: Skip minification for specific code blocks using `<!-- novax:skip -->` markers
- **Multi-format Support**: Skip markers work for HTML, CSS, and JavaScript
- **Preserved Formatting**: Code within skip blocks maintains original formatting and whitespace
- **Flexible Skip Syntax**: Both block-level and inline skip markers available

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

### Smart Minification with skip markers


**Skip minification for specific HTML blocks:**

```html
<!-- This will be minified normally -->
<div class="normal-content">
  <p>This content will be minified.</p>
</div>

<!-- novax:skip-start -->
<!-- This entire block will NOT be minified -->
<div class="preformatted">
  <!-- Comments remain intact -->
  <pre>
    This preformatted text
    keeps its original spacing
    and line breaks exactly as written.
  </pre>
  
  <code>
    // JavaScript code example
    function example() {
      const x = 10;
      const y = 20;
      return x + y;
    }
  </code>
</div>
<!-- novax:skip-end -->

<!-- This will be minified again -->
<p>Back to normal minification</p>
```

**Inline skip markers:**

```html
<!-- novax:skip -->
<!-- This section preserves formatting -->
<div class="preserve-me">
    <p>Multi-line
       content with
       intentional spacing.</p>
</div>
<!-- novax:unskip -->
```

**CSS skip blocks:**

```css
/* This CSS will be minified */
body {
  margin: 0;
  padding: 0;
}

/* novax:skip-start */
/* This CSS block won't be minified */
/* Keep important formatting for readability */
.header {
    background: linear-gradient(to right, #ff0000, #00ff00);
    /* Complex calculations that should remain readable */
    padding: calc(20px + 10%);
    margin: 10px 20px 30px 40px;
}
/* novax:skip-end */

/* Back to normal minification */
.footer {
  background: #000;
}
```

**JavaScript skip blocks:**

```javascript
// This will be minified
function minifiedFunc(x) {
  return x * 2;
}

/* novax:skip-start */
// This code won't be minified
// Keep complex algorithms readable
function complexCalculation(a, b, c) {
    // Multi-step calculation
    const step1 = a * b;
    const step2 = step1 / c;
    const step3 = Math.sqrt(step2);
    
    // Important comments preserved
    return step3;
}
/* novax:skip-end */

// Back to minification
const anotherFunc = y => y + 1;
```


### Enhanced Template Syntax

**New @ syntax in HTML templates with includes and destructuring:**
```html
@var {title, content} = pageData;
@var [firstItem, secondItem] = itemList;

<h1>@title</h1>
<div>@content</div>

@include('header.html')
@include('navbar.html', {currentPage: 'home'})

@each(user in users)
  @include('user-card.html', {user: user})
@end

@if(user.isAdmin)
  @include('admin-panel.html')
@end

@{ formatDate(user.createdAt) }
@customHelper(user.name)
```

### File Includes

```html
<!-- main-template.html -->
@var pageTitle = "Home Page";

<!DOCTYPE html>
<html>
<head>
    <title>@pageTitle</title>
    @include('head.html')
</head>
<body>
    @include('header.html', {showBanner: true})

    <main>
        @include('content.html', {content: pageContent})
    </main>

    @include('footer.html', {year: 2024})
</body>
</html>
```

### Destructuring Support

```html
@var {name, age, email} = user;
@var [first, second, ...rest] = items;

<p>Name: @name</p>
<p>Age: @age</p>
<p>Email: @email</p>

<p>First item: @first</p>
<p>Second item: @second</p>
```

### Function Calls

```html
@var formattedDate = formatDate(createdAt);
@var fullName = getFullName(user.firstName, user.lastName);

<p>Created: @formattedDate</p>
<p>Welcome, @fullName!</p>

@if(isAdmin(user.role))
  <div class="admin-badge">Administrator</div>
@end
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
    cookies: req.cookies,// Parsed cookies
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
  res.send('Plain text response', 'text/plain');
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
  res.redirect('/new-location', 307); // Status code can be specified
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
  res.cookie('sessionId', '12345', {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  });
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

### Cookie Management

#### Setting Cookies
```javascript
// Basic cookie
res.cookie('username', 'john_doe');

// With options
res.cookie('session', 'abc123', {
  maxAge: 24 * 60 * 60 * 1000, // 1 day
  httpOnly: true,
  secure: true,
  domain: 'example.com',
  path: '/admin',
  sameSite: 'strict'
});

// Multiple cookies
res.cookie('preferences', 'dark_mode')
   .cookie('language', 'en');
```

#### Reading Cookies
```javascript
app.get('/dashboard', (req, res) => {
  // All cookies are available in req.cookies
  const session = req.cookies.session;
  const preferences = req.cookies.preferences;

  if (!session) {
    return res.redirect('/login');
  }

  // Use cookie values
  res.send(`Preferences: ${preferences}`);
});
```

#### Clearing Cookies
```javascript
app.get('/logout', (req, res) => {
  // Clear specific cookie
  req.clearCookie('session');

  // Clear with options (must match original cookie options)
  req.clearCookie('preferences', {
    domain: 'example.com',
    path: '/admin'
  });

  res.redirect('/login');
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

#### Enhanced HTML Templates with New Features

**File Includes:**
```html
@include('header.html')
@include('navbar.html', {currentPage: 'products'})
@include('footer.html', {showCopyright: true})
```

**Destructuring:**
```html
@var {title, description, price} = product;
@var [mainImage, ...otherImages] = images;

<h2>@title</h2>
<p>@description</p>
<span class="price">$@price</span>
```

**Function Calls:**
```html
@var discountedPrice = calculateDiscount(price, discountPercent);
@var isAvailable = checkAvailability(productId);

@if(isAvailable)
  <button class="buy-btn">Buy for $@discountedPrice</button>
@end
```

**Complex Examples:**
```html
@var {user: {name, email}, orders: [latestOrder, ...otherOrders]} = data;

<div class="profile">
  <h2>@name</h2>
  <p>@email</p>

  @include('order-history.html', {orders: otherOrders})

  @if(latestOrder)
    @include('latest-order.html', {order: latestOrder})
  @end
</div>
```

#### Configuration
```javascript
// Basic setup with enhanced features
app.setViewEngine('novax', {
  viewsPath: './templates',
  helpers: {
    formatDate: date => new Date(date).toLocaleDateString(),
    calculateDiscount: (price, discount) => price * (1 - discount/100),
    checkAvailability: productId => inventory[productId] > 0
  }
});

// Register additional helpers
app.addHelper('uppercase', str => str.toUpperCase());
app.addHelper('truncate', (str, length) =>
  str.length > length ? str.substring(0, length) + '...' : str
);
```

#### Rendering Templates with Includes
```javascript
app.get('/profile', async (req, res) => {
  try {
    const html = await app.render('profile', {
      user: req.user,
      orders: await getOrders(req.user.id),
      stats: await getUserStats(req.user.id)
    });
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading profile');
  }
});
```


### Advanced Include Usage

**With complex data:**
```html
@include('user-card.html', {
  user: user,
  showDetails: true,
  options: {
    theme: 'dark',
    size: 'large'
  }
})
```

**With function calls:**
```html
@include('notification.html', {
  message: formatMessage('welcome', user.name),
  type: getNotificationType(user.status)
})
```

#### HTML Templates with New @ Syntax
```html
<!-- views/profile.html -->
@var title = "User Profile";
@var user = { name: "Alice", isAdmin: true, friends: [{ name: "Bob" }, { name: "Charlie" }] };

<div class="profile">
  <h1>@title</h1>
  <img src="@user.avatar" alt="Profile picture">

  @if(user.isAdmin)
    <div class="admin-badge">Administrator</div>
  @end

  <ul class="friends">
    @each(friend in user.friends)
      <li>
        @friend.name
        @if(friend.isClose)⭐@end
      </li>
    @end
  </ul>

  <p>Total friends: @{user.friends.length}</p>
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

#### View Helpers
```javascript
// Register a single helper
app.addHelper('formatDate', date => new Date(date).toLocaleDateString());

// Register multiple helpers
app.addHelpers({
  upper: str => str.toUpperCase(),
  lower: str => str.toLowerCase(),
  truncate: (str, length) => str.length > length ? str.substring(0, length) + '...' : str
});

// Helpers in templates
// HTML: @{ upper(user.name) }
// JS: upper(user.name)
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
      ]
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

app.get('/page', (req, res) => {
  app.render('page', { title: 'Home' })
    .then(content => {
      res.send(content);
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

### Router Modularization

#### Creating Modular Routers
```javascript
// routes/api.js
module.exports = (app) => {
  app.group('/api/v1', (api) => {
    api.get('/users', getUsers);
    api.post('/users', createUser);
    api.get('/users/:id', getUser);
    api.put('/users/:id', updateUser);
    api.delete('/users/:id', deleteUser);
  });
};

// routes/auth.js
module.exports = (app) => {
  app.post('/login', loginHandler);
  app.post('/register', registerHandler);
  app.post('/logout', logoutHandler);
  app.post('/forgot-password', forgotPasswordHandler);
};

// main app.js
app.useRouter(require('./routes/api'));
app.useRouter(require('./routes/auth'));
```

#### Router Objects
```javascript
// Alternative router format as object
const productRoutes = {
  '/products': {
    method: 'get',
    handler: getProducts,
    middleware: [authMiddleware]
  },
  '/products/:id': {
    method: 'get',
    handler: getProduct
  },
  '/products': {
    method: 'post',
    handler: createProduct,
    middleware: [authMiddleware, adminMiddleware, ((req, res, next) => {
      console.log('My Middleware')
      next()
    })]
  }
};

app.useRouter(productRoutes);
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
3. **Template Engine**: Dual-mode rendering (HTML and JavaScript) with new @ syntax
4. **File Handling**: Uploads, downloads, and static file serving
5. **Middleware Pipeline**: Request/response processing chain
6. **Error Handling**: Customizable error responses and logging
7. **Plugin API**: Extensibility point for framework features
8. **Cookie Management**: Built-in cookie parsing and manipulation
9. **Router Modularization**: Support for external router modules

### Lifecycle of a Request

1. **Incoming Request**: Server receives HTTP request
2. **Cookie Parsing**: Parse cookies from request headers
3. **CORS Handling**: Preflight checks if applicable
4. **Body Parsing**: JSON, form-data, or urlencoded parsing
5. **Middleware Execution**: Application-level middleware stack
6. **Route Matching**: Find matching route based on path and method
7. **Route Middleware**: Route-specific middleware execution
8. **Route Handler**: Main route logic execution
9. **Response Generation**: Send response or render template (with minification)
10. **Error Handling**: If any errors occur in the pipeline
11. **Final Response**: Send final response to client (with cookies if set)

## 📜 License

ISC License

---

This documentation covers all features and capabilities of NovaxJS v9.4.1, including both existing functionality and new enhancements. For more examples and advanced usage patterns, please refer to the official documentation website.