import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createInternship,
  deleteInternship,
  getInternship,
  listInternships,
  replaceInternship,
  updateInternship,
} from './db.js';
import { parsePagination, validateInternship } from './validation.js';

function errorBody(code, message, details) {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

function allowedOrigins() {
  return new Set((process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',').map((value) => value.trim()).filter(Boolean));
}

const defaultStaticRoot = fileURLToPath(new URL('../', import.meta.url));

export function createApp({ db, staticRoot = defaultStaticRoot, liveInternships } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use((request, response, next) => {
    const origin = request.headers.origin;
    if (!origin) return next();
    if (!allowedOrigins().has(origin)) return response.status(403).json(errorBody('ORIGIN_NOT_ALLOWED', 'Origin not allowed'));
    response.set('access-control-allow-origin', origin);
    response.set('vary', 'Origin');
    if (request.method === 'OPTIONS') {
      response.set('access-control-allow-methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      response.set('access-control-allow-headers', 'Content-Type');
      return response.sendStatus(204);
    }
    return next();
  });
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_request, response) => response.json({ status: 'ok', service: 'internship-board-api' }));

  app.get('/api/live-internships', async (_request, response) => {
    if (typeof liveInternships !== 'function') {
      return response.status(503).json(errorBody('LIVE_DATA_UNAVAILABLE', 'Live internship data is temporarily unavailable'));
    }
    try {
      const result = await liveInternships();
      return response.json({ data: result.internships, meta: result.meta });
    } catch {
      return response.status(503).json(errorBody('LIVE_DATA_UNAVAILABLE', 'Live internship data is temporarily unavailable'));
    }
  });

  app.get('/api/internships', (request, response) => {
    const pagination = parsePagination(request.query);
    if (pagination.error) return response.status(400).json(errorBody('INVALID_PAGINATION', pagination.error));
    const { page, limit } = pagination.value;
    const result = listInternships(db, { page, limit });
    const totalPages = Math.ceil(result.total / limit);
    return response.json({
      data: result.items,
      pagination: {
        page, limit, total: result.total, totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  });

  app.get('/api/internships/:id', (request, response) => {
    const internship = getInternship(db, request.params.id);
    if (!internship) return response.status(404).json(errorBody('NOT_FOUND', `Internship ${request.params.id} was not found`));
    return response.json({ data: internship });
  });

  app.post('/api/internships', (request, response) => {
    const validation = validateInternship(request.body, { requireId: true });
    if (validation.errors) return response.status(422).json(errorBody('VALIDATION_ERROR', 'Internship data is invalid', validation.errors));
    try {
      const internship = createInternship(db, validation.value);
      return response.status(201).location(`/api/internships/${encodeURIComponent(internship.id)}`).json({ data: internship });
    } catch (error) {
      if (error.code === 'DUPLICATE_ID') return response.status(409).json(errorBody('DUPLICATE_ID', error.message));
      throw error;
    }
  });

  app.put('/api/internships/:id', (request, response) => {
    const validation = validateInternship(request.body);
    if (validation.errors) return response.status(422).json(errorBody('VALIDATION_ERROR', 'Internship data is invalid', validation.errors));
    const internship = replaceInternship(db, request.params.id, validation.value);
    if (!internship) return response.status(404).json(errorBody('NOT_FOUND', `Internship ${request.params.id} was not found`));
    return response.json({ data: internship });
  });

  app.patch('/api/internships/:id', (request, response) => {
    const validation = validateInternship(request.body, { partial: true });
    if (validation.errors) return response.status(422).json(errorBody('VALIDATION_ERROR', 'Internship data is invalid', validation.errors));
    const internship = updateInternship(db, request.params.id, validation.value);
    if (!internship) return response.status(404).json(errorBody('NOT_FOUND', `Internship ${request.params.id} was not found`));
    return response.json({ data: internship });
  });

  app.delete('/api/internships/:id', (request, response) => {
    if (!deleteInternship(db, request.params.id)) return response.status(404).json(errorBody('NOT_FOUND', `Internship ${request.params.id} was not found`));
    return response.status(204).end();
  });

  app.use('/css', express.static(path.join(staticRoot, 'css')));
  app.use('/js', express.static(path.join(staticRoot, 'js')));
  app.use('/assets', express.static(path.join(staticRoot, 'assets')));
  app.get('/', express.static(staticRoot, { index: 'index.html' }));
  app.get(['/index.html', '/internship.html'], express.static(staticRoot));
  app.use((request, response) => response.status(404).json(errorBody('NOT_FOUND', 'Route not found')));
  app.use((error, _request, response, _next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return response.status(400).json(errorBody('INVALID_JSON', 'Request body contains malformed JSON'));
    }
    if (error.status === 413) return response.status(413).json(errorBody('PAYLOAD_TOO_LARGE', 'Request body exceeds the 100 KB limit'));
    if (error.status === 415) return response.status(415).json(errorBody('UNSUPPORTED_MEDIA_TYPE', 'Request body encoding is not supported'));
    if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
      return response.status(error.status).json(errorBody('BAD_REQUEST', error.message || 'The request could not be processed'));
    }
    console.error(error);
    return response.status(500).json(errorBody('INTERNAL_ERROR', 'An unexpected error occurred'));
  });

  return app;
}
