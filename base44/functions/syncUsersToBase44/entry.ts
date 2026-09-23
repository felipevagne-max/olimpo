import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all users with active subscriptions from Supabase
    const { data: supabaseUsers, error } = await supabase
      .from('users')
      .select('id, email, full_name');

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const results = [];
    for (const su of supabaseUsers) {
      try {
        await base44.asServiceRole.users.inviteUser(su.email, 'user');
        results.push({ email: su.email, status: 'invited' });
        console.log('Invited:', su.email);
      } catch (err) {
        results.push({ email: su.email, status: 'error', error: err.message });
        console.error('Error inviting', su.email, err.message);
      }
    }

    return Response.json({ success: true, results }, { status: 200 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});