import { Hono } from 'hono'
import * as v from 'valibot'
import { describeRoute, openAPIRouteHandler, resolver } from 'hono-openapi'
import { vValidator } from '@hono/valibot-validator'
import { apiReference, Scalar } from '@scalar/hono-api-reference'

// Valibot Schemas
const keyParamSchema = v.object({
	key: v.pipe(v.string(), v.minLength(1), v.maxLength(512))
})

const kvQuerySchema = v.object({
	type: v.optional(v.picklist(['text', 'json'])),
	cacheTtl: v.optional(v.pipe(v.string(), v.transform(Number)))
})

const batchRequestSchema = v.object({
	keys: v.pipe(v.array(v.string()), v.minLength(1), v.maxLength(100)),
	type: v.optional(v.picklist(['text', 'json'])),
	cacheTtl: v.optional(v.number())
})

const listQuerySchema = v.object({
	prefix: v.optional(v.string()),
	limit: v.optional(v.pipe(v.string(), v.transform(Number))),
	cursor: v.optional(v.string())
})

const putRequestSchema = v.object({
	value: v.any(),
	expiration: v.optional(v.number()),
	expirationTtl: v.optional(v.pipe(v.number(), v.minValue(60))),
	metadata: v.optional(v.record(v.string(), v.any()))
})

const postRequestSchema = v.object({
	key: v.pipe(v.string(), v.minLength(1), v.maxLength(512)),
	value: v.any(),
	expiration: v.optional(v.number()),
	expirationTtl: v.optional(v.pipe(v.number(), v.minValue(60))),
	metadata: v.optional(v.record(v.string(), v.any()))
})

const bulkWritePairSchema = v.object({
	key: v.pipe(v.string(), v.minLength(1), v.maxLength(512)),
	value: v.any(),
	expiration: v.optional(v.number()),
	expirationTtl: v.optional(v.number()),
	metadata: v.optional(v.record(v.string(), v.any()))
})

const bulkWriteRequestSchema = v.object({
	pairs: v.pipe(v.array(bulkWritePairSchema), v.minLength(1), v.maxLength(10000))
})

const bulkDeleteRequestSchema = v.object({
	keys: v.pipe(v.array(v.string()), v.minLength(1))
})

// Response schemas
const errorResponseSchema = v.object({
	error: v.string()
})

const kvValueResponseSchema = v.object({
	key: v.string(),
	value: v.any()
})

const kvMetadataResponseSchema = v.object({
	key: v.string(),
	value: v.any(),
	metadata: v.any()
})

const listResponseSchema = v.object({
	keys: v.array(v.object({
		name: v.string(),
		expiration: v.optional(v.number()),
		metadata: v.optional(v.any())
	})),
	list_complete: v.boolean(),
	cursor: v.optional(v.string())
})

const successResponseSchema = v.object({
	success: v.boolean(),
	key: v.string(),
	message: v.string()
})

const bulkResponseSchema = v.object({
	success: v.boolean(),
	total: v.number(),
	successful: v.number(),
	failed: v.number(),
	results: v.array(v.object({
		key: v.string(),
		success: v.boolean(),
		error: v.optional(v.string())
	}))
})

const app = new Hono<{ Bindings: CloudflareBindings }>().basePath('/api/v1');

app.get('/', (c) => {
  return c.json({ message: 'Cloudflare KV Worker API', version: '1.0.0' })
})

