const fs = require("fs");
const path = require("path");

const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;

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
  }

  setViewEngine(engine, options = {}) {
    if (typeof engine !== 'string' && typeof engine !== 'object' && typeof engine !== 'function') {
      throw new Error('View engine must be a string (for built-in) or module object (for third-party)');
    }

    if (typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('Options must be an object');
    }

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
  }

  addHelpers(helpers) {
    if (typeof helpers !== 'object' || Array.isArray(helpers)) {
      throw new Error('Helpers must be an object with function values');
    }
    for (const [name, fn] of Object.entries(helpers)) {
      this.addHelper(name, fn);
    }
  }

  async render(file, data = {}, sections = {}) {
    if (!this.viewEngine) {
      throw new Error('No view engine configured');
    }

    if (this.viewEngine === 'novax') {
      return this._renderNovax(file, data, sections);
    } else {
      return new Promise((resolve, reject) => {
        this._renderThirdParty(file, data, resolve, reject);
      });
    }
  }

  async _renderNovax(file, data, sections = {}) {
    let fileName = file;
    if (!fileName.endsWith(`.${this.viewsType}`)) {
      fileName += `.${this.viewsType}`;
    }
    let filePath = path.join(this.viewsPath, fileName);

    if (this.viewsType === 'js') {
      const content = await fs.promises.readFile(filePath, 'utf8');
      return new Promise((resolve, reject) => {
        this._renderJsTemplate(content, data, resolve, reject);
      });
    }

    const compiled = await this._getCompiled(file, filePath);
    const result = await compiled(data, this.viewHelpers, (f, d) => this.render(f, { ...data, ...d }, sections), sections);

    if (result.layout) {
      return this.render(result.layout, data, result.sections);
    }

    return result.html;
  }

  async _getCompiled(name, filePath) {
    if (this.cache.has(name)) return this.cache.get(name);

    const content = await fs.promises.readFile(filePath, 'utf8');
    const code = this._compile(content);
    try {
      const fn = new AsyncFunction('__data', '_helpers', '__render', '__sections', code);
      this.cache.set(name, fn);
      return fn;
    } catch (e) {
      console.error(`Template compilation error in ${name}:`, e);
      throw e;
    }
  }

  _compile(template) {
    let code = 'let __out = "";\n';
    code += 'let __outStack = [];\n';
    code += 'let __layout = null;\n';
    code += 'let __currentSection = null;\n';
    code += 'const _self = __data;\n';

    for (const helper in this.viewHelpers) {
      code += `const ${helper} = _helpers.${helper};\n`;
    }

    code += 'with(__data) {\n';

    let i = 0;
    const blockStack = [];

    while (i < template.length) {
      let atIdx = template.indexOf('@', i);
      if (atIdx === -1) {
        code += `__out += ${JSON.stringify(template.slice(i))};\n`;
        break;
      }

      code += `__out += ${JSON.stringify(template.slice(i, atIdx))};\n`;
      i = atIdx + 1;

      // Handle escaped @@
      if (template[i] === '@') {
        code += `__out += "@";\n`;
        i++;
        continue;
      }

      // Handle expressions @{...}
      if (template[i] === '{') {
        let endIdx = this._findClosing(template, i, '{', '}');
        let expr = template.slice(i + 1, endIdx);
        code += `try { let __res = (${expr}); __out += (__res !== undefined ? __res : ""); } catch(e) { __out += ""; }\n`;
        i = endIdx + 1;
        continue;
      }

      // Handle comments @# ... #@
      if (template[i] === '#') {
        let endIdx = template.indexOf('#@', i);
        if (endIdx === -1) i = template.length;
        else i = endIdx + 2;
        continue;
      }

      // Handle Keywords
      let match = template.slice(i).match(/^([a-z]+)/);
      if (match) {
        let keyword = match[1];
        let rest = template.slice(i + keyword.length);

        if (keyword === 'if') {
          let { content, endIdx } = this._parseParens(rest);
          code += `if (${content}) {\n`;
          blockStack.push('if');
          i += keyword.length + endIdx;
          continue;
        }
        if (keyword === 'elif') {
          let { content, endIdx } = this._parseParens(rest);
          code += `} else if (${content}) {\n`;
          i += keyword.length + endIdx;
          continue;
        }
        if (keyword === 'else') {
          code += `} else {\n`;
          i += keyword.length;
          continue;
        }
        if (keyword === 'each') {
          let { content, endIdx } = this._parseParens(rest);
          let { items, item, index } = this._parseLoop(content);
          code += `
            {
              let __items = ${items};
              if (__items) {
                let __isArr = Array.isArray(__items);
                let __iter = __isArr ? __items : Object.keys(__items);
                let __len = __iter.length;
                for (let __i = 0; __i < __len; __i++) {
                  let ${index} = __isArr ? __i : __iter[__i];
                  let ${item} = __isArr ? __items[__i] : __items[__iter[__i]];
                  let isFirst = __i === 0;
                  let isLast = __i === __len - 1;
          `;
          blockStack.push('each');
          i += keyword.length + endIdx;
          continue;
        }
        if (keyword === 'end') {
          let last = blockStack.pop();
          if (last === 'if') {
            code += `}\n`;
          } else if (last === 'each') {
            code += `}\n}\n}\n`;
          } else if (last === 'section') {
            code += `__sections[__currentSection] = __out; __out = __outStack.pop();\n`;
          }
          i += keyword.length;
          continue;
        }
        if (keyword === 'var') {
          let endIdx = rest.indexOf(';');
          if (endIdx === -1) endIdx = rest.length;
          let line = rest.slice(0, endIdx);
          code += `let ${line};\n`;
          i += keyword.length + endIdx + 1;
          continue;
        }
        if (keyword === 'include') {
          let { content, endIdx } = this._parseParens(rest);
          code += `__out += await __render(${content});\n`;
          i += keyword.length + endIdx;
          continue;
        }
        if (keyword === 'extends') {
          let { content, endIdx } = this._parseParens(rest);
          code += `__layout = ${content};\n`;
          i += keyword.length + endIdx;
          continue;
        }
        if (keyword === 'section') {
          let { content, endIdx } = this._parseParens(rest);
          code += `__currentSection = ${content}; __outStack.push(__out); __out = "";\n`;
          blockStack.push('section');
          i += keyword.length + endIdx;
          continue;
        }
        if (keyword === 'yield') {
          let { content, endIdx } = this._parseParens(rest);
          code += `__out += (__sections[${content}] || "");\n`;
          i += keyword.length + endIdx;
          continue;
        }
      }

      // Handle Variables or Function Calls
      let varMatch = template.slice(i).match(/^([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)/);
      if (varMatch) {
        let name = varMatch[1];
        let consumed = name.length;
        let isFunc = false;
        let params = '';

        if (template[i + consumed] === '(') {
          let endIdx = this._findClosing(template, i + consumed, '(', ')');
          let content = template.slice(i + consumed + 1, endIdx);
          // If it contains @, it's probably not a JS function call but text
          if (!content.includes('@')) {
            isFunc = true;
            params = content;
            consumed += (endIdx - (i + consumed)) + 1;
          }
        }

        let expression = isFunc ? `${name}(${params})` : name;

        // Check for filters
        if (template[i + consumed] === '|') {
          let filterMatch = template.slice(i + consumed + 1).match(/^([a-zA-Z0-9_$]+)/);
          if (filterMatch) {
            let filterName = filterMatch[1];
            // If filterName exists as a helper or is a common one
            if (this.viewHelpers[filterName] || ['toUpperCase', 'toLowerCase', 'trim', 'json'].includes(filterName)) {
              if (this.viewHelpers[filterName]) {
                expression = `${filterName}(${expression})`;
              } else if (filterName === 'json') {
                expression = `JSON.stringify(${expression})`;
              } else {
                expression = `(String(${expression}).${filterName}())`;
              }
              consumed += filterName.length + 1;
            }
          }
        }

        if (isFunc) {
          code += `try { let __res = ${expression}; __out += (__res !== undefined ? __res : ""); } catch(e) { __out += ""; }\n`;
        } else {
          code += `try { let __res = ${expression}; __out += (__res !== undefined ? __res : "@${name}"); } catch(e) { __out += "@${name}"; }\n`;
        }
        i += consumed;
        continue;
      }

      // Fallback for standalone @
      code += `__out += "@";\n`;
    }

    code += '}\n';
    code += 'return { html: __out, layout: __layout, sections: __sections };';
    return code;
  }

  _findClosing(text, startIdx, open, close) {
    let count = 0;
    let inString = false;
    let stringChar = '';
    for (let i = startIdx; i < text.length; i++) {
      let char = text[i];
      if (inString) {
        if (char === stringChar && text[i - 1] !== '\\') inString = false;
        continue;
      }
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
        continue;
      }
      if (char === open) count++;
      else if (char === close) {
        count--;
        if (count === 0) return i;
      }
    }
    return text.length;
  }

  _parseParens(text) {
    let trimmed = text.trim();
    let offset = text.indexOf('(');
    if (offset === -1) return { content: '', endIdx: 0 };

    let sub = text.slice(offset);
    let endIdx = this._findClosing(sub, 0, '(', ')');
    return { content: sub.slice(1, endIdx), endIdx: offset + endIdx + 1 };
  }

  _parseLoop(expr) {
    if (expr.includes(' in ')) {
      const parts = expr.split(' in ');
      const vars = parts[0].split(',').map(v => v.trim());
      const items = parts[1].trim();
      return { items, item: vars[0], index: vars[1] || 'index' };
    }
    return { items: expr.trim(), item: 'item', index: 'index' };
  }

  _renderJsTemplate(content, data, resolve, reject) {
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
        try {
          const rendered = result.call(context, data);
          if (rendered instanceof Promise) {
            rendered.then(resolve).catch(reject);
          } else {
            resolve(rendered);
          }
        } catch (e) {
          reject(e);
        }
      } else if (typeof result === 'string') {
        resolve(result);
      } else if (result && typeof result.then === 'function') {
        result.then(resolve).catch(reject);
      } else {
        resolve(JSON.stringify(result));
      }
    } catch (e) {
      reject(e);
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
