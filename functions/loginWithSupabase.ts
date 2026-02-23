import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Erro de configuração do servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find user in Supabase
    const { data: supabaseUser, error: userError } = await supabase
      .from('users')
      .select('id, email, password, full_name, is_first_login')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      console.error('Supabase user query error:', userError);
      return Response.json({ error: 'Erro ao buscar usuário' }, { status: 500 });
    }

    if (!supabaseUser) {
      return Response.json({ error: 'Email não encontrado. Verifique se você completou a compra.' }, { status: 404 });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, supabaseUser.password);
    if (!passwordMatch) {
      return Response.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    // Check subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status, plan_type, expires_at')
      .eq('user_id', supabaseUser.id)
      .maybeSingle();

    if (subError) {
      console.error('Supabase subscription query error:', subError);
      return Response.json({ error: 'Erro ao verificar assinatura' }, { status: 500 });
    }

    if (!subscription || subscription.status !== 'active') {
      return Response.json({ error: 'Assinatura inativa ou expirada' }, { status: 403 });
    }

    // Generate a simple session token (base64 encoded payload + timestamp)
    const sessionPayload = {
      user_id: supabaseUser.id,
      email: supabaseUser.email,
      full_name: supabaseUser.full_name,
      is_first_login: supabaseUser.is_first_login,
      created_at: Date.now()
    };
    const sessionToken = btoa(JSON.stringify(sessionPayload));

    return Response.json({
      success: true,
      is_first_login: supabaseUser.is_first_login,
      user_id: supabaseUser.id,
      full_name: supabaseUser.full_name,
      email: supabaseUser.email,
      session_token: sessionToken,
      subscription_status: subscription.status
    }, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});