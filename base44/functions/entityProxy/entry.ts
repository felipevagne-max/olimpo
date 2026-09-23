import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { session_token, operation, entity, data, id, filter, sort, limit } = body;

    // Validate session token
    if (!session_token) {
      return Response.json({ success: false, error: 'Token de sessão inválido' }, { status: 401 });
    }

    let sessionData;
    try {
      sessionData = JSON.parse(atob(session_token));
    } catch {
      return Response.json({ success: false, error: 'Token inválido' }, { status: 401 });
    }

    const userEmail = sessionData.email;
    if (!userEmail) {
      return Response.json({ success: false, error: 'Email não encontrado no token' }, { status: 401 });
    }

    // Check token expiration (30 days)
    if (sessionData.created_at) {
      const tokenAge = Date.now() - sessionData.created_at;
      if (tokenAge > 30 * 24 * 60 * 60 * 1000) {
        return Response.json({ success: false, error: 'Sessão expirada' }, { status: 401 });
      }
    }

    // Use createClientFromRequest to get proper service role access
    const base44 = createClientFromRequest(req);
    const entityRef = base44.asServiceRole.entities[entity];

    if (!entityRef) {
      return Response.json({ success: false, error: `Entidade '${entity}' não encontrada` }, { status: 400 });
    }

    let result;

    switch (operation) {
      case 'list': {
        result = await entityRef.filter({ owner_email: userEmail }, sort || '-created_date', limit || 500);
        break;
      }

      case 'filter': {
        const cleanFilter = { ...filter };
        delete cleanFilter.created_by;
        // Always scope to owner_email
        cleanFilter.owner_email = userEmail;
        result = await entityRef.filter(cleanFilter, sort || '-created_date', limit || 500);
        break;
      }

      case 'create': {
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
        return Response.json({ success: false, error: `Operação '${operation}' inválida` }, { status: 400 });
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('EntityProxy error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});