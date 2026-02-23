import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email obrigatório' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Try to register the user in Base44 using service role
    try {
      await base44.asServiceRole.users.inviteUser(email, 'user');
      return Response.json({ success: true, action: 'invited' });
    } catch (inviteErr) {
      // User might already exist
      return Response.json({ success: true, action: 'already_exists', message: inviteErr.message });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});