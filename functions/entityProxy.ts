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
      case 'list':
        result = await entityRef.list(sort || '-created_date', limit || 500);
        // Filter by owner_email field
        result = result.filter(r => r.owner_email === userEmail);
        break;

      case 'filter':
        const filterWithUser = { ...filter, owner_email: userEmail };
        // Remove created_by from filter if present (not reliable with service role)
        delete filterWithUser.created_by;
        result = await entityRef.filter(filterWithUser, sort || '-created_date', limit || 500);
        break;

      case 'create':
        // Store owner_email as a custom field so we can filter by user later
        result = await entityRef.create({ ...data, owner_email: userEmail });
        break;

      case 'update':
        // Verify ownership before update (by owner_email)
        const existing = await entityRef.filter({ id, owner_email: userEmail });
        if (!existing || existing.length === 0) {
          // Fallback: try to get the record directly and check
          const record = await entityRef.filter({ id });
          if (!record || record.length === 0) {
            return Response.json({ error: 'Registro não encontrado' }, { status: 404 });
          }
          // Allow update if no owner_email set yet (migration)
          if (record[0].owner_email && record[0].owner_email !== userEmail) {
            return Response.json({ error: 'Sem permissão para editar este registro' }, { status: 403 });
          }
        }
        result = await entityRef.update(id, data);
        break;

      case 'delete':
        // Verify ownership before delete
        const toDelete = await entityRef.filter({ id, owner_email: userEmail });
        if (!toDelete || toDelete.length === 0) {
          const record = await entityRef.filter({ id });
          if (!record || record.length === 0) {
            return Response.json({ error: 'Registro não encontrado' }, { status: 404 });
          }
          if (record[0].owner_email && record[0].owner_email !== userEmail) {
            return Response.json({ error: 'Sem permissão para excluir este registro' }, { status: 403 });
          }
        }
        result = await entityRef.delete(id);
        break;

      default:
        return Response.json({ error: `Operação '${operation}' inválida` }, { status: 400 });
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('EntityProxy error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});