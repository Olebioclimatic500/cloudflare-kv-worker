import { Hono } from 'hono'

const app = new Hono<{ Bindings: CloudflareBindings }>().basePath('/api/v1');

app.get('/', (c) => {
  return c.json({ message: 'Cloudflare KV Worker API', version: '1.0.0' })
})

// Get a single KV value
app.get('/kv/:key', async (c) => {
  try {
    const key = c.req.param('key')
    const type = c.req.query('type') || 'text'
    const cacheTtl = c.req.query('cacheTtl')

    const options = cacheTtl ? { cacheTtl: Number.parseInt(cacheTtl, 10) } : undefined

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
})

// Get multiple KV values
app.post('/kv/batch', async (c) => {
  try {
    const body = await c.req.json()
    const { keys, type = 'text', cacheTtl } = body

    if (!Array.isArray(keys) || keys.length === 0) {
      return c.json({ error: 'keys must be a non-empty array' }, 400)
    }

    if (keys.length > 100) {
      return c.json({ error: 'Maximum 100 keys allowed per request' }, 400)
    }

    const options = cacheTtl ? { cacheTtl: Number.parseInt(cacheTtl, 10) } : undefined
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
})

// Get a single KV value with metadata
app.get('/kv/:key/metadata', async (c) => {
  try {
    const key = c.req.param('key')
    const type = c.req.query('type') || 'text'
    const cacheTtl = c.req.query('cacheTtl')

    const options = cacheTtl ? { cacheTtl: Number.parseInt(cacheTtl, 10) } : undefined

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
})

// Get multiple KV values with metadata
app.post('/kv/batch/metadata', async (c) => {
  try {
    const body = await c.req.json()
    const { keys, type = 'text', cacheTtl } = body

    if (!Array.isArray(keys) || keys.length === 0) {
      return c.json({ error: 'keys must be a non-empty array' }, 400)
    }

    if (keys.length > 100) {
      return c.json({ error: 'Maximum 100 keys allowed per request' }, 400)
    }

    const options = cacheTtl ? { cacheTtl: Number.parseInt(cacheTtl, 10) } : undefined
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
})

// List KV keys with pagination
app.get('/kv', async (c) => {
  try {
    const prefix = c.req.query('prefix')
    const limit = c.req.query('limit')
    const cursor = c.req.query('cursor')

    const options: KVNamespaceListOptions = {}
    if (prefix) options.prefix = prefix
    if (limit) options.limit = Number.parseInt(limit, 10)
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
})

// Write a single KV pair
app.put('/kv/:key', async (c) => {
  try {
    const key = c.req.param('key')

    // Validate key
    if (!key || key === '.' || key === '..') {
      return c.json({ error: 'Invalid key. Key cannot be empty, ".", or ".."' }, 400)
    }

    if (key.length > 512) {
      return c.json({ error: 'Key exceeds maximum length of 512 bytes' }, 400)
    }

    const body = await c.req.json()
    const { value, expiration, expirationTtl, metadata } = body

    if (value === undefined || value === null) {
      return c.json({ error: 'value is required' }, 400)
    }

    // Validate expirationTtl minimum
    if (expirationTtl !== undefined && expirationTtl < 60) {
      return c.json({ error: 'expirationTtl must be at least 60 seconds' }, 400)
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
})

// Bulk write KV pairs
app.post('/kv/bulk', async (c) => {
  try {
    const body = await c.req.json()
    const { pairs } = body

    if (!Array.isArray(pairs) || pairs.length === 0) {
      return c.json({ error: 'pairs must be a non-empty array' }, 400)
    }

    if (pairs.length > 10000) {
      return c.json({ error: 'Maximum 10,000 key-value pairs allowed per bulk write' }, 400)
    }

    const results: Array<{ key: string; success: boolean; error?: string }> = []

    // Process writes with retry logic for rate limiting
    const writeWithRetry = async (pair: { key: string; value: unknown; expiration?: number; expirationTtl?: number; metadata?: object }, maxRetries = 3) => {
      const { key, value, expiration, expirationTtl, metadata } = pair

      // Validate key
      if (!key || key === '.' || key === '..') {
        return { key, success: false, error: 'Invalid key' }
      }

      if (key.length > 512) {
        return { key, success: false, error: 'Key exceeds maximum length of 512 bytes' }
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
})

// Delete a single KV pair
app.delete('/kv/:key', async (c) => {
  try {
    const key = c.req.param('key')

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
})

// Bulk delete KV pairs
app.post('/kv/bulk/delete', async (c) => {
  try {
    const body = await c.req.json()
    const { keys } = body

    if (!Array.isArray(keys) || keys.length === 0) {
      return c.json({ error: 'keys must be a non-empty array' }, 400)
    }

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
})

export default app
