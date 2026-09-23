import { createClient as createSupabaseClient } from 'npm:@supabase/supabase-js@2.39.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admin can sync
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Erro de configuração do servidor' }, { status: 500 });
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    // Find user in Supabase
    const { data: supabaseUser, error: userError } = await supabase
      .from('users')
      .select('id, email, password, full_name, is_first_login')
      .eq('email', email)
      .single();

    if (userError || !supabaseUser) {
      return Response.json({ error: 'Usuário não encontrado no Supabase' }, { status: 404 });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, supabaseUser.password);

    if (!passwordMatch) {
      return Response.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    // Check if user has active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, plan_type, expires_at')
      .eq('user_id', supabaseUser.id)
      .single();

    if (!subscription || subscription.status !== 'active') {
      return Response.json({ error: 'Assinatura inválida ou expirada' }, { status: 403 });
    }

    return Response.json({ 
      success: true,
      user: {
        id: supabaseUser.id,
        email: supabaseUser.email,
        full_name: supabaseUser.full_name,
        is_first_login: supabaseUser.is_first_login
      },
      subscription: {
        plan_type: subscription.plan_type,
        expires_at: subscription.expires_at
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});