# Changelog

All notable changes to NovaxJS are documented in this file.

## v9.4.5

### 🐛 Bug Fix
- **Fixed `require()` path resolution inside `.js` view templates** - Templates rendered with `viewsType: 'js'` previously ran with the `require` bound to `viewshandler.js`'s own location inside `node_modules/novaxjs2/`. This meant a relative `require('./foo')` inside a view file resolved against the package's internal folder instead of the view file itself, forcing awkward workarounds like `require('../../../foo')` to escape `node_modules`.

### The Fix
`_renderJsTemplate` now builds a `require` scoped to the actual view file's location using Node's built-in `module.createRequire(filePath)`, and passes that into the template instead of the framework's own `require`.

### Before (v9.4.4)
```javascript
// views/dashboard.js
const formatCurrency = require('../../../lib/format-currency.js'); // ❌ has to escape node_modules
```

### After (v9.4.5)
```javascript
// views/dashboard.js
const formatCurrency = require('../lib/format-currency.js'); // ✅ resolves relative to the view file
```

Requires made from further down the chain (e.g. `lib/format-currency.js` requiring a shared `config/locale.js`) were unaffected by this bug and continue to work as normal, since Node's own module resolution takes over once a real file has been loaded.

## What's New in v9.4.4

### 🐛 Bug Fix
- **Fixed `sendFile()` crash** - Was throwing "Error reading file" when trying to send files

### The Fix
Changed `res.statusCode || 200` to `response.statusCode || 200` in the file reading logic.

### Before (v9.4.3)
```javascript
app.get('/file', (req, res) => {
  app.sendFile('./document.pdf', res); // ❌ Throws "Error reading file"
});
```

### After (v9.4.4)
```javascript
app.get('/file', (req, res) => {
  app.sendFile('./document.pdf', res); // ✅ Works perfectly
});
```

## 🔄 What's New in v9.4.3

### 🐛 Bug Fixes
- **Fixed `res.status()` method**: Status codes now properly apply to responses instead of always defaulting to 200
- Improved response header handling for status codes

### 📝 Correct Usage Example

```javascript
// Chain with json
app.get('/created', (req, res) => {
  res.status(201).json({ message: 'Resource created' });
});

// Chain with send
app.get('/not-found', (req, res) => {
  res.status(404).send('<h1>Page Not Found</h1>');
});

// Set status separately
app.get('/unauthorized', (req, res) => {
  res.status(401);
  res.json({ error: 'Unauthorized access' });
});

// Status code examples
res.status(200).json({ data: users });  // OK
res.status(201).send('Created');         // Created
res.status(204).send();                  // No Content
res.status(400).json({ error: 'Bad request' });
res.status(401).send('Unauthorized');
res.status(404).send('Not found');
res.status(500).send('Server error');
```

## 🔄 What's New in v9.4.2

### 🆕 Dynamic CORS Origin Checking
- **Function-Based Origins**: Now you can pass a function to `app.cors()` to dynamically determine allowed origins
- **Flexible Logic**: Make CORS decisions based on origin, request headers, or any custom logic
- **Request Context**: The callback function receives both the origin and the full request object
- **Backward Compatible**: All existing static origin configurations continue to work

### 🔧 Smart Minification
- **Selective Minification**: Skip minification for specific code blocks using `<!-- novax:skip -->` markers
- **Multi-format Support**: Skip markers work for HTML, CSS, and JavaScript
- **Preserved Formatting**: Code within skip blocks maintains original formatting and whitespace
- **Flexible Skip Syntax**: Both block-level and inline skip markers available
