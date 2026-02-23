import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Registers a user in Base44 using service role (no email sent to the user)
Deno.serve(async (req) => {
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email obrigatório' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Use service role to invite user - this creates the account without needing
    // the user to verify their email for our custom login flow
    try {
      await base44.asServiceRole.users.inviteUser(email, 'user');
      return Response.json({ success: true, action: 'registered' });
    } catch (err) {
      // If user already exists, that's fine
      if (err.message?.includes('already') || err.message?.includes('exist') || err.status === 409) {
        return Response.json({ success: true, action: 'already_exists' });
      }
      throw err;
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});