// Get a single KV value
app.get('/kv/:key',
  describeRoute({
    description: 'Get a single KV value by key',
    parameters: [
      {
        name: 'key',
        in: 'path',
        required: true,
        description: 'The key to retrieve (1-512 characters)',
        schema: { type: 'string' },
        example: 'user:123'
      },
      {
        name: 'type',
        in: 'query',
        required: false,
        description: 'Response format: "text" or "json"',
        schema: { type: 'string', enum: ['text', 'json'] },
        example: 'json'
      },
      {
        name: 'cacheTtl',
        in: 'query',
        required: false,
        description: 'Cache TTL in seconds',
        schema: { type: 'number' },
        example: 3600
      }
    ],
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(kvValueResponseSchema),
            examples: {
              textValue: {
                summary: 'Text value',
                value: { key: 'user:123', value: 'John Doe' }
              },
              jsonValue: {
                summary: 'JSON value',
                value: { key: 'user:123', value: { name: 'John Doe', email: 'john@example.com' } }
              }
            }
          }
        }
      },
      404: {
        description: 'Key not found',
        content: {
          'application/json': {
            schema: resolver(errorResponseSchema),
            examples: {
              notFound: {
                summary: 'Key does not exist',
                value: { error: 'Key not found' }
              }
            }
          }
        }
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': { schema: resolver(errorResponseSchema) }
        }
      }
    }
  }),
  vValidator('param', keyParamSchema),
  vValidator('query', kvQuerySchema),
  async (c) => {
    try {
      const { key } = c.req.valid('param')
      const { type = 'text', cacheTtl } = c.req.valid('query')

      const options = cacheTtl ? { cacheTtl } : undefined

      const value = await c.env.CF_WORKER_API_KV.get(key, options)

      if (value === null) {
        return c.json({ error: 'Key not found' }, 404)
      }

      if (type === 'json') {
        return c.json({ key, value: JSON.parse(value) })
      }

      return c.json({ key, value })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return c.json({ error: errorMessage }, 500)
    }
  }
)

// Get multiple KV values
app.post('/kv/batch',
  describeRoute({
    description: 'Get multiple KV values by keys (max 100 keys)',
    requestBody: {
      description: 'Batch request body',
      required: true,
      content: {
        'application/json': {
          examples: {
            textBatch: {
              summary: 'Get text values',
              value: {
                keys: ['user:123', 'user:456', 'user:789'],
                type: 'text'
              }
            },
            jsonBatch: {
              summary: 'Get JSON values with cache',
              value: {
                keys: ['config:app', 'config:db'],
                type: 'json',
                cacheTtl: 3600
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(v.object({
              values: v.record(v.string(), v.any())
            })),
            examples: {
              batchResult: {
                summary: 'Batch get result',
                value: {
                  values: {
                    'user:123': { name: 'John Doe', email: 'john@example.com' },
                    'user:456': { name: 'Jane Smith', email: 'jane@example.com' },
                    'user:789': null
                  }
                }
              }
            }
          }
        }
      },
      400: {
        description: 'Bad request',
        content: {
          'application/json': { schema: resolver(errorResponseSchema) }
        }
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': { schema: resolver(errorResponseSchema) }
        }
      }
    }
  }),
  vValidator('json', batchRequestSchema),
  async (c) => {
    try {
      const { keys, type = 'text', cacheTtl } = c.req.valid('json')

      const options = cacheTtl ? { cacheTtl } : undefined
      const values = await c.env.CF_WORKER_API_KV.get(keys, options)

      const result: Record<string, string | object | null> = {}
      for (const [key, value] of values.entries()) {
        if (type === 'json' && value !== null) {
          result[key] = JSON.parse(value)
        } else {
          result[key] = value
        }
      }

      return c.json({ values: result })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return c.json({ error: errorMessage }, 500)
    }
  }
)

// Get a single KV value with metadata
app.get('/kv/:key/metadata',
  describeRoute({
    description: 'Get a single KV value with its metadata by key',
    parameters: [
      {
        name: 'key',
        in: 'path',
        required: true,
        description: 'The key to retrieve (1-512 characters)',
        schema: { type: 'string' },
        example: 'user:123'
      },
      {
        name: 'type',
        in: 'query',
        required: false,
        description: 'Response format: "text" or "json"',
        schema: { type: 'string', enum: ['text', 'json'] },
        example: 'json'
      },
      {
        name: 'cacheTtl',
        in: 'query',
        required: false,
        description: 'Cache TTL in seconds',
        schema: { type: 'number' },
        example: 3600
      }
    ],
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(kvMetadataResponseSchema),
            examples: {
              withMetadata: {
                summary: 'Value with metadata',
                value: {
                  key: 'user:123',
                  value: { name: 'John Doe', email: 'john@example.com' },
                  metadata: { version: 2, createdBy: 'admin', lastModified: '2025-01-15' }
                }
              },
              withoutMetadata: {
                summary: 'Value without metadata',
                value: {
                  key: 'simple:key',
                  value: 'Simple text value',
                  metadata: null
                }
              }
            }
          }
        }
      },
      404: {
        description: 'Key not found',
        content: {
          'application/json': {
            schema: resolver(errorResponseSchema),
            examples: {
              notFound: {
                summary: 'Key does not exist',
                value: { error: 'Key not found' }
              }
            }
          }
        }
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': { schema: resolver(errorResponseSchema) }
        }
      }
    }
  }),
  vValidator('param', keyParamSchema),
  vValidator('query', kvQuerySchema),
  async (c) => {
    try {
      const { key } = c.req.valid('param')
      const { type = 'text', cacheTtl } = c.req.valid('query')

      const options = cacheTtl ? { cacheTtl } : undefined

      const result = await c.env.CF_WORKER_API_KV.getWithMetadata(key, options)

      if (result.value === null) {
        return c.json({ error: 'Key not found' }, 404)
      }

      const response = {
        key,
        value: type === 'json' && result.value !== null ? JSON.parse(result.value) : result.value,
        metadata: result.metadata
      }

      return c.json(response)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return c.json({ error: errorMessage }, 500)
    }
  }
)

