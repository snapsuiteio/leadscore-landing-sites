import { isWizardChoice, CHOICE_TTL_MS, CHOICE_CAPACITY, CHOICE_BATCH_SIZE } from './choices.mjs';
const QUEUE_DB = 'leadscore_wizard_choices', QUEUE_VERSION = 1;
/** Native IDB only. A scope is an exact published first-party form endpoint, never a visitor URL. */
export class ChoiceCollector {
    constructor({ scope, privateVisit = false, mirror = () => { }, onStatus = () => { } }) {
        this.scope = scope;
        this.private = privateVisit;
        this.allowed = false;
        this.epoch = null;
        this.config = null;
        this.mirror = mirror;
        this.onStatus = onStatus;
        this.status = 'unavailable';
        this.owner = crypto.randomUUID();
        this.generation = 0;
        const key = 'leadscore-choice-visit:' + scope;
        this.visitKey = key;
        try {
            this.visit = sessionStorage.getItem(key);
if (!/^[a-zA-Z0-9._:-]{8,100}$/.test(this.visit || ''))this.visit=null;
        }
        catch {
            this.visit = null;
        }
        this.dbPromise = new Promise((resolve, reject) => {
            let settled = false;
            const timer = setTimeout(() => { settled = true; reject(Error('Storage open timed out')); }, 1500);
            const request = indexedDB.open(QUEUE_DB, QUEUE_VERSION);
            request.onupgradeneeded = () => { if(settled){request.transaction.abort();return;} const db = request.result; db.createObjectStore('scopes', { keyPath: 'scope' }); const store = db.createObjectStore('pending', { keyPath: 'eventId' }); store.createIndex('scope', 'scope'); };
            request.onerror = () => { settled=true;clearTimeout(timer); reject(request.error); };
            request.onblocked = () => { settled=true;clearTimeout(timer); reject(Error('Storage blocked')); };
            request.onsuccess = () => { const db = request.result;clearTimeout(timer);if(settled){db.close();return;}settled=true;db.onversionchange = () => db.close(); resolve(db); };
        });
        // Attach rejection handler immediately, including visits excluded before configuration.
        this.dbPromise.catch(() => this.report('storage_unavailable'));
        this.channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('leadscore-choice-consent') : null;
        this.channel?.addEventListener('message', event => {
            if (event.data?.scope === this.scope && event.data.action === 'revoke') {
                this.allowed = false;
                ++this.generation;
                this.abort?.abort();
                clearTimeout(this.timer);
                this.report('off');
            }
        });
        this.timer = null;
        this.online = () => void this.drain();
        addEventListener('online', this.online);
        if (privateVisit)
            void this.suspend();
    }
    report(status) { this.status = status; this.onStatus(status); return { status }; }
    async transaction(action) {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['scopes', 'pending'], 'readwrite'), scopes = tx.objectStore('scopes'), pending = tx.objectStore('pending');
            let value;
            const timeout = setTimeout(() => { try {
                tx.abort();
            }
            catch { } reject(Error('Storage transaction timed out')); }, 1500);
            tx.oncomplete = () => { clearTimeout(timeout); resolve(value); };
            tx.onerror = () => { clearTimeout(timeout); reject(tx.error); };
            tx.onabort = () => { clearTimeout(timeout); reject(tx.error || Error('Storage transaction aborted')); };
            const request = scopes.get(this.scope);
            request.onsuccess = () => {
                try {
                    action({ tx, scopes, pending, meta: request.result || { scope: this.scope, epoch: 0, allowed: false, sequences: {}, lease: null }, done: result => { value = result; } });
                }
                catch {
                    tx.abort();
                }
            };
        });
    }
    configure(config) {
        if (this.private)
            return false;
        if (config?.choiceTracking?.status !== 'ready' || config.submitUrl !== this.scope || config.choiceTracking.url !== this.scope + '/choices' || !config.allowedOrigins?.includes(location.origin) || !Number.isSafeInteger(config.revision) || typeof config.pageId !== 'string')
            return false;
        this.config = { pageId: config.pageId, revision: config.revision, url: config.choiceTracking.url };
        return true;
    }
    async consent(allow) {
        if (!allow)
            this.channel?.postMessage({ scope: this.scope, action: 'revoke' });
        const generation = ++this.generation;
        this.allowed = false;
        this.abort?.abort();
        clearTimeout(this.timer);
        try {
            const result = await this.transaction(({ scopes, pending, meta, done }) => {
                if (this.private || generation !== this.generation)
                    return done(null);
                if (!allow) {
                    meta.epoch++;
                    meta.allowed = false;
                    meta.lease = null;
                    const request = pending.index('scope').openCursor(IDBKeyRange.only(this.scope));
                    request.onsuccess = () => {
                        const cursor = request.result;
                        if (cursor) {
                            cursor.delete();
                            cursor.continue();
                        }
                    };
                }
                else
                    meta.allowed = true;
                scopes.put(meta);
                done(meta.epoch);
            });
            if (generation !== this.generation || this.private)
                return this.report('private');
            this.epoch = result;
            this.allowed = allow === true && !!this.config && result !== null;
            if (this.allowed) {
                void this.drain();
                return this.report('ready');
            }
            return this.report('off');
        }
        catch {
            return this.report('storage_unavailable');
        }
    }
    async suspend() {
        this.private = true;
        this.allowed = false;
        ++this.generation;
        this.abort?.abort();
        clearTimeout(this.timer);
        try {
            await this.transaction(({ pending, meta, scopes, done }) => {
                if (meta.lease?.visit === this.visit) {
                    meta.lease = null;
                    scopes.put(meta);
                }
                const request = pending.index('scope').openCursor(IDBKeyRange.only(this.scope));
                request.onsuccess = () => {
                    const cursor = request.result;
                    if (cursor) {
                        if (cursor.value.visitorId === this.visit)
                            cursor.delete();
                        cursor.continue();
                    }
                };
                done(null);
            });
        }
        catch { }
        return this.report('private');
    }
    async capture(choice) {
        if (this.private)
            return this.report('private');
        if (!this.config)
            return this.report('unavailable');
        if (!this.allowed)
            return this.report('off');
        if (!isWizardChoice(choice))
            return this.report('invalid');
        const generation = this.generation;
        try {
            const outcome = await this.transaction(({ scopes, pending, meta, done }) => {
                if (this.private || !this.allowed || generation !== this.generation || meta.epoch !== this.epoch || !meta.allowed)
                    return done({ status: 'excluded' });
                const request = pending.index('scope').getAll(IDBKeyRange.only(this.scope));
                request.onsuccess = () => {
                    if (this.private || !this.allowed || generation !== this.generation)
                        return done({ status: 'excluded' });
                    const now = Date.now(), live = request.result.filter(row => row.expiresAt > now);
                    request.result.filter(row => row.expiresAt <= now).forEach(row => pending.delete(row.eventId));
                    if (live.length >= CHOICE_CAPACITY)
                        return done({ status: 'full' });
                    const retained = new Set(live.map(row => row.visitorId));
                    retained.add(this.visit);
                    for (const [visit, entry] of Object.entries(meta.sequences))
                        if (!retained.has(visit) && entry.lastSeen < now - CHOICE_TTL_MS)
                            delete meta.sequences[visit];
                    const old = Object.entries(meta.sequences).filter(([visit]) => !retained.has(visit)).sort((a, b) => a[1].lastSeen - b[1].lastSeen);
                    while (Object.keys(meta.sequences).length >= CHOICE_CAPACITY * 2 && old.length)
                        delete meta.sequences[old.shift()[0]];
                    // Evicted/pruned visit metadata cannot reuse a server-retained sequence.
                    if (!meta.sequences[this.visit]) {
                        this.visit = crypto.randomUUID();
                        try {
                            sessionStorage.setItem(this.visitKey, this.visit);
                        }
                        catch { }
                    }
                    const sequence = (meta.sequences[this.visit]?.next || 0) + 1;
                    meta.sequences[this.visit] = { next: sequence, lastSeen: now };
                    scopes.put(meta);
                    const event = { eventId: crypto.randomUUID(), visitorId: this.visit, sequence, choice };
                    pending.add({ ...event, scope: this.scope, epoch: this.epoch, revision: this.config.revision, createdAt: now, expiresAt: now + CHOICE_TTL_MS, state: 'pending', attempts: 0, nextAt: 0 });
                    done({ status: 'queued', event });
                };
            });
            if (outcome?.event && !this.private && this.allowed && generation === this.generation) {
                this.mirror('wizard_choice_' + choice);
                clearTimeout(this.timer);
                this.timer = setTimeout(() => void this.drain(), 150);
            }
            return this.report(outcome?.status || 'excluded');
        }
        catch {
            return this.report('storage_unavailable');
        }
    }
    async drain() {
        if (this.private || !this.allowed || !this.config)
            return;
        const generation = this.generation, now = Date.now();
        let batch;
        try {
            batch = await this.transaction(({ scopes, pending, meta, done }) => {
                if (this.private || !this.allowed || generation !== this.generation || !meta.allowed || meta.epoch !== this.epoch)
                    return done({ rows: [] });
                if (meta.lease?.until > now)
                    return done({ rows: [], wakeAt: meta.lease.until });
                const request = pending.index('scope').getAll(IDBKeyRange.only(this.scope));
                request.onsuccess = () => {
                    if (this.private || !this.allowed || generation !== this.generation)
                        return done([]);
                    const all = request.result;
                    all.filter(row => row.expiresAt <= now || row.epoch !== meta.epoch).forEach(row => pending.delete(row.eventId));
                    const eligible = all.filter(row => row.expiresAt > now && row.epoch === meta.epoch && row.state === 'pending' && row.nextAt <= now).sort((a, b) => a.createdAt - b.createdAt || a.sequence - b.sequence);
                    const revision = eligible[0]?.revision, rows = eligible.filter(row => row.revision === revision).slice(0, CHOICE_BATCH_SIZE);
                    if (rows.length) {
                        meta.lease = { owner: this.owner, visit: this.visit, until: now + 30000 };
                        scopes.put(meta);
                    }
                    const future = all.filter(row => row.expiresAt > now && row.epoch === meta.epoch && row.state === 'pending').map(row => row.nextAt).filter(at => at > now);
                    done({ rows, wakeAt: future.length ? Math.min(...future) : null });
                };
            });
            if (this.private || !this.allowed || generation !== this.generation)
                return;
            if (!batch?.rows?.length) {
                if (batch?.wakeAt) {
                    clearTimeout(this.timer);
                    this.timer = setTimeout(() => void this.drain(), Math.max(50, batch.wakeAt - Date.now() + 10));
                }
                return;
            }
            batch = batch.rows;
            this.abort = new AbortController();
            const timeout = setTimeout(() => this.abort.abort(), 10000);
            let result, status = 0, retryAfter = 0;
            try {
                const response = await fetch(this.config.url, { method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ schemaVersion: 1, revision: batch[0].revision, consent: { analytics: true }, events: batch.map(({ eventId, visitorId, sequence, choice }) => ({ eventId, visitorId, sequence, choice })) }), signal: this.abort.signal });
                status = response.status;
                retryAfter = Math.min(86400000, Math.max(0, Number(response.headers.get('retry-after')) * 1000 || 0));
                if (response.ok)
                    result = await response.json();
            }
            catch { }
            finally {
                clearTimeout(timeout);
            }
            const valid = status >= 200 && status < 300 && result?.success === true && result.resources?.status === 'recorded' && Array.isArray(result.resources.receipts) && batch.every(row => result.resources.receipts.some(receipt => receipt.eventId === row.eventId && receipt.sequence === row.sequence));
            await this.transaction(({ scopes, pending, meta, done }) => {
                if (this.private || !this.allowed || generation !== this.generation || !meta.allowed || meta.epoch !== this.epoch || meta.lease?.owner !== this.owner)
                    return done(null);
                meta.lease = null;
                scopes.put(meta);
                for (const row of batch) {
                    if (valid)
                        pending.delete(row.eventId);
                    else
                        pending.put({ ...row, state: status === 409 ? 'blocked' : 'pending', attempts: row.attempts + 1, nextAt: Date.now() + Math.max(retryAfter, Math.min(300000, 1000 * 2 ** Math.min(row.attempts, 8))) });
                }
                done(null);
            });
            if (!this.private && this.allowed && generation === this.generation) {
                this.report(valid ? 'recorded' : status === 409 ? 'blocked' : 'queued');
                clearTimeout(this.timer);
                this.timer = setTimeout(() => void this.drain(), valid ? 150 : Math.max(retryAfter, 1000));
            }
        }
        catch {
            this.report('storage_unavailable');
        }
    }
    async close() {
        this.allowed = false;
        ++this.generation;
        clearTimeout(this.timer);
        this.abort?.abort();
        removeEventListener('online', this.online);
        this.channel?.close();
        try {
            (await this.dbPromise).close();
        }
        catch { }
    }
}
