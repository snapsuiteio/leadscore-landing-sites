/** Use an existing iframe in the page's security-check area. Accept messages only from that exact frame. */
export function connectTurnstileBridge(iframe, configuration, { window: pageWindow = globalThis.window, onState = () => {} } = {}) {
  const config = configuration
  if(config?.schemaVersion!==1||!config.spam?.turnstile)throw new Error('Use the published LeadScore security-check configuration.')
  const submit=new URL(config.submitUrl)
  if(!['https://pages.getleadscore.ai','https://pages-preview.getleadscore.ai'].includes(submit.origin)||!/^\/f\/[a-zA-Z0-9]{16,64}$/.test(submit.pathname)||submit.username||submit.password||submit.search||submit.hash)throw new Error('Use the published LeadScore form endpoint.')
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
