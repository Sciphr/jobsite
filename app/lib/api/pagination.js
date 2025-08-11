/**
 * API Pagination and Filtering Utilities
 */

export function parsePaginationParams(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

export function parseSortParams(searchParams, allowedFields = []) {
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder')?.toLowerCase() === 'desc' ? 'desc' : 'asc';
  
  if (!sortBy || !allowedFields.includes(sortBy)) {
    return { orderBy: { createdAt: 'desc' } }; // Default sort
  }
  
  return { orderBy: { [sortBy]: sortOrder } };
}

export function parseFilterParams(searchParams, filterMap = {}) {
  const filters = {};
  
  for (const [param, prismaField] of Object.entries(filterMap)) {
    const value = searchParams.get(param);
    if (value) {
      // Handle different filter types
      if (param.endsWith('_from') || param.endsWith('_after')) {
        filters[prismaField] = { ...filters[prismaField], gte: new Date(value) };
      } else if (param.endsWith('_to') || param.endsWith('_before')) {
        filters[prismaField] = { ...filters[prismaField], lte: new Date(value) };
      } else if (param.endsWith('_contains')) {
        filters[prismaField] = { contains: value, mode: 'insensitive' };
      } else if (param.endsWith('_in')) {
        filters[prismaField] = { in: value.split(',') };
      } else {
        filters[prismaField] = value;
      }
    }
  }
  
  return filters;
}

export function createPaginatedResponse(data, page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  };
}

export function validateRequiredFields(body, requiredFields) {
  const missing = requiredFields.filter(field => 
    body[field] === undefined || body[field] === null || body[field] === ''
  );
  
  if (missing.length > 0) {
    return { error: `Missing required fields: ${missing.join(', ')}` };
  }
  
  return { valid: true };
}

export function sanitizeUpdateData(body, allowedFields) {
  const sanitized = {};
  
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      sanitized[field] = body[field];
    }
  }
  
  return sanitized;
}