import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
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

    // Verify user exists and has first login flag
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, is_first_login')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (!user.is_first_login) {
      return Response.json({ error: 'Operação não permitida' }, { status: 403 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and set is_first_login to false
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        is_first_login: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return Response.json({ error: 'Erro ao atualizar senha' }, { status: 500 });
    }

    return Response.json({ 
      success: true,
      message: 'Senha atualizada com sucesso'
    }, { status: 200 });

  } catch (error) {
    console.error('Change password error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});