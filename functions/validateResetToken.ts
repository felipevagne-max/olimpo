import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token é obrigatório' }, { status: 400 });
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Erro de configuração do servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find user with valid reset token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, reset_token_expires')
      .eq('reset_token', token)
      .single();

    if (userError || !user) {
      return Response.json({ error: 'Token inválido' }, { status: 400 });
    }

    // Check if token is expired
    if (new Date(user.reset_token_expires) < new Date()) {
      return Response.json({ error: 'Token expirado' }, { status: 400 });
    }

    return Response.json({ 
      success: true,
      userId: user.id,
      email: user.email
    });

  } catch (error) {
    console.error('Validate reset token error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});