// Get multiple KV values with metadata
app.post('/kv/batch/metadata',
  describeRoute({
    description: 'Get multiple KV values with metadata by keys (max 100 keys)',
    requestBody: {
      description: 'Batch request with metadata',
      required: true,
      content: {
        'application/json': {
          examples: {
            batchMetadata: {
              summary: 'Get multiple values with metadata',
              value: {
                keys: ['user:123', 'user:456', 'config:app'],
                type: 'json'
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(v.object({
              values: v.record(v.string(), v.object({
                value: v.any(),
                metadata: v.any()
              }))
            })),
            examples: {
              metadataResult: {
                summary: 'Batch with metadata result',
                value: {
                  values: {
                    'user:123': {
                      value: { name: 'John Doe', email: 'john@example.com' },
                      metadata: { version: 1, createdBy: 'system' }
                    },
                    'user:456': {
                      value: { name: 'Jane Smith', email: 'jane@example.com' },
                      metadata: { version: 2, createdBy: 'admin' }
                    },
                    'config:app': {
                      value: { theme: 'dark' },
                      metadata: null
                    }
                  }
                }
              }
            }
          }
        }
      },
      400: {
        description: 'Bad request',
        content: {
          'application/json': { schema: resolver(errorResponseSchema) }
        }
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': { schema: resolver(errorResponseSchema) }
        }
      }
    }
  }),
  vValidator('json', batchRequestSchema),
  async (c) => {
    try {
      const { keys, type = 'text', cacheTtl } = c.req.valid('json')

      const options = cacheTtl ? { cacheTtl } : undefined
      const results = await c.env.CF_WORKER_API_KV.getWithMetadata(keys, options)

      const valuesWithMetadata: Record<string, { value: string | object | null, metadata: unknown }> = {}
      for (const [key, result] of results.entries()) {
        valuesWithMetadata[key] = {
          value: type === 'json' && result.value !== null ? JSON.parse(result.value) : result.value,
          metadata: result.metadata
        }
      }

      return c.json({ values: valuesWithMetadata })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return c.json({ error: errorMessage }, 500)
    }
  }
)

// List KV keys with pagination
app.get('/kv',
  describeRoute({
    description: 'List KV keys with optional prefix filtering and pagination support',
    parameters: [
      {
        name: 'prefix',
        in: 'query',
        required: false,
        description: 'Filter keys by prefix (e.g., "user:" to list all user keys)',
        schema: { type: 'string' },
        example: 'user:'
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        description: 'Maximum number of keys to return (default: 1000)',
        schema: { type: 'number' },
        example: 100
      },
      {
        name: 'cursor',
        in: 'query',
        required: false,
        description: 'Pagination cursor from previous response',
        schema: { type: 'string' },
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      }
    ],
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(listResponseSchema),
            examples: {
              listComplete: {
                summary: 'List complete (no more pages)',
                value: {
                  keys: [
                    { name: 'user:123', expiration: 1735689600, metadata: { version: 1 } },
                    { name: 'user:456', metadata: { version: 2 } },
                    { name: 'user:789' }
                  ],
                  list_complete: true
                }
              },
              listWithCursor: {
                summary: 'List incomplete (more pages available)',
                value: {
                  keys: [
                    { name: 'session:abc' },
                    { name: 'session:def' },
                    { name: 'session:ghi' }
                  ],
                  list_complete: false,
                  cursor: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
                }
              }
            }
          }
        }
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': { schema: resolver(errorResponseSchema) }
        }
      }
    }
  }),
  vValidator('query', listQuerySchema),
  async (c) => {
    try {
      const { prefix, limit, cursor } = c.req.valid('query')

      const options: KVNamespaceListOptions = {}
      if (prefix) options.prefix = prefix
      if (limit) options.limit = limit
      if (cursor) options.cursor = cursor

      const list = await c.env.CF_WORKER_API_KV.list(options)

      return c.json({
        keys: list.keys,
        list_complete: list.list_complete,
        ...(list.list_complete ? {} : { cursor: list.cursor })
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return c.json({ error: errorMessage }, 500)
    }
  }
)

// Write a single KV pair (POST)
app.post('/kv',
  describeRoute({
    description: 'Write a single KV pair using POST with key in request body',
    requestBody: {
      description: 'Key-value pair data',
      required: true,
      content: {
        'application/json': {
          examples: {
            simpleText: {
              summary: 'Store text value',
              value: {
                key: 'user:123',
                value: 'John Doe'
              }
            },
            jsonWithMetadata: {
              summary: 'Store JSON with metadata and TTL',
              value: {
                key: 'config:app',
                value: { theme: 'dark', language: 'en' },
                expirationTtl: 86400,
                metadata: { version: '1.0', author: 'admin' }
              }
            },
            withExpiration: {
              summary: 'Store with Unix timestamp expiration',
              value: {
                key: 'session:abc123',
                value: 'session-data-here',
                expiration: 1735689600
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Successfully created',
        content: {
          'application/json': {
            schema: resolver(successResponseSchema),
            examples: {
              success: {
                summary: 'Successful write',
                value: {
                  success: true,
                  key: 'user:123',
                  message: 'Key-value pair written successfully'
                }
              }
            }
          }
        }
      },
      400: {
        description: 'Bad request (invalid key or validation error)',
        content: {
          'application/json': {
            schema: resolver(errorResponseSchema),
            examples: {
              invalidKey: {
                summary: 'Invalid key',
                value: { error: 'Invalid key. Key cannot be "." or ".."' }
              }
            }
          }
        }
      },
      429: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: resolver(errorResponseSchema),
            examples: {
              rateLimit: {
                summary: 'Too many writes to same key',
                value: { error: 'Rate limit exceeded. Maximum 1 write per second to the same key.' }
              }
            }
          }
        }
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': { schema: resolver(errorResponseSchema) }
        }
      }
    }
  }),
  vValidator('json', postRequestSchema),
  async (c) => {
    try {
      const { key, value, expiration, expirationTtl, metadata } = c.req.valid('json')

      // Additional key validation
      if (key === '.' || key === '..') {
        return c.json({ error: 'Invalid key. Key cannot be "." or ".."' }, 400)
      }

      // Build options object
      const options: KVNamespacePutOptions = {}
      if (expiration !== undefined) options.expiration = expiration
      if (expirationTtl !== undefined) options.expirationTtl = expirationTtl
      if (metadata !== undefined) options.metadata = metadata

      // Convert value to string if it's an object
      const valueToStore = typeof value === 'object' ? JSON.stringify(value) : String(value)

      await c.env.CF_WORKER_API_KV.put(key, valueToStore, options)

      return c.json({
        success: true,
        key,
        message: 'Key-value pair written successfully'
      }, 201)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Handle rate limiting errors
      if (errorMessage.includes('429')) {
        return c.json({
          error: 'Rate limit exceeded. Maximum 1 write per second to the same key.'
        }, 429)
      }

      return c.json({ error: errorMessage }, 500)
    }
  }
)

// Write a single KV pair (PUT)
app.put('/kv/:key',
  describeRoute({
    description: 'Write a single KV pair using PUT with key in URL path',
    parameters: [
      {
        name: 'key',
        in: 'path',
        required: true,
        description: 'The key to write (1-512 characters, cannot be "." or "..")',
        schema: { type: 'string' },
        example: 'user:123'
      }
    ],
    requestBody: {
      description: 'Value and optional metadata',
      required: true,
      content: {
        'application/json': {
          examples: {
            simpleValue: {
              summary: 'Store simple value',
              value: {
                value: 'John Doe'
              }
            },
            jsonValue: {
              summary: 'Store JSON object',
              value: {
                value: { name: 'John Doe', email: 'john@example.com', age: 30 }
              }
            },
            withTTL: {
              summary: 'Store with TTL (24 hours)',
              value: {
                value: 'temporary data',
                expirationTtl: 86400
              }
            },
            withMetadata: {
              summary: 'Store with metadata',
              value: {
                value: { status: 'active' },
                metadata: { createdBy: 'admin', version: 2 }
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Successfully created',
        content: {
          'application/json': {
            schema: resolver(successResponseSchema),
            examples: {
              success: {
                summary: 'Write successful',
                value: {
                  success: true,
                  key: 'user:123',
                  message: 'Key-value pair written successfully'
                }
              }
            }
          }
        }
      },
      400: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: resolver(errorResponseSchema),
            examples: {
              invalidKey: {
                summary: 'Invalid key',
                value: { error: 'Invalid key. Key cannot be "." or ".."' }
              }
            }
          }
        }
      },
      429: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: resolver(errorResponseSchema),
            examples: {
              rateLimit: {
                summary: 'Rate limit error',
                value: { error: 'Rate limit exceeded. Maximum 1 write per second to the same key.' }
              }
            }
          }
        }
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': { schema: resolver(errorResponseSchema) }
        }
      }
    }
  }),
  vValidator('param', keyParamSchema),
  vValidator('json', putRequestSchema),
  async (c) => {
    try {
      const { key } = c.req.valid('param')
      const { value, expiration, expirationTtl, metadata } = c.req.valid('json')

      // Additional key validation
      if (key === '.' || key === '..') {
        return c.json({ error: 'Invalid key. Key cannot be "." or ".."' }, 400)
      }

      // Build options object
      const options: KVNamespacePutOptions = {}
      if (expiration !== undefined) options.expiration = expiration
      if (expirationTtl !== undefined) options.expirationTtl = expirationTtl
      if (metadata !== undefined) options.metadata = metadata

      // Convert value to string if it's an object
      const valueToStore = typeof value === 'object' ? JSON.stringify(value) : String(value)

      await c.env.CF_WORKER_API_KV.put(key, valueToStore, options)

      return c.json({
        success: true,
        key,
        message: 'Key-value pair written successfully'
      }, 201)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Handle rate limiting errors
      if (errorMessage.includes('429')) {
        return c.json({
          error: 'Rate limit exceeded. Maximum 1 write per second to the same key.'
        }, 429)
      }

      return c.json({ error: errorMessage }, 500)
    }
  }
)

