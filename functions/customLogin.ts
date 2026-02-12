import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, password, full_name, is_first_login')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return Response.json({ error: 'Email ou senha incorretos' }, { status: 401 });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return Response.json({ error: 'Email ou senha incorretos' }, { status: 401 });
    }

    // Check if user has active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, plan_type, expires_at')
      .eq('user_id', user.id)
      .single();

    if (!subscription || subscription.status !== 'active') {
      return Response.json({ error: 'Assinatura inválida ou expirada' }, { status: 403 });
    }

    // Check if first login
    if (user.is_first_login) {
      return Response.json({ 
        needsPasswordChange: true,
        userId: user.id,
        email: user.email,
        message: 'Primeiro acesso detectado'
      }, { status: 200 });
    }

    // Normal login - return user data
    return Response.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      },
      subscription: {
        plan_type: subscription.plan_type,
        expires_at: subscription.expires_at
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});