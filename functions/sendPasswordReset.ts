import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Erro de configuração do servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      // Don't reveal if email exists or not (security)
      return Response.json({ 
        success: true,
        message: 'Se o email existe, um link de reset foi enviado'
      });
    }

    // Generate reset token (random 32 char string)
    const resetToken = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Store reset token in Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token: resetToken,
        reset_token_expires: resetTokenExpires
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error storing reset token:', updateError);
      return Response.json({ error: 'Erro ao processar reset de senha' }, { status: 500 });
    }

    // Send email with reset link
    const base44 = createClientFromRequest(req);
    const resetLink = `${Deno.env.get('APP_URL') || 'https://olimpo.app'}/Auth?reset=${resetToken}`;

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: 'Redefinir sua senha - Olimpo',
      body: `Olá,\n\nVocê solicitou para redefinir sua senha. Clique no link abaixo para criar uma nova senha:\n\n${resetLink}\n\nEste link expira em 24 horas.\n\nSe você não solicitou isso, ignore este email.\n\nAtenciosamente,\nOlimpo`
    });

    return Response.json({ 
      success: true,
      message: 'Se o email existe, um link de reset foi enviado'
    });

  } catch (error) {
    console.error('Send password reset error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});