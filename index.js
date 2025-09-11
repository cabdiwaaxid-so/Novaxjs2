const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const querystring = require("querystring");
const FileHandler = require("./filehandler");
const templating = require("./viewshandler");
class novax {
  constructor() {
    this.routes = [];
    this.styles = "";
    this.staticPath = '';
    this.corsOptions = null;
    this._js = "";
    this.customErrors = {};
    this.middlewares = [];
    this.errorMiddlewares = [];
    this.maxFileSize = 50 * 1024 * 1024;
    this.fileHandler = new FileHandler(this.maxFileSize);
    this.fileConfig = {
      maxSize: this.maxFileSize,
      allowedTypes: [],
      keepOriginalName: false,
      maxFiles: 5
    };
    this.minifier = true;
    this.template = new templating(this)
    this.server = http.createServer((req, res) => {
      if (this.corsOptions) {
        this.setCorsHeaders(req, res, this.corsOptions);
      }
      res.status = (statusCode) => {
        res.statusCode = statusCode;
        return res;
      };

      /**
       * Redirect to a different URL
       * @param {string} location - The URL to redirect to
       * @param {number} [statusCode=302] - HTTP status code for the redirect (default: 302)
       * This method sets the Location header and ends the response.
      */
      res.redirect = (location, statusCode = 302) => {
        res.writeHead(statusCode, { Location: location });
        res.end();
      };

      res.json = (data) => {
        if(this.minifier) {
          this.minifyContent(data)
        }
        if (!res.headersSent) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(data));
        }
      };
      res.send = (content, contentType) => {
        let data = content;
        if (this.minifier) {
          data = contentType === 'application/javascript' ? this.minifyJs(content) : contentType === 'text/css' ? this.minifyCSS(content) : this.minifyContent(content)
        }
        if (!res.headersSent) {
          res.writeHead(200, { "Content-Type": contentType || "text/html" });
          res.end(data);
        }
      };

      res.set = (headers) => {
        for (const key in headers) {
          res.setHeader(key, headers[key]);
        }
        return res;
      };

      res.cookie = (name, value, options = {}) => {
        let cookieString = `${name}=${value}`;
        if (options.maxAge) {
          cookieString += `; Max-Age=${options.maxAge}`;
        }
        if (options.domain) {
          cookieString += `; Domain=${options.domain}`;
        }
        if (options.path) {
          cookieString += `; Path=${options.path}`;
        }
        if (options.expires) {
          cookieString += `; Expires=${options.expires.toUTCString()}`;
        }
        if (options.httpOnly) {
          cookieString += `; HttpOnly`;
        }
        if (options.secure) {
          cookieString += `; Secure`;
        }
        if (options.sameSite) {
          cookieString += `; SameSite=${options.sameSite}`;
        }
        const existingCookies = res.getHeader('Set-Cookie');
        if (existingCookies) {
          if (Array.isArray(existingCookies)) {
            res.setHeader('Set-Cookie', [...existingCookies, cookieString]);
          } else {
            res.setHeader('Set-Cookie', [existingCookies, cookieString]);
          }
        } else {
          res.setHeader('Set-Cookie', cookieString);
        }
        return res;
      };

      req.cookies = {};
      const cookieHeader = req.headers.cookie;
      if (cookieHeader) {
        const cookies = cookieHeader.split(';');
        cookies.forEach(cookie => {
          const [name, value] = cookie.split('=');
          req.cookies[name.trim()] = value ? value.trim() : '';
        });
      };
      req.clearCookie = (name, options = {}) => {
        options.expires = new Date(0);
        res.cookie(name, '', options);
        return res;
      };

      req.protocol = req.headers['x-forwarded-proto'] || 'http';
      req.fullUrl = `${req.protocol}://${req.headers.host}${req.url}`;

      if (req.method === "OPTIONS") {
        if (this.corsOptions) {
          this.setCorsHeaders(req, res, this.corsOptions);
        }
        res.writeHead(204);
        res.end();
        return;
      }
      const parsedUrl = url.parse(req.url, true);
      req.query = parsedUrl.query;
      req.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

       if (req.headers["content-type"] && req.headers["content-type"].startsWith("multipart/form-data")) {
        this.fileHandler.parseMultipartFormData(req)
        .then(({ fields, files }) => {
          req.body = fields;
          req.files = files;
          this.handleRequest(req, res);
        }).catch(err => {
            console.log(err)
            res.send(JSON.stringify({ error: 'File upload failed', ...err }));
        });
        return;
      }

      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        if (req.headers["content-type"] === "application/json") {
          try {
            req.body = JSON.parse(body);
          } catch (err) {
            req.body = {};
          }
        } else if (req.headers["content-type"] === "application/x-www-form-urlencoded") {
          req.body = querystring.parse(body);
        } else {
          req.body = {};
        }
        this.handleRequest(req, res);
      });
    });
  }

  handleRequest(req, res) {
  let i = 0;
  const next = (err) => {
    if (res.headersSent) {
      return;
    }
    if (err) {
      return this.handleError(err, req, res);
    }
    if (i < this.middlewares.length) {
      try {
        this.middlewares[i++](req, res, next);
      } catch (err) {
        next(err);
      }
    } else {
      let matchedRoute = null;
      const pathname = url.parse(req.url).pathname;
      for (const route of this.routes) {
        const match = pathname.match(route.path);
        if (req.method === route.method && match) {
          matchedRoute = route;
          req.params = match.groups;
          break;
        }
      }
      if (matchedRoute) {
        try {
          const content = matchedRoute.handler(req, res);

          if (content instanceof Promise) {
            content.then(result => {
              if (typeof result === 'string') {
                result = `${this.styles}${result}${this._js}`;
                if(this.minifier) {
                  result = this.minifyContent(result);
                }
                if (!res.headersSent) {
                  res.send(result);
                }
              } else if (result !== undefined) {
                res.json(result);
              }
            }).catch(next);
          } else {
            if (typeof content === 'string') {
              const processedContent = `${this.styles}${content}${this._js}`;
              const finalContent = this.minifier ? this.minifyContent(processedContent) : processedContent;
              if (!res.headersSent) {
                res.send(finalContent);
              }
            } else if (content !== undefined) {
              res.json(content);
            }
          }
        } catch (err) {
          return next(err);
        }
      } else {
        if (this.staticPath && req.url.startsWith(this.staticPath)) {
          this.serveStaticFile(req, res, () => {
            this.show404(req, res);
          });
        } else {
          this.show404(req, res);
        }
      }
    }
  };
  next();
}

  handleError(err, req, res) {
    let i = 0;
    const next = (error) => {
      if (i < this.errorMiddlewares.length) {
        this.errorMiddlewares[i++](error || err, req, res, next);
      } else {
        const statusCode = err.statusCode || 500;
        if (this.errorMiddlewares.length > 0) {
          const errorContent = this.errorMiddlewares[0](err, req, res, () => {});
        if (errorContent && !res.headersSent) {
          res.writeHead(statusCode, { "Content-Type": "text/html" });
          res.end(errorContent);
          return;
        }
      }
      if (this.customErrors[statusCode]) {
        const errorContent = this.customErrors[statusCode](err, req, res);
        if (!res.headersSent) {
          res.writeHead(statusCode, { "Content-Type": "text/html" });
          res.end(errorContent);
        }
        return;
      }
      if (!res.headersSent) {
        res.writeHead(statusCode, { "Content-Type": "text/html" });
        res.end(`<h1>${statusCode} ${http.STATUS_CODES[statusCode] || 'Error'}</h1><p>${err.message}</p>`);
      }
    }
  };
  next(err);
}

  show404(req, res) {
  const err = new Error(`Not Found: ${req.method} ${req.url}`);
  err.statusCode = 404;
  if (this.customErrors[404]) {
    const errorContent = this.customErrors[404](err, req, res);
    if (!res.headersSent) {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end(errorContent);
    }
    return;
  }
  if (!res.headersSent) {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end(`<p>Error 404: Not Found</p><p>Method: ${req.method}</p><p>Requested Route: ${req.url}</p>`);
  }
}

  set style(value) {
    this.styles = `<style>${value}</style>`;
  }

  set js(value) {
    this._js = `<script>${value}</script>`;
  }

  /** * Register a custom error handler for specific status codes
   * @param {number} statusCode - HTTP status code (e.g., 404, 500)
   * @param {Function} handler - Function to handle the error
   * This method allows you to define custom error handling for specific HTTP status codes.
   */
  on(statusCode, handler) {
  if (typeof statusCode !== 'number' || statusCode < 400 || statusCode >= 600) {
    throw new Error('Status code must be a number between 400 and 599');
  }
  if (typeof handler !== 'function') {
    throw new Error('Handler must be a function');
  }
  this.customErrors[statusCode] = handler;
}

  /** * Start the server
   * @param {number} port - Port number to listen on (e.g., 3000)
   * @param {string} [host='localhost'] - Hostname to listen on (default: 'localhost')
   * This method starts the server and listens for incoming requests.
   */
  at(port, host, callback) {
    if (typeof host === 'function') {
      callback = host;
      host = 'localhost';
    }
  this.server.listen(port, host, callback);
}

