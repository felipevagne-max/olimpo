import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// This function registers or logs in a user in Base44 using service role,
// bypassing email verification entirely.
Deno.serve(async (req) => {
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email obrigatório' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Use service role to create a session token for the user directly
    // This bypasses email verification
    const token = await base44.asServiceRole.auth.createUserToken(email);

    return Response.json({ success: true, token });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});