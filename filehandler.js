const fs = require('fs');
const path = require('path');
const os = require('os');

class FileHandler {
  constructor(maxFileSize, uploadDir = null) {
    this.maxFileSize = maxFileSize;
    this.uploadDir = uploadDir || path.join(os.tmpdir(), 'uploads');
    this.allowedTypes = []; // Array of allowed MIME types
    this.maxFiles = 5;      // Maximum number of files allowed in a single upload
    this.keepOriginalName = false; // Whether to keep original filenames
    this.createUploadDir();
  }

  createUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  parseMultipartFormData(req) {
    return new Promise((resolve, reject) => {
      try {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.startsWith('multipart/form-data')) {
          return reject(new Error('Invalid content type: Expected multipart/form-data'));
        }

        const boundary = this.extractBoundary(contentType);
        if (!boundary) {
          return reject(new Error('No boundary found in content-type header'));
        }

        let body = Buffer.alloc(0);
        let totalSize = 0;

        req.on('data', (chunk) => {
          totalSize += chunk.length;
          if (totalSize > this.maxFileSize) {
            req.destroy();
            return reject(new Error(`Total request size exceeds limit of ${this.formatFileSize(this.maxFileSize)}`));
          }
          body = Buffer.concat([body, chunk]);
        });

        req.on('end', () => {
          try {
            const result = this.parseBody(body, boundary, { maxSize: this.maxFileSize });
            resolve(result);
          } catch (err) {
            reject(err);
          }
        });

        req.on('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  extractBoundary(contentType) {
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    return boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : null;
  }

  parseBody(body, boundary, options = {}) {
    const fields = {};
    const files = {};
    const errors = [];
    const parts = this.splitParts(body, boundary);

    // Track number of files uploaded
    let fileCount = 0;

    for (const part of parts) {
      const headers = this.parseHeaders(part.headers);
      const contentDisposition = headers['content-disposition'];
      if (!contentDisposition) continue;

      const nameMatch = contentDisposition.match(/name="([^"]+)"/);
      if (!nameMatch) continue;

      const name = nameMatch[1];
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);

      if (filenameMatch) {
        // It's a file
        fileCount++;
        if (fileCount > this.maxFiles) {
          errors.push({ name, error: `Maximum number of files (${this.maxFiles}) exceeded` });
          continue;
        }

        const filename = filenameMatch[1];
        const contentType = headers['content-type'] || 'application/octet-stream';
        const fileExt = path.extname(filename);
        
        // Generate filename based on configuration
        const savedFilename = this.keepOriginalName 
          ? filename 
          : `${path.basename(filename, fileExt)}-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
        
        const filePath = path.join(this.uploadDir, savedFilename);

        const fileInfo = {
          name: filename,
          newname: savedFilename,
          type: contentType,
          size: part.data.length,
          data: part.data,
          path: filePath,
          ext: fileExt,
          mimetype: contentType,
          mv: (destPath) => {
            return new Promise((resolve, reject) => {
              fs.rename(filePath, destPath, (err) => {
                if (err) return reject(err);
                resolve();
              });
            });
          },
          remove: () => this.removeFile(filePath)
        };

        // Validate file against configuration
        const validation = this.validateFile(fileInfo, options);
        if (!validation.valid) {
          errors.push({ name, error: validation.error });
          continue;
        }

        try {
          fs.writeFileSync(filePath, part.data);

          // Handle multiple files with same name
          if (files[name]) {
            if (Array.isArray(files[name])) {
              files[name].push(fileInfo);
            } else {
              files[name] = [files[name], fileInfo];
            }
          } else {
            files[name] = fileInfo;
          }
        } catch (err) {
          errors.push({ name, error: `Failed to save file: ${err.message}` });
        }
      } else {
        // It's a regular field
        fields[name] = part.data.toString('utf8').trim();
      }
    }

    return { fields, files, errors };
  }

  splitParts(body, boundary) {
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const endBoundaryBuffer = Buffer.from(`--${boundary}--`);
    const parts = [];
    let currentPosition = 0;

    while (currentPosition < body.length) {
      const boundaryPosition = body.indexOf(boundaryBuffer, currentPosition);
      if (boundaryPosition === -1) break;

      const nextBoundaryPosition = body.indexOf(boundaryBuffer, boundaryPosition + boundaryBuffer.length);
      const endBoundaryPosition = body.indexOf(endBoundaryBuffer, boundaryPosition + boundaryBuffer.length);

      const isLastPart = endBoundaryPosition !== -1 && (nextBoundaryPosition === -1 || endBoundaryPosition < nextBoundaryPosition);

      const partEnd = isLastPart ? endBoundaryPosition : nextBoundaryPosition;
      if (partEnd === -1) break;

      const part = body.slice(boundaryPosition + boundaryBuffer.length, partEnd);
      parts.push(this.parsePart(part));
      currentPosition = partEnd;

      if (isLastPart) break;
    }

    return parts;
  }

  parsePart(part) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      throw new Error('Invalid part format: no header end');
    }

    const headers = part.slice(0, headerEnd).toString('utf8');
    const data = part.slice(headerEnd + 4); // Skip \r\n\r\n

    return {
      headers: headers.split('\r\n').filter(line => line.trim()),
      data
    };
  }

  parseHeaders(headerLines) {
    const headers = {};
    for (const line of headerLines) {
      if (!line) continue;
      const separator = line.indexOf(':');
      if (separator === -1) continue;
      
      const key = line.slice(0, separator).trim().toLowerCase();
      const value = line.slice(separator + 1).trim();
      headers[key] = value;
    }
    return headers;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  clearUploads() {
    try {
      if (!fs.existsSync(this.uploadDir)) return true;
      
      const files = fs.readdirSync(this.uploadDir);
      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          this.clearDirectory(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
      return true;
    } catch (err) {
      console.error('Error clearing uploads:', err);
      return false;
    }
  }

  clearDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        this.clearDirectory(filePath);
        fs.rmdirSync(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    }
    fs.rmdirSync(directory);
  }

  getFileStream(filePath) {
    try {
      return fs.createReadStream(filePath);
    } catch (err) {
      throw new Error(`Failed to create read stream: ${err.message}`);
    }
  }

  /**
   * Set file upload configuration
   * @param {Object} config - Configuration object
   * @param {number} [config.maxSize] - Max file size in bytes
   * @param {string[]} [config.allowedTypes] - Allowed MIME types
   * @param {number} [config.maxFiles] - Maximum number of files
   * @param {boolean} [config.keepOriginalName] - Keep original filenames
   */
  setConfig(config) {
    if (config.maxSize !== undefined) {
      this.maxFileSize = config.maxSize;
    }
    if (config.allowedTypes !== undefined) {
      this.allowedTypes = config.allowedTypes;
    }
    if (config.maxFiles !== undefined) {
      this.maxFiles = config.maxFiles;
    }
    if (config.keepOriginalName !== undefined) {
      this.keepOriginalName = config.keepOriginalName;
    }
  }

  /**
   * Validate file against current configuration
   * @param {Object} file - File object
   * @param {Object} [options] - Additional options
   * @returns {Object} Validation result
   */
  validateFile(file, options = {}) {
    const { allowedTypes = this.allowedTypes, maxSize = this.maxFileSize } = options;
    
    if (file.size > maxSize) {
      return { valid: false, error: `File size exceeds limit of ${this.formatFileSize(maxSize)}` };
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return { valid: false, error: `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}` };
    }

    return { valid: true };
  }

  removeFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error removing file:', err);
      return false;
    }
  }
}

module.exports = FileHandler;