/** Create a new route for GET requests
 * @param {string} path - The path to the route (e.g., '/users/:id')
 * @param {...Function} handlers - Middleware functions followed by the route handler
 * This method allows you to define a GET route with optional middleware.
 */
get(path, ...handlers) {
  const handler = handlers.pop();
  const middlewares = handlers;
  const regexPath = path.replace(/:([\w]+)/g, "(?<$1>[^/]+)");
  this.routes.push({
    method: "GET",
    path: new RegExp(`^${regexPath}$`),
    handler: async (req, res) => {
      try {
        for (const middleware of middlewares) {
          await new Promise((resolve, reject) => {
            middleware(req, res, (err) => {
              if (err) return reject(err);
              resolve();
            });
          });
        }
        return handler(req, res);
      } catch (err) {
        throw err;
      }
    }
  });
}

/** Create a new route for POST requests
 * @param {string} path - The path to the route (e.g., '/users/:id')
 * @param {...Function} handlers - Middleware functions followed by the route handler
 * This method allows you to define a POST route with optional middleware.
 * The last function in the handlers array will be treated as the route handler.
 */
post(path, ...handlers) {
  const handler = handlers.pop();
  const middlewares = handlers;
  const regexPath = path.replace(/:([\w]+)/g, "(?<$1>[^/]+)");

  this.routes.push({
    method: "POST",
    path: new RegExp(`^${regexPath}$`),
    handler: async (req, res) => {
      try {
        for (const middleware of middlewares) {
          await new Promise((resolve, reject) => {
            middleware(req, res, (err) => {
              if (err) return reject(err);
              resolve();
            });
          });
        }
        return handler(req, res);
      } catch (err) {
        throw err;
      }
    }
  });
}