// Bulk write KV pairs
app.post('/kv/bulk',
  describeRoute({
    description: 'Bulk write multiple KV pairs (max 10,000 pairs) with automatic retry on rate limits',
    requestBody: {
      description: 'Array of key-value pairs to write',
      required: true,
      content: {
        'application/json': {
          examples: {
            simpleBulk: {
              summary: 'Bulk write simple values',
              value: {
                pairs: [
                  { key: 'user:1', value: 'Alice' },
                  { key: 'user:2', value: 'Bob' },
                  { key: 'user:3', value: 'Charlie' }
                ]
              }
            },
            bulkWithOptions: {
              summary: 'Bulk write with TTL and metadata',
              value: {
                pairs: [
                  {
                    key: 'session:abc',
                    value: { userId: 123, token: 'xyz' },
                    expirationTtl: 3600,
                    metadata: { type: 'user-session' }
                  },
                  {
                    key: 'session:def',
                    value: { userId: 456, token: 'uvw' },
                    expirationTtl: 3600,
                    metadata: { type: 'user-session' }
                  }
                ]
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'All pairs successfully written',
        content: {
          'application/json': {
            schema: resolver(bulkResponseSchema),
            examples: {
              allSuccess: {
                summary: 'All writes successful',
                value: {
                  success: true,
                  total: 3,
                  successful: 3,
                  failed: 0,
                  results: [
                    { key: 'user:1', success: true },
                    { key: 'user:2', success: true },
                    { key: 'user:3', success: true }
                  ]
                }
              }
            }
          }
        }
      },
      207: {
        description: 'Multi-status (partial success)',
        content: {
          'application/json': {
            schema: resolver(bulkResponseSchema),
            examples: {
              partialSuccess: {
                summary: 'Some writes failed',
                value: {
                  success: false,
                  total: 3,
                  successful: 2,
                  failed: 1,
                  results: [
                    { key: 'user:1', success: true },
                    { key: 'user:2', success: true },
                    { key: 'invalid', success: false, error: 'Invalid key' }
                  ]
                }
              }
            }
          }
        }
      },
      400: {
        description: 'Bad request',
        content: {
          'application/json': { schema: resolver(errorResponseSchema) }
        }
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': { schema: resolver(errorResponseSchema) }
        }
      }
    }
  }),
  vValidator('json', bulkWriteRequestSchema),
  async (c) => {
    try {
      const { pairs } = c.req.valid('json')

      const results: Array<{ key: string; success: boolean; error?: string }> = []

      // Process writes with retry logic for rate limiting
      const writeWithRetry = async (pair: { key: string; value: unknown; expiration?: number; expirationTtl?: number; metadata?: object }, maxRetries = 3) => {
        const { key, value, expiration, expirationTtl, metadata } = pair

        // Validate key
        if (key === '.' || key === '..') {
          return { key, success: false, error: 'Invalid key' }
        }

        const options: KVNamespacePutOptions = {}
        if (expiration !== undefined) options.expiration = expiration
        if (expirationTtl !== undefined) options.expirationTtl = expirationTtl
        if (metadata !== undefined) options.metadata = metadata

        const valueToStore = typeof value === 'object' ? JSON.stringify(value) : String(value)

        let attempt = 0
        let delay = 1000

        while (attempt < maxRetries) {
          try {
            await c.env.CF_WORKER_API_KV.put(key, valueToStore, options)
            return { key, success: true }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            if (errorMessage.includes('429') && attempt < maxRetries - 1) {
              // Rate limit error - retry with exponential backoff
              attempt++
              await new Promise(resolve => setTimeout(resolve, delay))
              delay *= 2
            } else {
              return { key, success: false, error: errorMessage }
            }
          }
        }

        return { key, success: false, error: 'Max retries reached' }
      }

      // Process all writes
      const writeResults = await Promise.all(pairs.map(pair => writeWithRetry(pair)))
      results.push(...writeResults)

      const successCount = results.filter(r => r.success).length
      const failureCount = results.length - successCount

      return c.json({
        success: failureCount === 0,
        total: results.length,
        successful: successCount,
        failed: failureCount,
        results
      }, failureCount === 0 ? 201 : 207) // 207 Multi-Status for partial success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return c.json({ error: errorMessage }, 500)
    }
  }
)

// Delete a single KV pair
app.delete('/kv/:key',
  describeRoute({
    description: 'Delete a single KV pair by key (succeeds even if key does not exist)',
    parameters: [
      {
        name: 'key',
        in: 'path',
        required: true,
        description: 'The key to delete (1-512 characters)',
        schema: { type: 'string' },
        example: 'user:123'
      }
    ],
    responses: {
      200: {
        description: 'Successfully deleted',
        content: {
          'application/json': {
            schema: resolver(successResponseSchema),
            examples: {
              deleted: {
                summary: 'Delete successful',
                value: {
                  success: true,
                  key: 'user:123',
                  message: 'Key deleted successfully'
                }
              }
            }
          }
        }
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': { schema: resolver(errorResponseSchema) }
        }
      }
    }
  }),
  vValidator('param', keyParamSchema),
  async (c) => {
    try {
      const { key } = c.req.valid('param')

      await c.env.CF_WORKER_API_KV.delete(key)

      return c.json({
        success: true,
        key,
        message: 'Key deleted successfully'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return c.json({ error: errorMessage }, 500)
    }
  }
)

// Bulk delete KV pairs
app.post('/kv/bulk/delete',
  describeRoute({
    description: 'Bulk delete multiple KV pairs by keys (no maximum limit)',
    requestBody: {
      description: 'Array of keys to delete',
      required: true,
      content: {
        'application/json': {
          examples: {
            deleteMultiple: {
              summary: 'Delete multiple keys',
              value: {
                keys: ['user:123', 'user:456', 'session:abc', 'cache:old-data']
              }
            },
            deleteByPrefix: {
              summary: 'Delete session keys',
              value: {
                keys: ['session:abc', 'session:def', 'session:ghi']
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Bulk delete completed',
        content: {
          'application/json': {
            schema: resolver(bulkResponseSchema),
            examples: {
              allDeleted: {
                summary: 'All deletions successful',
                value: {
                  success: true,
                  total: 4,
                  successful: 4,
                  failed: 0,
                  results: [
                    { key: 'user:123', success: true },
                    { key: 'user:456', success: true },
                    { key: 'session:abc', success: true },
                    { key: 'cache:old-data', success: true }
                  ]
                }
              }
            }
          }
        }
      },
      400: {
        description: 'Bad request',
        content: {
          'application/json': { schema: resolver(errorResponseSchema) }
        }
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': { schema: resolver(errorResponseSchema) }
        }
      }
    }
  }),
  vValidator('json', bulkDeleteRequestSchema),
  async (c) => {
    try {
      const { keys } = c.req.valid('json')

      const results: Array<{ key: string; success: boolean; error?: string }> = []

      const deletePromises = keys.map(async (key) => {
        try {
          await c.env.CF_WORKER_API_KV.delete(key)
          return { key, success: true }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          return { key, success: false, error: errorMessage }
        }
      })

      const deleteResults = await Promise.all(deletePromises)
      results.push(...deleteResults)

      const successCount = results.filter(r => r.success).length
      const failureCount = results.length - successCount

      return c.json({
        success: failureCount === 0,
        total: results.length,
        successful: successCount,
        failed: failureCount,
        results
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return c.json({ error: errorMessage }, 500)
    }
  }
)

// OpenAPI Specification Endpoint
app.get('/openapi',
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: 'Cloudflare KV Worker API',
        version: '1.0.0',
        description: 'A REST API for managing Cloudflare KV storage with support for reading, writing, and deleting key-value pairs, including batch operations and metadata management.',
      },
      servers: [
        { url: 'http://localhost:8787', description: 'Local Development Server' },
        { url: 'https://your-worker.your-subdomain.workers.dev', description: 'Production Server' },
      ],
    },
  })
)

// Scalar API Reference UI
app.get('/docs',
  Scalar({
    url: '/api/v1/openapi',
    theme: 'default',
    layout: 'modern',
  })
)

export default app
