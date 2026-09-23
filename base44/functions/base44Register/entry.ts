import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Registers a user in Base44 using service role (no email sent to the user)
Deno.serve(async (req) => {
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email obrigatório' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Try to register user directly (service role bypasses email verification)
    try {
      await base44.asServiceRole.auth.register({ email, password: 'Olimpo12345' });
      return Response.json({ success: true, action: 'registered' });
    } catch (err) {
      const msg = err.message || '';
      // User already exists - fine
      if (msg.includes('already') || msg.includes('exist') || msg.includes('taken') || msg.includes('registered')) {
        return Response.json({ success: true, action: 'already_exists' });
      }
      throw err;
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});