/** Update a resource
 * @param {string} path - The path to the resource (e.g., '/users/:id')
 * @param {...Function} handlers - Middleware functions followed by the route handler
 * This method allows you to define a PUT route with optional middleware.
 */
put(path, ...handlers) {
  const handler = handlers.pop();
  const middlewares = handlers;
  const regexPath = path.replace(/:([\w]+)/g, "(?<$1>[^/]+)");

  this.routes.push({
    method: "PUT",
    path: new RegExp(`^${regexPath}$`),
    handler: async (req, res) => {
      try {
        for (const middleware of middlewares) {
          await new Promise((resolve, reject) => {
            middleware(req, res, (err) => {
              if (err) return reject(err);
              resolve();
            });
          });
        }
        return handler(req, res);
      } catch (err) {
        throw err;
      }
    }
  });
}

/** Delete a resource
 * @param {string} path - The path to the resource (e.g., '/users/:id')
 * @param {...Function} handlers - Middleware functions followed by the route handler
 * This method allows you to define a DELETE route with optional middleware.
 */
delete(path, ...handlers) {
  const handler = handlers.pop();
  const middlewares = handlers;
  const regexPath = path.replace(/:([\w]+)/g, "(?<$1>[^/]+)");

  this.routes.push({
    method: "DELETE",
    path: new RegExp(`^${regexPath}$`),
    handler: async (req, res) => {
      try {
        for (const middleware of middlewares) {
          await new Promise((resolve, reject) => {
            middleware(req, res, (err) => {
              if (err) return reject(err);
              resolve();
            });
          });
        }
        return handler(req, res);
      } catch (err) {
        throw err;
      }
    }
  });
}

/**
 * Group routes under a common base path
 * @param {string} basePath - The base path for the group (e.g., '/api')
 * @param {Function} callback - A function that receives route helpers for the group
 * This function allows you to define multiple routes under a common base path.
 * The callback function will receive an object with methods like get, post, put, delete, and group.
 */
