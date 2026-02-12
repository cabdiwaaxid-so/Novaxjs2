const fs = require("fs");
const path = require("path");

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

class NovaxTemplating {
  constructor(app) {
    this.app = app;
    this.viewEngine = null;
    this.engine = null;
    this.viewsPath = path.join(process.cwd(), 'views');
    this.viewHelpers = {};
    this.engineOptions = {};
    this.viewsType = 'html';
    this.cache = new Map();
    this.filters = {
      upper: (s) => String(s).toUpperCase(),
      lower: (s) => String(s).toLowerCase(),
      json: (o) => JSON.stringify(o, null, 2),
      first: (a) => Array.isArray(a) ? a[0] : a,
      last: (a) => Array.isArray(a) ? a[a.length - 1] : a,
      length: (v) => v ? v.length : 0,
      reverse: (v) => Array.isArray(v) ? [...v].reverse() : String(v).split('').reverse().join(''),
      capitalize: (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1)
    };
  }

  setViewEngine(engine, options = {}) {
    if (typeof engine !== 'string' && typeof engine !== 'object' && typeof engine !== 'function') {
      throw new Error('View engine must be a string (for built-in) or module object (for third-party)');
    }

    if (typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('Options must be an object');
    }

    this.cache.clear();

    if (typeof engine === 'string') {
      if (engine !== 'novax') {
        throw new Error('Built-in view engine must be "novax"');
      }
      this.viewEngine = 'novax';
      this.engine = 'novax';
    } else {
      this.viewEngine = engine;
      if (engine.name && engine.name.toLowerCase() === 'pug') {
        this.engine = (filePath, data, options, callback) => {
          const pugOptions = {
            filename: filePath,
            ...this.engineOptions,
            ...options
          };
          fs.readFile(filePath, 'utf8', (err, template) => {
            if (err) return callback(err);
            try {
              const result = engine.render(template, {
                ...pugOptions,
                ...data
              });
              callback(null, result);
            } catch (renderErr) {
              callback(renderErr);
            }
          });
        };
      } else if (typeof engine.__express === 'function') {
        this.engine = engine.__express;
      } else if (typeof engine.renderFile === 'function') {
        this.engine = engine.renderFile;
      } else if (typeof engine.compile === 'function') {
        this.engine = (filePath, data, options, callback) => {
          fs.readFile(filePath, 'utf8', (err, template) => {
            if (err) return callback(err);
            try {
              const compiled = engine.compile(template, options);
              const result = compiled(data);
              callback(null, result);
            } catch (compileErr) {
              callback(compileErr);
            }
          });
        };
      } else if (typeof engine.render === 'function') {
        this.engine = (filePath, data, options, callback) => {
          fs.readFile(filePath, 'utf8', (err, template) => {
            if (err) return callback(err);
            try {
              const result = engine.render(template, data);
              callback(null, result);
            } catch (renderErr) {
              callback(renderErr);
            }
          });
        };
      } else if (typeof engine === 'function') {
        this.engine = engine;
      } else {
        throw new Error('Third-party view engine doesn\'t conform to supported conventions');
      }

      if (!options.viewsType) {
        throw new Error('viewsType must be specified when using third-party view engines');
      }
    }

    this.viewsPath = options.viewsPath || path.join(process.cwd(), 'views');
    this.viewHelpers = options.helpers || {};
    this.engineOptions = options.engineOptions || {};
    this.viewsType = options.viewsType || 'html';
    if (!fs.existsSync(this.viewsPath)) {
      fs.mkdirSync(this.viewsPath, { recursive: true });
    }
  }

  addHelper(name, fn) {
    if (typeof name !== 'string' || !name) {
      throw new Error('Helper name must be a non-empty string');
    }
    if (typeof fn !== 'function') {
      throw new Error('Helper must be a function');
    }
    this.viewHelpers[name] = fn;
    this.cache.clear();
  }

  addHelpers(helpers) {
    if (typeof helpers !== 'object' || Array.isArray(helpers)) {
      throw new Error('Helpers must be an object with function values');
    }
    for (const [name, fn] of Object.entries(helpers)) {
      this.addHelper(name, fn);
    }
  }

  addFilter(name, fn) {
    if (typeof name !== 'string' || !name) {
      throw new Error('Filter name must be a non-empty string');
    }
    if (typeof fn !== 'function') {
      throw new Error('Filter must be a function');
    }
    this.filters[name] = fn;
    this.cache.clear();
  }

  async render(file, data = {}) {
    if (!this.viewEngine) {
      throw new Error('No view engine configured');
    }

    if (this.viewEngine === 'novax') {
      return this._renderNovax(file, data);
    } else {
      return new Promise((resolve, reject) => {
        this._renderThirdParty(file, data, resolve, reject);
      });
    }
  }

