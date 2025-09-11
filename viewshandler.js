const fs = require("fs");
const path = require("path");

class NovaxTemplating {
  constructor(app) {
    this.app = app;
    this.viewEngine = null;
    this.engine = null;
    this.viewsPath = path.join(process.cwd(), 'views');
    this.viewHelpers = {};
    this.engineOptions = {};
    this.viewsType = 'html';
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
      } else {
        console.log(engine);
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
    fs.mkdirSync(this.viewsPath, { recursive: true });
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

  render(file, data = {}) {
    return new Promise((resolve, reject) => {
      if (!this.viewEngine) {
        return reject(new Error('No view engine configured'));
      }

      if (this.viewEngine === 'novax') {
        this._renderNovax(file, data, resolve, reject);
      } else {
        this._renderThirdParty(file, data, resolve, reject);
      }
    });
  }

  _renderNovax(file, data, resolve, reject) {
    let filePath = null;
    let isJsTemplate = this.viewsType === 'js';

    if (isJsTemplate) {
      filePath = path.join(this.viewsPath, `${file}.js`);
    } else if (this.viewsType === 'html') {
      filePath = path.join(this.viewsPath, `${file}.html`);
    } else {
      return reject(new Error('Novax views engine only supports js or html'));
    }

    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) return reject(err);

      if (isJsTemplate) {
        this._renderJsTemplate(content, data, resolve, reject);
      } else {
        this._renderHtmlTemplate(content, data, resolve, reject);
      }
    });
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

  _renderHtmlTemplate(content, data, resolve, reject) {
    const evaluate = (expr, context) => {
      try {
        if (expr.trim() === 'this') return context;

        const evalContext = {
          ...context,
          ...this.viewHelpers,
          this: context,
          JSON: JSON
        };

        // Check if this is a helper function call
        if (/^[a-zA-Z_$][0-9a-zA-Z_$]*\(.*\)$/.test(expr)) {
          const fnName = expr.split('(')[0];
          if (this.viewHelpers[fnName]) {
            const argsStr = expr.substring(fnName.length + 1, expr.length - 1);
            const args = argsStr.split(',').map(arg => {
              const trimmed = arg.trim();
              return evaluate(trimmed, context);
            });
            return this.viewHelpers[fnName].apply(context, args);
          }
        }

        if (expr.startsWith('this.')) {
          const prop = expr.substring(5);
          return evalContext[prop];
        }

        if (expr in evalContext) {
          return evalContext[expr];
        }

        try {
          return new Function('data', `with(data) { return ${expr} }`)(evalContext);
        } catch {
          return undefined;
        }
      } catch {
        return undefined;
      }
    };

    // Process @include directives first
    const processIncludes = async (template, context) => {
      const includeRegex = /@include\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*({[^}]*}))?\s*\)/g;
      let result = template;
      let match;

      while ((match = includeRegex.exec(template)) !== null) {
        const includeFile = match[1];
        const includeDataStr = match[2] || '{}';
        const includePath = path.join(this.viewsPath, includeFile);

        try {
          // Parse the include data object - handle both single and double quotes
          let includeData = {};
          if (includeDataStr !== '{}') {
            try {
              // Use a safer approach to evaluate the data object
              const dataExpr = includeDataStr.trim();
              if (dataExpr.startsWith('{') && dataExpr.endsWith('}')) {
                // Create a function that returns the object with the current context
                const dataFn = new Function('data', `with(data) { return ${dataExpr} }`);
                includeData = dataFn({ ...context, ...this.viewHelpers });
              } else {
                // Try to evaluate as a variable name
                includeData = evaluate(dataExpr, context);
                if (typeof includeData !== 'object') {
                  includeData = {};
                }
              }
            } catch (e) {
              console.warn(`Warning: Could not parse include data for ${includeFile}:`, includeDataStr);
              includeData = {};
            }
          }

          // Merge parent context with include-specific data
          const mergedData = { ...context, ...includeData };

          const includedContent = await fs.promises.readFile(includePath, 'utf8');

          // Recursively process the included content with the merged data
          const processedInclude = await this._processTemplateContent(includedContent, mergedData);
          result = result.replace(match[0], processedInclude);
        } catch (err) {
          console.warn(`Warning: Could not include file ${includeFile}: ${err.message}`);
          result = result.replace(match[0], '');
        }
      }

      return result;
    };

    // Helper method to process template content recursively
    this._processTemplateContent = async (templateContent, contextData) => {
      // Process @var declarations with destructuring support
      const processVarDeclarations = (content, context) => {
        return content.replace(/@var\s+({[^}]+}|\[[^\]]+\]|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([\s\S]*?);(?=\s*@|\s*$|\s*<)/g, (_, pattern, valueExpr) => {
          const value = evaluate(valueExpr.trim(), context);

          if (pattern.startsWith('{') && pattern.endsWith('}')) {
            // Object destructuring: @var {prop1, prop2} = obj
            const props = pattern.slice(1, -1).split(',').map(p => p.trim());
            props.forEach(prop => {
              if (prop.includes(':')) {
                // Aliasing: @var {original: alias} = obj
                const [original, alias] = prop.split(':').map(p => p.trim());
                context[alias] = value[original];
              } else {
                context[prop] = value[prop];
              }
            });
          } else if (pattern.startsWith('[') && pattern.endsWith(']')) {
            // Array destructuring: @var [first, second] = arr
            const vars = pattern.slice(1, -1).split(',').map(v => v.trim());
            vars.forEach((varName, index) => {
              if (varName) {
                context[varName] = value[index];
              }
            });
          } else {
            // Simple variable assignment: @var name = value
            context[pattern] = value;
          }

          return '';
        });
      };

      let processedContent = processVarDeclarations(templateContent, contextData);

      // Process function calls - check both helpers and variables that are functions
      const processFunctionCalls = (content, context) => {
        return content.replace(/@([a-zA-Z_$][a-zA-Z0-9_$]*)\(([^)]*)\)/g, (_, funcName, argsStr) => {
          // Check if it's a helper function
          if (this.viewHelpers[funcName]) {
            const args = argsStr.split(',').map(arg => {
              const trimmed = arg.trim();
              // Remove quotes if it's a string literal
              if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
                  (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                return trimmed.slice(1, -1);
              }
              // Evaluate expression if it's a variable
              const evaluated = evaluate(trimmed, context);
              return evaluated !== undefined ? evaluated : trimmed;
            });

            try {
              const result = this.viewHelpers[funcName].apply(context, args);
              if (typeof result === 'object') return JSON.stringify(result);
              return result;
            } catch (e) {
              console.warn(`Error executing helper ${funcName}:`, e);
              return '';
            }
          }

          // Check if it's a variable function defined with @var
          const func = context[funcName];
          if (typeof func === 'function') {
            const args = argsStr.split(',').map(arg => {
              const trimmed = arg.trim();
              // Remove quotes if it's a string literal
              if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
                  (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                return trimmed.slice(1, -1);
              }
              // Evaluate expression if it's a variable
              const evaluated = evaluate(trimmed, context);
              return evaluated !== undefined ? evaluated : trimmed;
            });

            try {
              const result = func.apply(context, args);
              if (typeof result === 'object') return JSON.stringify(result);
              return result;
            } catch (e) {
              console.warn(`Error executing variable function ${funcName}:`, e);
              return '';
            }
          }

          return `@${funcName}(${argsStr})`; // Return original if function not found
        });
      };

      // Process @variable syntax (shortcut for variables) - FIXED VERSION
      processedContent = processedContent.replace(/@([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)/g, (_, varPath) => {
        // Don't process if it's part of a helper function call
        if (processedContent.indexOf(`@${varPath}(`) > -1) {
          return `@${varPath}`;
        }

        // Handle dot notation for object properties
        const parts = varPath.split('.');
        let value = contextData;

        for (const part of parts) {
          if (value === null || value === undefined) break;
          value = value[part];
        }

        if (value === undefined) {
          // Check if it's a helper function without parentheses
          if (this.viewHelpers[varPath]) {
            return `@${varPath}`; // Return original for helper functions without ()
          }
          return `@${varPath}`; // Return original if not found
        }

        if (typeof value === 'object') return JSON.stringify(value);
        return value;
      });

      // Process function calls in the main content
      processedContent = processFunctionCalls(processedContent, contextData);

      const processConditionals = (template, context) => {
        return template
          .replace(
            /@if\s*\((.+?)\)\s*([\s\S]+?)((?:@elif\s*\(.+?\)\s*[\s\S]+?)*)@else\s*([\s\S]+?)@end/g,
            (match, ifCond, ifBlock, elifBlocks, elseBlock) => {
              if (evaluate(ifCond, context)) return processConditionals(ifBlock, context);

              const elifMatches = [
                ...elifBlocks.matchAll(
                  /@elif\s*\((.+?)\)\s*([\s\S]+?)(?=(@elif|@else|@end))/g
                )
              ];
              for (const [, cond, block] of elifMatches) {
                if (evaluate(cond, context)) return processConditionals(block, context);
              }

              return processConditionals(elseBlock, context);
            }
          )
          .replace(/@if\s*\((.+?)\)\s*([\s\S]+?)@end/g, (_, condition, block) => {
            return evaluate(condition, context) ? processConditionals(block, context) : '';
          });
      };

      // Process @each loops with multiple syntaxes
      processedContent = processedContent.replace(
        /@each\s*\(([^)]+)\)\s*([\s\S]+?)@end/g,
        (_, loopExpr, innerTemplate) => {
          let arrayExpr, itemVar, indexVar;

          // Parse different @each syntaxes
          if (loopExpr.includes(' in ')) {
            // Syntax: @each(item in items) or @each(item, index in items)
            const loopMatch = loopExpr.match(/^\s*([^,\s]+)(?:\s*,\s*([^,\s]+))?\s+in\s+(.+)\s*$/);
            if (!loopMatch) return '';

            itemVar = loopMatch[1];
            indexVar = loopMatch[2] || 'index';
            arrayExpr = loopMatch[3];
          } else {
            // Syntax: @each(items) - use default variable names
            arrayExpr = loopExpr.trim();
            itemVar = 'item';
            indexVar = 'index';
          }

          const array = evaluate(arrayExpr, contextData);
          if (!Array.isArray(array) && typeof array !== 'object') return '';

          if (typeof array === 'object' && !Array.isArray(array)) {
            return Object.entries(array)
              .map(([key, value], idx) => {
                const loopContext = {
                  ...contextData,
                  ...this.viewHelpers,
                  [itemVar]: value,
                  [indexVar]: idx,
                  key: key,
                  value: value,
                  this: value,
                  isFirst: idx === 0,
                  isLast: idx === Object.keys(array).length - 1
                };

                let processed = processConditionals(innerTemplate, loopContext);
                processed = processed.replace(/@\{([^}]+)\}/g, (_, expr) => {
                  const result = evaluate(expr, loopContext);
                  if (result === undefined) return '';
                  if (typeof result === 'object') return JSON.stringify(result);
                  return result;
                });
                // Process function calls inside loops
                processed = processFunctionCalls(processed, loopContext);
                // Also process @variable syntax inside loops
                processed = processed.replace(/@([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)/g, (_, varPath) => {
                  const parts = varPath.split('.');
                  let value = loopContext;

                  for (const part of parts) {
                    if (value === null || value === undefined) break;
                    value = value[part];
                  }

                  if (value === undefined) return `@${varPath}`;
                  if (typeof value === 'object') return JSON.stringify(value);
                  return value;
                });

                return processed;
              })
              .join('');
          }

          return array
            .map((item, idx) => {
              const loopContext = {
                ...contextData,
                ...this.viewHelpers,
                [itemVar]: item,
                [indexVar]: idx,
                this: item,
                isFirst: idx === 0,
                isLast: idx === array.length - 1
              };

              let processed = processConditionals(innerTemplate, loopContext);
              processed = processed.replace(/@\{([^}]+)\}/g, (_, expr) => {
                if (expr.startsWith('this[') && expr.endsWith(']')) {
                  const indexExpr = expr.substring(5, expr.length - 1);
                  const index = evaluate(indexExpr, loopContext);
                  if (typeof index === 'number' && array[index] !== undefined) {
                    return array[index];
                  }
                  return '';
                }

                const result = evaluate(expr, loopContext);
                if (result === undefined) return '';
                if (typeof result === 'object') return JSON.stringify(result);
                return result;
              });
              // Process function calls inside loops
              processed = processFunctionCalls(processed, loopContext);
              // Also process @variable syntax inside loops
              processed = processed.replace(/@([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)/g, (_, varPath) => {
                const parts = varPath.split('.');
                let value = loopContext;

                for (const part of parts) {
                  if (value === null || value === undefined) break;
                  value = value[part];
                }

                if (value === undefined) return `@${varPath}`;
                if (typeof value === 'object') return JSON.stringify(value);
                return value;
              });

              return processed;
            })
            .join('');
        }
      );

      processedContent = processConditionals(processedContent, {
        ...contextData,
        ...this.viewHelpers
      });

      // Process inline expressions @{...}
      processedContent = processedContent.replace(/@\{([^}]+)\}/g, (_, expr) => {
        if (expr.startsWith('this[') && expr.endsWith(']')) {
          const indexExpr = expr.substring(5, expr.length - 1);
          const idx = evaluate(indexExpr, contextData);
          if (Array.isArray(contextData) && typeof idx === 'number' && contextData[idx] !== undefined) {
            return contextData[idx];
          }
          return '';
        }

        const result = evaluate(expr, {
          ...contextData,
          ...this.viewHelpers
        });
        if (result === undefined) return '';
        if (typeof result === 'object') return JSON.stringify(result);
        return result;
      });

      // Process @variable syntax one more time for any remaining variables
      processedContent = processedContent.replace(/@([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)/g, (_, varPath) => {
        // Skip if this looks like it was part of a function call that was already processed
        if (processedContent.indexOf(`@${varPath}(`) > -1) {
          return `@${varPath}`;
        }

        const parts = varPath.split('.');
        let value = contextData;

        for (const part of parts) {
          if (value === null || value === undefined) break;
          value = value[part];
        }

        if (value === undefined) {
          // Check if it's a helper function without parentheses
          if (this.viewHelpers[varPath]) {
            return `@${varPath}`; // Return original for helper functions without ()
          }
          return `@${varPath}`; // Return original if not found
        }

        if (typeof value === 'object') return JSON.stringify(value);
        return value;
      });

      return processedContent;
    };

    const renderWithIncludes = async () => {
      try {
        // Process includes first
        content = await processIncludes(content, data);

        // Process the rest of the template
        const finalContent = await this._processTemplateContent(content, data);
        resolve(finalContent);
      } catch (error) {
        reject(error);
      }
    };

    renderWithIncludes();
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