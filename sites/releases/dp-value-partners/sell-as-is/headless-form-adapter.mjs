/** Browser-only integration with the existing LeadScore intake. No rendering or design changes. */
export class FormSubmissionError extends Error {
  constructor(message, status = 0, retryAfter = null) {
    super(message); this.name = 'FormSubmissionError'; this.status = status; this.retryAfter = retryAfter
  }
}

function endpoint(value) {
  const url = new URL(value)
  if (url.username || url.password || url.hash || url.search || !(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw new Error('Use a secure LeadScore endpoint or a local test endpoint.')
  return url
}

export function validateIntegration(config) {
  if (!config || config.schemaVersion !== 1 || !Number.isInteger(config.revision) || config.revision < 1 || !Array.isArray(config.fields) || !config.fields.length || config.fields.length > 20) throw new Error('Use an exported LeadScore schema version 1 configuration.')
  const submit = endpoint(config.submitUrl)
  if (!/^\/f\/[a-zA-Z0-9]{16,64}$/.test(submit.pathname) || config.configUrl !== `${config.submitUrl}/config`) throw new Error('Use the endpoint returned by LeadScore; a company or tenant ID is not a form key.')
  const ids = new Set()
  for (const field of config.fields) {
    if (!/^[a-zA-Z0-9._:-]{1,100}$/.test(field.id) || ['__proto__', 'constructor', 'prototype'].includes(field.id) || ids.has(field.id) || !['text', 'email', 'phone', 'textarea', 'select', 'number'].includes(field.type)) throw new Error('The exported form fields are invalid.')
    ids.add(field.id)
  }
  if (!config.consent?.marketing || !config.spam?.turnstile || config.spam.honeypotField !== 'website' || !Array.isArray(config.allowedOrigins)) throw new Error('The exported form controls are invalid.')
  return config
}

function sessionStorage() { try { return globalThis.sessionStorage } catch { return null } }

export function captureAttribution(config, { url = globalThis.location?.href, referrer = globalThis.document?.referrer, now = () => new Date().toISOString(), storage = sessionStorage() } = {}) {
  const page = new URL(url)
  const touch = { captured_at: now() }
  for (const key of config.attributionKeys || []) {
    if (key === 'referrer') {
      try { const host = new URL(referrer).hostname; if (host !== page.hostname) touch.referrer = host } catch { /* no referring site */ }
    } else { const value = page.searchParams.get(key); if (value) touch[key] = value.slice(0, 500) }
  }
  const key = `leadscore-attribution:${config.pageId}`
  let prior
  try { prior = JSON.parse(storage?.getItem(key) || 'null') } catch { /* blocked storage */ }
  const attribution = { first: prior?.first || touch, latest: Object.keys(touch).length > 1 ? touch : prior?.latest || touch }
  try { storage?.setItem(key, JSON.stringify(attribution)) } catch { /* blocked storage */ }
  return attribution
}

/** Retains the same ID across uncertain network retries; explicit reset starts a new request. */
export function createHeadlessClient(configuration, options = {}) {
  const config = validateIntegration(configuration)
  const fetcher = options.fetch || globalThis.fetch.bind(globalThis)
  const storage = options.storage === undefined ? sessionStorage() : options.storage
  const key = `leadscore-pending:${config.submitUrl}`
  let pending = null
  try { pending = JSON.parse(storage?.getItem(key) || 'null') } catch { /* blocked storage */ }
  let sending = false
  function reset() { pending = null; try { storage?.removeItem(key) } catch { /* blocked storage */ } }

  async function submit({ answers: supplied, marketing = false, acknowledgement = false, acknowledgementVersion = config.consent.acknowledgement?.version, website = '', turnstileToken, attribution } = {}) {
    if (sending) throw new FormSubmissionError('This request is already being sent.')
    const answers = {}
    for (const field of config.fields) {
      const raw = supplied?.[field.id]
      if (raw != null && typeof raw !== 'string' && typeof raw !== 'number') throw new FormSubmissionError(`Enter a valid ${field.label.toLowerCase()}.`, 400)
      const value = field.type === 'number' ? (raw == null || raw === '' ? '' : Number(raw)) : String(raw ?? '').trim().slice(0, field.type === 'textarea' ? 5000 : 2000)
      if (field.required && value === '') throw new FormSubmissionError(`${field.label} is required.`, 400)
      if ((field.type === 'number' && value !== '' && !Number.isFinite(value)) || (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) || (field.type === 'select' && value && !field.options?.includes(value))) throw new FormSubmissionError(`Enter a valid ${field.label.toLowerCase()}.`, 400)
      if (value !== '') answers[field.id] = value
    }
    if (config.consent.marketing.required && marketing !== true) throw new FormSubmissionError('Marketing permission is required.', 400)
    if (config.consent.acknowledgement && ((config.consent.acknowledgement.required && acknowledgement !== true) || (acknowledgement === true && acknowledgementVersion !== config.consent.acknowledgement.version))) throw new FormSubmissionError('Accept the current acknowledgement wording.', 400)
    if (config.spam.turnstile.required && !turnstileToken) throw new FormSubmissionError('Complete the security check before submitting.', 400)
    const consent = { marketing: marketing === true, acknowledgement: acknowledgement === true, acknowledgementVersion }
    const content = JSON.stringify({ revision: config.revision, answers, consent })
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))
    const fingerprint = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('')
    if (pending && pending.fingerprint !== fingerprint) throw new FormSubmissionError('Retry the original answers first, or explicitly start a new request.', 409)
    if (!pending) pending = { fingerprint, id: (options.randomUUID || (() => crypto.randomUUID()))() }
    try { storage?.setItem(key, JSON.stringify(pending)) } catch { /* in-memory ID still protects retries */ }
    const payload = { schemaVersion: 1, revision: config.revision, submissionId: pending.id, answers, consent, website, turnstileToken, attribution: attribution || captureAttribution(config, { ...options, storage }) }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000)
    sending = true
    try {
      const transport = options.transport || 'json'
      if (!['json', 'urlencoded', 'multipart'].includes(transport)) throw new FormSubmissionError('Choose a supported form transport.', 400)
      const bodyData = transport === 'json' ? JSON.stringify(payload) : encodeHeadlessForm(payload, transport === 'multipart')
      const response = await fetcher(config.submitUrl, { method: 'POST', credentials: 'omit', redirect: 'error', headers: { ...(transport === 'json' ? { 'content-type': 'application/json' } : transport === 'urlencoded' ? { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' } : {}), accept: 'application/json' }, signal: controller.signal, body: bodyData })
      const body = await response.json().catch(() => null)
      if (!response.ok || body?.success !== true || typeof body.resources?.id !== 'string') {
        throw new FormSubmissionError(body?.error || 'The request could not be sent. Please try again.', response.status, response.headers.get('retry-after'))
      }
      globalThis.LeadScoreTracker?.confirmConversion(body.resources)
      return body.resources
    } catch (error) {
      if (error instanceof FormSubmissionError) throw error
      throw new FormSubmissionError('The connection was interrupted. Retry with the same answers; your request ID has been kept.')
    } finally { clearTimeout(timeout); sending = false }
  }
  return { config, submit, reset }
}

/** Named controls also work in an ordinary HTML form; unchecked optional choices may be omitted. */
export function encodeHeadlessForm(payload, multipart = false) {
  const data = multipart ? new FormData() : new URLSearchParams()
  function append(name, value) {
    if (value == null) return
    if (typeof value === 'object') for (const [key, child] of Object.entries(value)) append(`${name}[${key}]`, child)
    else data.append(name, String(value))
  }
  for (const [key, value] of Object.entries(payload)) append(key, value)
  return data
}

/** Connects existing named controls. The caller retains layout, labels, theme and success navigation. */
export function attachHeadlessForm(form, configuration, { fieldMap = {}, onStatus = () => {}, onSuccess = () => {}, getTurnstileToken = () => undefined, resetTurnstile = () => {}, ...options } = {}) {
  const client = createHeadlessClient(configuration, options)
  const control = name => form.elements.namedItem(name)
  const handler = async event => {
    event.preventDefault()
    const buttons = [...form.querySelectorAll('button[type="submit"],input[type="submit"]')]
    if (buttons.some(button => button.disabled)) return
    const data = new FormData(form)
    const answers = Object.fromEntries(client.config.fields.map(field => [field.id, data.get(fieldMap[field.id] || field.id)]))
    buttons.forEach(button => { button.disabled = true })
    try {
      onStatus('Sending your request...', 'sending')
      const result = await client.submit({ answers, marketing: control('marketing_consent')?.checked === true, acknowledgement: control('acknowledgement')?.checked === true, website: data.get('website') || '', turnstileToken: getTurnstileToken() })
      onStatus(result.duplicate ? 'Your request was already received.' : 'Thank you. Your request has been received.', 'success')
      onSuccess(result)
    } catch (error) { onStatus(error.message, 'error', error) }
    finally { buttons.forEach(button => { button.disabled = false }); resetTurnstile() }
  }
  form.addEventListener('submit', handler)
  return { ...client, dispose: () => form.removeEventListener('submit', handler) }
}

/** Use an existing iframe in the page's security-check area. Accept messages only from that exact frame. */
export function connectTurnstileBridge(iframe, configuration, { window: pageWindow = globalThis.window, onState = () => {} } = {}) {
  const config = validateIntegration(configuration)
  if (!config.spam.turnstile.required) return { getToken: () => undefined, reset: () => {}, dispose: () => {} }
  const bridge = new URL(config.spam.turnstile.bridgeUrl)
  if (bridge.origin !== new URL(config.submitUrl).origin || bridge.pathname !== '/__leadscore/turnstile') throw new Error('Use the LeadScore security-check bridge from the export.')
  bridge.searchParams.set('origin', pageWindow.location.origin)
  let token
  function message(event) {
    if (event.source !== iframe.contentWindow || event.origin !== bridge.origin) return
    if (event.data?.type === 'leadscore-turnstile') token = typeof event.data.token === 'string' ? event.data.token : undefined
    if (event.data?.type === 'leadscore-turnstile-state') onState(event.data.state)
  }
  pageWindow.addEventListener('message', message)
  iframe.src = bridge.href
  return { getToken: () => token, reset: () => { token = undefined; iframe.contentWindow?.postMessage({ type: 'leadscore-turnstile-reset' }, bridge.origin) }, dispose: () => pageWindow.removeEventListener('message', message) }
}