  async _renderNovax(file, data) {
    const isJsTemplate = this.viewsType === 'js';
    const ext = isJsTemplate ? 'js' : 'html';
    const fileName = file.endsWith('.' + ext) ? file : `${file}.${ext}`;
    const filePath = path.join(this.viewsPath, fileName);

    try {
      if (isJsTemplate) {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return this._renderJsTemplate(content, data);
      } else {
        const compiled = await this._getCompiled(filePath);
        return await compiled(data, this.viewHelpers, this.filters, this._include.bind(this), this._renderLayout.bind(this), null);
      }
    } catch (err) {
      throw err;
    }
  }

  async _getCompiled(filePath) {
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath);
    }

    const content = await fs.promises.readFile(filePath, 'utf8');
    const code = this._generateCode(content);

    const helperKeys = Object.keys(this.viewHelpers);
    const helperDecls = helperKeys.length > 0 ? `const { ${helperKeys.join(', ')} } = helpers;` : '';

    try {
      const fn = new AsyncFunction('data', 'helpers', 'filters', 'include', 'renderLayout', '__parentSections', `
        ${helperDecls}
        let __output = "";
        let __layout = null;
        let __sections = __parentSections || {};
        try {
          with (data) {
            ${code}
          }
        } catch (e) {
          throw e;
        }
        if (__layout) {
          return await renderLayout(__layout, data, __sections);
        }
        return __output;
      `);
      this.cache.set(filePath, fn);
      return fn;
    } catch (err) {
      console.error('Error compiling template:', filePath);
      throw err;
    }
  }

  _generateCode(content) {
    let code = '';
    let stack = [];
    const tokenRegex = /(@#[\s\S]*?#@|@\{[\s\S]*?\}|@if\s*\(.*?\)|@elif\s*\(.*?\)|@else|@each\s*\(.*?\)|@end|@var\s+.*?=|@include\s*\(.*?\)|@extends\s*\(.*?\)|@section\s*\(.*?\)|@yield\s*\(.*?\)|@[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(.*?\)|@(?:[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*(?:\s*\|[a-zA-Z_$][a-zA-Z0-9_$]*(?:\(.*\))?)*))/g;

    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(content)) !== null) {
      const text = content.slice(lastIndex, match.index);
      if (text) {
        code += `__output += ${JSON.stringify(text)};\n`;
      }

      let token = match[0];

      if (token.startsWith('@#')) {
        // Comment, do nothing
      } else if (token.startsWith('@if')) {
        const condMatch = token.match(/@if\s*\((.*)\)/);
        const cond = condMatch ? condMatch[1] : 'false';
        code += `if (${cond}) {\n`;
        stack.push('if');
      } else if (token.startsWith('@elif')) {
        const condMatch = token.match(/@elif\s*\((.*)\)/);
        const cond = condMatch ? condMatch[1] : 'false';
        code += `} else if (${cond}) {\n`;
      } else if (token === '@else') {
        code += `} else {\n`;
      } else if (token.startsWith('@each')) {
        const loopMatch = token.match(/@each\s*\((.*)\)/)[1];
        let itemVar, indexVar, arrayExpr;

        const inMatch = loopMatch.match(/^\s*([^,\s]+)(?:\s*,\s*([^,\s]+))?\s+in\s+(.+)\s*$/);
        if (inMatch) {
          itemVar = inMatch[1];
          indexVar = inMatch[2] || '__index';
          arrayExpr = inMatch[3];
        } else {
          itemVar = 'item';
          indexVar = '__index';
          arrayExpr = loopMatch;
        }

        const arrName = `__arr_${stack.length}`;
        code += `const ${arrName} = ${arrayExpr};\n`;
        code += `if (${arrName} && (Array.isArray(${arrName}) || typeof ${arrName} === 'object')) {\n`;
        code += `  const __entries = Array.isArray(${arrName}) ? ${arrName}.map((v, i) => [i, v]) : Object.entries(${arrName});\n`;
        code += `  for (let [__idx, __val] of __entries) {\n`;
        code += `    let ${itemVar} = __val;\n`;
        if (indexVar !== 'index') {
          code += `    let ${indexVar} = __idx;\n`;
        }
        code += `    const index = __idx;\n`;
        code += `    const isFirst = __idx === 0;\n`;
        code += `    const isLast = __idx === __entries.length - 1;\n`;
        stack.push('each');
      } else if (token === '@end') {
        const type = stack.pop();
        if (type === 'each') {
          code += `    }\n  }\n`;
        } else if (type === 'if') {
          code += `}\n`;
        } else if (type === 'section') {
          code += `  return __output;\n})();\n`;
        }
      } else if (token.startsWith('@var')) {
        const rest = content.slice(match.index);
        const varMatch = rest.match(/@var\s+({[^}]+}|\[[^\]]+\]|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([\s\S]*?);/);
        if (varMatch) {
          code += `let ${varMatch[1]} = ${varMatch[2]};\n`;
          tokenRegex.lastIndex = match.index + varMatch[0].length;
        }
      } else if (token.startsWith('@include')) {
        const includeMatch = token.match(/@include\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*([\s\S]*?))?\s*\)/);
        if (includeMatch) {
          const file = includeMatch[1];
          const includeData = includeMatch[2] || '{}';
          code += `__output += await include(${JSON.stringify(file)}, { ...data, ...(${includeData}) });\n`;
        }
      } else if (token.startsWith('@extends')) {
        const layoutMatch = token.match(/@extends\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        if (layoutMatch) {
          code += `__layout = ${JSON.stringify(layoutMatch[1])};\n`;
        }
      } else if (token.startsWith('@section')) {
        const sectionMatch = token.match(/@section\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        if (sectionMatch) {
          const sectionName = sectionMatch[1];
          code += `__sections[${JSON.stringify(sectionName)}] = (async () => {\n  let __output = "";\n`;
          stack.push('section');
        }
      } else if (token.startsWith('@yield')) {
        const yieldMatch = token.match(/@yield\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        if (yieldMatch) {
          const sectionName = yieldMatch[1];
          code += `__output += (__sections[${JSON.stringify(sectionName)}] ? await __sections[${JSON.stringify(sectionName)}] : "");\n`;
        }
      } else if (token.startsWith('@{')) {
        const expr = token.slice(2, -1);
        code += `__output += ${this._processExpression(expr)};\n`;
      } else if (token.startsWith('@')) {
        const varPath = token.slice(1);
        code += `__output += ${this._processExpression(varPath)};\n`;
      }

      lastIndex = tokenRegex.lastIndex;
    }

    const remaining = content.slice(lastIndex);
    if (remaining) {
      code += `__output += ${JSON.stringify(remaining)};\n`;
    }

    return code;
  }

  _processExpression(expr) {
    expr = expr.trim();

    // Replace @variable with variable (e.g., @user.name -> user.name, @isFirst -> isFirst)
    // but avoid matching email addresses or other non-variables
    expr = expr.replace(/(^|[^a-zA-Z0-9_$])@([a-zA-Z_$][a-zA-Z0-9_$]*)/g, '$1$2');

    const parts = expr.split('|').map(p => p.trim());
    let result = parts[0];

    for (let i = 1; i < parts.length; i++) {
      const filterPart = parts[i];
      let filterName = filterPart;
      let args = '';
      const argMatch = filterPart.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\((.*)\)$/);
      if (argMatch) {
        filterName = argMatch[1];
        args = ', ' + argMatch[2];
      }
      result = `(filters[${JSON.stringify(filterName)}] ? filters[${JSON.stringify(filterName)}](${result}${args}) : ${result})`;
    }

    return `(${result} !== undefined && ${result} !== null ? ${result} : "")`;
  }

  async _include(file, data) {
    const isJsTemplate = this.viewsType === 'js';
    const ext = isJsTemplate ? 'js' : 'html';
    const fileName = file.endsWith('.' + ext) ? file : `${file}.${ext}`;
    const filePath = path.join(this.viewsPath, fileName);
    const compiled = await this._getCompiled(filePath);
    return await compiled(data, this.viewHelpers, this.filters, this._include.bind(this), this._renderLayout.bind(this), null);
  }

  async _renderLayout(file, data, sections) {
    const isJsTemplate = this.viewsType === 'js';
    const ext = isJsTemplate ? 'js' : 'html';
    const fileName = file.endsWith('.' + ext) ? file : `${file}.${ext}`;
    const filePath = path.join(this.viewsPath, fileName);
    const compiled = await this._getCompiled(filePath);
    return await compiled(data, this.viewHelpers, this.filters, this._include.bind(this), this._renderLayout.bind(this), sections);
  }

  _renderJsTemplate(content, data) {
    try {
      const module = { exports: {} };
      const exports = module.exports;
      const context = {
        ...data,
        ...this.viewHelpers,
        helpers: this.viewHelpers
      };

      const helperDeclarations = Object.keys(this.viewHelpers)
        .map(helper => `const ${helper} = helpers.${helper};`)
        .join('\n');

      const templateFn = new Function(
        'module',
        'exports',
        'require',
        'data',
        'helpers',
        `
          ${helperDeclarations}
          ${content}
          return module.exports;
        `
      );

      const result = templateFn(module, exports, require, data, this.viewHelpers);

      if (typeof result === 'function') {
        const rendered = result.call(context, data);
        if (rendered instanceof Promise) return rendered;
        return Promise.resolve(rendered);
      } else if (typeof result === 'string') {
        return Promise.resolve(result);
      } else if (result && typeof result.then === 'function') {
        return result;
      } else {
        return Promise.resolve(JSON.stringify(result));
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  _renderThirdParty(file, data, resolve, reject) {
    const filePath = path.join(this.viewsPath, `${file}.${this.viewsType}`);
    const context = { ...data, ...this.viewHelpers };

    fs.access(filePath, fs.constants.F_OK, (accessErr) => {
      if (accessErr) {
        return reject(new Error(`Template file not found: ${filePath}`));
      }

      try {
        if (typeof this.engine === 'function') {
          this.engine(
            filePath,
            context,
            this.engineOptions,
            (err, html) => {
              if (err) return reject(err);
              resolve(html);
            }
          );
        } else {
          reject(new Error(`View engine doesn't support rendering`));
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = NovaxTemplating;
