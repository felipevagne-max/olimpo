/**
 * entityClient.js
 * 
 * Wrapper que usa a sessão Olimpo (localStorage) para fazer operações de entidade
 * via backend proxy com service role, garantindo que created_by seja salvo corretamente.
 * 
 * Inclui deduplicação de requests em voo para evitar rate limit (429).
 */
import { base44 } from '@/api/base44Client';

const SESSION_KEY = 'olimpo_session';

function getSessionToken() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return session?.session_token || null;
  } catch {
    return null;
  }
}

// In-flight request deduplication: mesma chave → mesmo Promise
const inFlight = new Map();

function makeKey(operation, entity, params) {
  // Para writes (create/update/delete) nunca deduplicamos
  if (['create', 'update', 'delete'].includes(operation)) return null;
  return `${operation}:${entity}:${JSON.stringify(params)}`;
}

async function proxyCall(operation, entity, params = {}) {
  const session_token = getSessionToken();
  if (!session_token) throw new Error('Sessão não encontrada. Faça login novamente.');

  const key = makeKey(operation, entity, params);

  if (key && inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = base44.functions.invoke('entityProxy', {
    session_token,
    operation,
    entity,
    ...params
  }).then(response => {
    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Erro na operação');
    }
    return response.data.data;
  }).finally(() => {
    if (key) inFlight.delete(key);
  });

  if (key) inFlight.set(key, promise);

  return promise;
}

function createEntityProxy(entityName) {
  return {
    list: (sort, limit) => proxyCall('list', entityName, { sort, limit }),
    filter: (filter, sort, limit) => proxyCall('filter', entityName, { filter, sort, limit }),
    create: (data) => proxyCall('create', entityName, { data }),
    update: (id, data) => proxyCall('update', entityName, { id, data }),
    delete: (id) => proxyCall('delete', entityName, { id }),
    get: (id) => proxyCall('filter', entityName, { filter: { id } }).then(arr => arr?.[0] || null),
  };
}

// Exporta um objeto com as mesmas entidades que o base44.entities, mas via proxy
export const entities = new Proxy({}, {
  get(_, entityName) {
    return createEntityProxy(entityName);
  }
});