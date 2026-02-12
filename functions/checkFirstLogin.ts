import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email não fornecido' }, { status: 400 });
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Erro de configuração do servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, is_first_login')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Get subscription data
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single();

    return Response.json({ 
      user_id: user.id,
      is_first_login: user.is_first_login,
      subscription_status: subscription?.status || 'inactive'
    }, { status: 200 });

  } catch (error) {
    console.error('Check first login error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});