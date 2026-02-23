import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return Response.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 });
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
      .select('id, reset_token_expires')
      .eq('reset_token', token)
      .single();

    if (userError || !user) {
      return Response.json({ error: 'Token inválido' }, { status: 400 });
    }

    // Check if token is expired
    if (new Date(user.reset_token_expires) < new Date()) {
      return Response.json({ error: 'Token expirado' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        reset_token: null,
        reset_token_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error resetting password:', updateError);
      return Response.json({ error: 'Erro ao redefinir senha' }, { status: 500 });
    }

    return Response.json({ 
      success: true,
      message: 'Senha redefinida com sucesso'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});