group(basePath, callback) {
  if (typeof callback !== 'function') {
    throw new Error("group requires a callback function");
  }

  const methods = ['get', 'post', 'put', 'delete'];

  const createRouteHelpers = (prefix) => {
    const helpers = {};
    for (const method of methods) {
      helpers[method] = (path, ...handlers) => {
        const fullPath = `${prefix}${path}`.replace(/\/+/g, '/');
        this[method](fullPath, ...handlers);
      };
    }

    helpers.group = (subPath, subCallback) => {
      const fullSubPath = `${prefix}${subPath}`.replace(/\/+/g, '/');
      this.group(fullSubPath, subCallback);
    };

    return helpers;
  };

  const helpers = createRouteHelpers(basePath);
  callback(helpers);
}

  /** * Use a router module or function
 * @param {Function|Object} router - Router function or module
 * This method allows you to modularize routes by passing a function or module that receives the app instance.
 */
useRouter(router) {
  if (typeof router === 'function') {
    router(this);
  } else if (typeof router === 'object' && router !== null && typeof router.default === 'function') {
    router.default(this);
  } else if (typeof router === 'object' && router !== null) {
    this._registerRouterObject(router);
  } else {
    throw new Error('Router must be a function, a module with default export, or an object with route definitions');
  }
}

/** * Register routes from an object
 * @param {Object} routerObject - Object containing route definitions
 * @private
 */
