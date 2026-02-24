import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Proxy function that performs entity operations as service role
// using the user email from the olympo session token
Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { session_token, operation, entity, data, id, filter, sort, limit } = body;

    // Validate session token
    if (!session_token) {
      return Response.json({ error: 'Token de sessão inválido' }, { status: 401 });
    }

    let sessionData;
    try {
      sessionData = JSON.parse(atob(session_token));
    } catch {
      return Response.json({ error: 'Token inválido' }, { status: 401 });
    }

    const userEmail = sessionData.email;
    if (!userEmail) {
      return Response.json({ error: 'Email não encontrado no token' }, { status: 401 });
    }

    // Check token expiration (30 days) - only if created_at is present
    if (sessionData.created_at) {
      const tokenAge = Date.now() - sessionData.created_at;
      if (tokenAge > 30 * 24 * 60 * 60 * 1000) {
        return Response.json({ error: 'Sessão expirada' }, { status: 401 });
      }
    }

    const base44 = createClientFromRequest(req);
    const entityRef = base44.asServiceRole.entities[entity];

    if (!entityRef) {
      return Response.json({ error: `Entidade '${entity}' não encontrada` }, { status: 400 });
    }

    let result;

    switch (operation) {
      case 'list': {
        const all = await entityRef.list(sort || '-created_date', limit || 1000);
        // Filter by owner_email: include records that belong to the user OR have no owner_email set (legacy data)
        result = all.filter(r => !r.owner_email || r.owner_email === userEmail);
        break;
      }

      case 'filter': {
        // Remove created_by from filter (not reliable with service role)
        const cleanFilter = { ...filter };
        delete cleanFilter.created_by;
        const all = await entityRef.filter(cleanFilter, sort || '-created_date', limit || 1000);
        // Filter by owner_email: include records that belong to the user OR have no owner_email set (legacy data)
        result = all.filter(r => !r.owner_email || r.owner_email === userEmail);
        break;
      }

      case 'create': {
        // Store owner_email inside the record for future filtering
        result = await entityRef.create({ ...data, owner_email: userEmail });
        break;
      }

      case 'update': {
        result = await entityRef.update(id, data);
        break;
      }

      case 'delete': {
        result = await entityRef.delete(id);
        break;
      }

      default:
        return Response.json({ error: `Operação '${operation}' inválida` }, { status: 400 });
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('EntityProxy error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});