_registerRouterObject(routerObject) {
  const methods = ['get', 'post', 'put', 'delete', 'group'];
  for (const [path, routeConfig] of Object.entries(routerObject)) {
    if (typeof routeConfig === 'function') {
      this.get(path, routeConfig);
    } else if (typeof routeConfig === 'object') {
      const method = (routeConfig.method || 'get').toLowerCase();
      const handler = routeConfig.handler;
      const middleware = routeConfig.middleware || [];
      if (methods.includes(method) && typeof handler === 'function') {
        this[method](path, ...middleware, handler);
      }
    }
  }
}

  /** * Use a middleware function
   * @param {Function} middleware - The middleware function to use
   * This function adds a middleware to the application that will be executed for every request.
   * The middleware function should accept three parameters: req, res, and next.
   */
  useMiddleware(middleware) {
    this.middlewares.push(middleware);
  }

  useErrorMiddleware(middleware) {
    this.errorMiddlewares.push(middleware);
  }

  /** Serve static files from a custom directory
   * @param {string} [customDir='public'] - Directory to serve static files from (default: 'public')
   * This method sets up a middleware to serve static files from the specified directory.
   * It strips the static path prefix from the URL if it exists, allowing for cleaner URLs.
   */
  serveStatic(customDir = 'public') {
  this.staticPath = customDir;
  this.useMiddleware((req, res, next) => {
    const staticPrefix = `/${customDir}`;
    if (req.url.startsWith(staticPrefix)) {
      req.url = req.url.slice(staticPrefix.length) || '/';
    }
    this.serveStaticFile(req, res, next);
  });
}

  serveStaticFile(req, res, next) {
    const parsedUrl = url.parse(req.url, true);
    const filePath = path.join(process.cwd(), this.staticPath, parsedUrl.pathname);
    const dntm = ['.jpg', '.jpeg', '.png', '.mp4', '.mp3', '.gif', '.webp'];
    const extname = path.extname(filePath);
    const fileType = dntm.includes(extname) ? '' : 'utf-8';


    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        return next();
      }

      fs.readFile(filePath, fileType, (err, data) => {
        if (err) {
          return next();
        }
        const mimeTypes = JSON.parse(fs.readFileSync(path.join(__dirname, 'mimetype.json'), 'utf8'));
        const contentType = mimeTypes[extname] || 'text/html';

        if(this.minifier) {
          data = contentType === 'application/javascript' ? this.minifyJs(data) : contentType === 'text/css' ? this.minifyCSS(data) : this.minifyContent(data)
        }

        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
      });
    });
  }

  /** * Initialize the application with options
   * @param {Object} options - Options for initialization
   * * @param {string} [options.staticPath] - Path to serve static files from (e.g., 'public')
   * * @param {boolean} [options.minifier=true] - Whether to minify HTML output (default: true)
   * * @param {Object} [options.fileConfig] - Configuration for file uploads
   * * This method allows you to set up the application with various options.
   */
  init(options) {
    if (typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('Options must be an object');
    }
    if (options.staticPath) {
      this.serveStatic(options.staticPath);
    }
    if (options.minifier !== undefined) {
      this.minifier = Boolean(options.minifier);
    }
    if (options.fileConfig) {
      this.setFileConfig(options.fileConfig);
    }
  }

  /** * Set a custom error handler
   * @param {Function} handler - The error handler function
   * This function allows you to define a custom error handler that will be called when an error occurs.
   * The handler function should accept three parameters: err, req, res.
   * It can also handle specific HTTP status codes by checking err.statusCode.
   */
  error(handler) {
  this.useErrorMiddleware((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    if (this.customErrors[statusCode]) {
      const errorContent = this.customErrors[statusCode](err, req, res);
      if (!res.headersSent) {
        res.writeHead(statusCode, { "Content-Type": "text/html" });
        res.end(errorContent);
      }
      return;
    }
    try {
      const result = handler(err, req, res);
      if (result instanceof Promise) {
        result.catch(e => {
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end(`<h1>500 Internal Server Error</h1><p>${e.message}</p>`);
          }
        });
      }
    } catch (e) {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(`<h1>500 Internal Server Error</h1><p>${e.message}</p>`);
      }
    }
  });
}

  /** * Send a file to the client
 * @param {string} filePath - Path to the file to send
 * @param {string|http.ServerResponse} contentTypeOrRes - Content type or response object
 * @param {http.ServerResponse} [res] - Response object (optional)
 * @returns {http.ServerResponse} - The response object
 */

  sendFile(filePath, contentTypeOrRes, res) {
    const dntm = ['.jpg', '.jpeg', '.png', '.mp4', '.mp3', '.gif', '.webp'];
    const extname = path.extname(filePath);
    const fileType = dntm.includes(extname) ? 'binary' : 'utf-8';
    let contentType, response;

    if (arguments.length === 2) {
        // Pattern: sendFile(filePath, res)
        response = contentTypeOrRes;
        contentType = 'text/html'; // default content type
    } else {
        // Pattern: sendFile(filePath, contentType, res)
        contentType = contentTypeOrRes;
        response = res;
    }

    if (!response || typeof response.writeHead !== 'function') {
        throw new Error('Valid response object is required');
    }

    if (!filePath) {
        response.writeHead(404, { 'Content-Type': 'text/html' });
        return response.end('File not found');
    }

    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
        response.writeHead(404, { 'Content-Type': 'text/html' });
        return response.end('File not found');
    }

    const type = contentType || 'text/html';
    try {
        let fileContent = fs.readFileSync(resolvedPath, fileType);
        if(this.minifier) {
          fileContent = contentType === 'application/javascript' ? this.minifyJs(fileContent) : contentType === 'text/css' ? this.minifyCSS(fileContent) : this.minifyContent(fileContent);
        }
        response.writeHead(200, { 'Content-Type': type });
        return response.end(fileContent);
    } catch (err) {
        response.writeHead(500, { 'Content-Type': 'text/html' });
        return response.end('Error reading file');
    }
}

  setCorsHeaders(req, res, options) {
    if (options.origins.includes('*')) {
      res.setHeader("Access-Control-Allow-Origin", '*');
    } else {
      const origin = req.headers.origin;
      if (options.origins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
    }
    res.setHeader("Access-Control-Allow-Methods", options.methods || "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", options.headers || "Content-Type, Authorization");
    if (options.credentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
  }

  /** * Set CORS options
 * @param {Object} options - CORS options
 * @param {string[]} options.origins - Allowed origins (e.g., ['https://example.com', '*'])
 * @param {string} [options.methods] - Allowed methods (e.g., 'GET, POST, PUT, DELETE')
 * @param {string} [options.headers] - Allowed headers (e.g., 'Content-Type, Authorization')
 * @param {boolean} [options.credentials] - Whether to allow credentials (default: false)
 * */
  cors(options) {
    this.corsOptions = options;
  }

  /**
 * Set multiple file upload configurations at once
 * @param {Object} config - Configuration object
 * @param {number} config.maxSize - Max file size in MB
 * @param {string[]} config.allowedTypes - Allowed MIME types
 * @param {number} config.maxFiles - Maximum number of files
 */

  setFileConfig(config) {
    if (config.maxSize !== undefined) {
      this.setFileSizeLimit(config.maxSize);
    }
    if (config.allowedTypes !== undefined) {
      this.setAllowedFileTypes(config.allowedTypes);
    }
    if (config.keepOriginalName !== undefined) {
      this.setKeepOriginalName(config.keepOriginalName);
    }
    if (config.maxFiles !== undefined) {
      this.setMaxFiles(config.maxFiles);
    }
  }

  /**
 * Set allowed file types
 * @param {string[]} types - Array of MIME types (e.g., ['image/jpeg', 'application/pdf'])
 */

  setAllowedFileTypes(types) {
    if (!Array.isArray(types)) {
      throw new Error('Allowed types must be an array');
    }
    this.fileConfig.allowedTypes = types;
    this.fileHandler.allowedTypes = types;
  }

  /**
   * Set maximum number of files allowed in a single upload
   * @param {number} max - Maximum number of files
  */
  setMaxFiles(max) {
    if (typeof max !== 'number' || max <= 0) {
     throw new Error('Max files must be a positive number');
    }
    this.fileConfig.maxFiles = max;
    this.fileHandler.maxFiles = max;
  }

  /**
 * Set whether to keep original filenames
 * @param {boolean} keep - Whether to keep original filenames
 */
  setKeepOriginalName(keep) {
    this.fileConfig.keepOriginalName = Boolean(keep);
    this.fileHandler.keepOriginalName = Boolean(keep);
  }

  /**
 * Set maximum file size limit
 * @param {number} sizeInMB - Maximum size in megabytes
 */

  setFileSizeLimit(sizeInMB) {
    if (typeof sizeInMB !== 'number' || sizeInMB <= 0) {
      throw new Error('File size limit must be a positive number');
    }
    this.maxFileSize = sizeInMB * 1024 * 1024;
    this.fileHandler.maxFileSize = this.maxFileSize;
  }
   setViewEngine(engine, options = {}) {
    this.template.setViewEngine(engine, options);
  }

  addHelper(name, fn) {
    this.template.addHelper(name, fn);
  }

  addHelpers(helpers) {
    this.template.addHelpers(helpers);
  }

  /** * Use a plugin to extend the application
   * @param {Function} plugin - The plugin function to use
   * @param {Object} [options] - Options for the plugin
   * * The plugin function should accept a context object with methods to add routes, middlewares, etc.
   */
  usePlugin(plugin, options = {}) {
  if (typeof plugin !== 'function') {
    throw new Error('Plugin must be a function');
  }

  const context = {
    app: this,
    options,
    addMethod: (name, fn) => {
      if (this[name]) {
        console.warn(`Warning: Overwriting existing method '${name}'`);
      }
      this[name] = fn.bind(this);
    },
    addRoute: (method, path, handler) => {
      this[method.toLowerCase()](path, handler);
    },
    addMiddleware: (fn) => {
      this.useMiddleware(fn);
    },
    addErrorMiddleware: (fn) => {
      this.useErrorMiddleware(fn);
    },
    setConfig: (key, value) => {
      if (!this._config) this._config = {};
      this._config[key] = value;
    },
    getConfig: (key) => {
      return this._config?.[key];
    }
  };

  plugin(context, options);

  return this;
}

  /** * Render a view template with data
 * @param {string} file - The name of the view file (without extension)
 * @param {Object} [data={}] - Data to pass to the view template
 * @returns {Promise<string>} - Rendered HTML string
 */
  render(file, data = {}) {
    return this.template.render(file, data);
  }
  minifyContent(content) {
    if (!this.minifier || typeof content !== 'string') return content;
    if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
      try {
        JSON.parse(content);
        return content;
      } catch (e) {
        // Not valid JSON, continue with minification
      }
    }
    if (content.includes('<?xml') || content.trim().startsWith('<![CDATA[')) {
      return content;
    }

  const preserved = {
    strings: [],
    comments: [],
    scripts: [],
    styles: [],
    templates: []
  };

  content = content
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (match, scriptContent) => {
      const minifiedScript = this.minifyJs(scriptContent);
      const fullScript = match.replace(scriptContent, minifiedScript);
      preserved.scripts.push(fullScript);
      return `__PRESERVED_SCRIPT_${preserved.scripts.length - 1}__`;
    })
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, styleContent) => {
      const minifiedCss = this.minifyCSS(styleContent);
      const fullStyle = match.replace(styleContent, minifiedCss);
      preserved.styles.push(fullStyle);
      return `__PRESERVED_STYLE_${preserved.styles.length - 1}__`;
    })
    .replace(/<textarea\b[^>]*>([\s\S]*?)<\/textarea>/gi, (match) => {
      preserved.templates.push(match);
      return `__PRESERVED_TEXTAREA_${preserved.templates.length - 1}__`;
    })
    .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (match) => {
      preserved.templates.push(match);
      return `__PRESERVED_PRE_${preserved.templates.length - 1}__`;
    })
    .replace(/<!--\[if[^\]]*?\]>[\s\S]*?<!\[endif\]-->/gi, (match) => {
      preserved.comments.push(match);
      return `__PRESERVED_CONDITIONAL_${preserved.comments.length - 1}__`;
    })
    .replace(/<!--#\s*[^\s]+[^>]*-->/gi, (match) => {
      preserved.comments.push(match);
      return `__PRESERVED_SSI_${preserved.comments.length - 1}__`;
    })
    .replace(/(["'`])(?:\\.|(?!\1).)*?\1|https?:\/\/[^\s"'<>]+|ftp:\/\/[^\s"'<>]+|file:\/\/[^\s"'<>]+/g, (match) => {
      preserved.strings.push(match);
      return `__PRESERVED_STRING_${preserved.strings.length - 1}__`;
    });

  content = content
    .replace(/<!--(?!\[if|\#)[\s\S]*?-->/g, '');


  content = content
    .replace(/>\s+</g, '><')
    .replace(/\s+(\/?)>/g, '$1>')
    .replace(/(<[^>]+?)\s+>/g, '$1>')
    .replace(/\s+/g, ' ')
    .trim();

  content = content
    .replace(/__PRESERVED_SCRIPT_(\d+)__/g, (_, id) => {
      return preserved.scripts[Number(id)] || '';
    })
    .replace(/__PRESERVED_STYLE_(\d+)__/g, (_, id) => {
      return preserved.styles[Number(id)] || '';
    })
    .replace(/__PRESERVED_TEXTAREA_(\d+)__/g, (_, id) => {
      return preserved.templates[Number(id)] || '';
    })
    .replace(/__PRESERVED_PRE_(\d+)__/g, (_, id) => {
      return preserved.templates[Number(id)] || '';
    })
    .replace(/__PRESERVED_CONDITIONAL_(\d+)__/g, (_, id) => {
      return preserved.comments[Number(id)] || '';
    })
    .replace(/__PRESERVED_SSI_(\d+)__/g, (_, id) => {
      return preserved.comments[Number(id)] || '';
    })
    .replace(/__PRESERVED_STRING_(\d+)__/g, (_, id) => {
      return preserved.strings[Number(id)] || '';
    });

  return content;
}

/**
 * Minify CSS content
 * @param {string} css - CSS content to minify
 * @returns {string} Minified CSS
 */
minifyCSS(css) {
  if (typeof css !== 'string') return css;
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/\s+/g, ' ')
    .replace(/\s*([+\-*\/=<>])\s*/g, '$1')
    .trim();
}

/**
 * Minify JavaScript content
 * @param {string} js - JavaScript content to minify
 * @returns {string} Minified JavaScript
 */
minifyJs(js) {
  if (typeof js !== 'string') return js;

  // Preserve strings, regex patterns, and comments that might be important
  const preserved = [];

  // First preserve template literals and complex strings
  js = js
    .replace(/(`)(?:\\.|(?!\1).)*?\1|(["'])(?:\\.|(?!\2).)*?\2/g, (match) => {
      preserved.push(match);
      return `__PRESERVED_${preserved.length - 1}__`;
    })
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, ''); // Remove line comments

  // Now minify the remaining code
  js = js
    .replace(/\s*([=+\-*\/%&|^~!<>?:])\s*/g, '$1')
    .replace(/\s*([()\[\]{}])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/;\s*;/g, ';')
    .replace(/;}/g, '}')
    .trim();

  // Restore preserved content
  js = js.replace(/__PRESERVED_(\d+)__/g, (_, id) => {
    return preserved[Number(id)] || '';
  });

  return js;
}

}

module.exports = novax;