import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import * as bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    console.log('[WEBHOOK] Request received');
    const payload = await req.json();
    console.log('[WEBHOOK] Payload:', JSON.stringify(payload, null, 2));

    const eventType = payload.event || payload.type;
    const customer = payload.customer || {};
    const product = payload.product || {};
    
    const email = customer.email;
    const fullName = customer.name || customer.full_name;
    const productName = product.name;

    console.log('[WEBHOOK] Parsed data:', { eventType, email, fullName, productName });

    if (!email) {
      console.error('[WEBHOOK] Email not provided in payload');
      return Response.json({ error: 'Email not provided' }, { status: 400 });
    }

    // Initialize Supabase client
    console.log('[WEBHOOK] Initializing Supabase client');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[WEBHOOK] Missing Supabase credentials', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    console.log('[WEBHOOK] Supabase client created');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different event types
    if (eventType === 'purchase.approved' || eventType === 'subscription.created') {
      console.log('[WEBHOOK] Processing purchase/subscription event');
      
      // Determine plan type
      let planType = 'mensal';
      let expiresAt = new Date();

      if (productName?.toLowerCase().includes('anual')) {
        planType = 'anual';
        expiresAt.setDate(expiresAt.getDate() + 365);
      } else if (productName?.toLowerCase().includes('vitalicia') || productName?.toLowerCase().includes('vitalício')) {
        planType = 'vitalicio';
        expiresAt.setDate(expiresAt.getDate() + 36500); // 100 years
      } else {
        planType = 'mensal';
        expiresAt.setDate(expiresAt.getDate() + 30);
      }

      console.log('[WEBHOOK] Plan determined:', { planType, expiresAt: expiresAt.toISOString() });

      // Check if user exists
      console.log('[WEBHOOK] Checking if user exists:', email);
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      
      console.log('[WEBHOOK] User check result:', { exists: !!existingUser, error: userError?.message });

      let userId;

      if (existingUser) {
        // User exists
        userId = existingUser.id;
        console.log('[WEBHOOK] User already exists:', userId);

        // Update subscription
        console.log('[WEBHOOK] Updating subscription for user:', userId);
        const { error: updateError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan_type: planType,
            status: 'active',
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (updateError) {
          console.error('[WEBHOOK] Error updating subscription:', updateError);
          return Response.json({ error: 'Failed to update subscription', details: updateError.message }, { status: 500 });
        }

        console.log('[WEBHOOK] Subscription updated successfully for user:', userId);
      } else {
        // User does not exist - create new user
        console.log('[WEBHOOK] User does not exist, creating new user');
        console.log('[WEBHOOK] Hashing password...');
        const hashedPassword = await bcrypt.hash('Olimpo12345', 10);
        console.log('[WEBHOOK] Password hashed');

        console.log('[WEBHOOK] Creating user in database...');
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: email,
            password: hashedPassword,
            full_name: fullName || email.split('@')[0],
            is_first_login: true,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (createError) {
          console.error('[WEBHOOK] Error creating user:', createError);
          return Response.json({ error: 'Failed to create user', details: createError.message }, { status: 500 });
        }

        userId = newUser.id;
        console.log('[WEBHOOK] New user created successfully:', userId);

        // Create subscription
        console.log('[WEBHOOK] Creating subscription for new user:', userId);
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_type: planType,
            status: 'active',
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
          });

        if (subError) {
          console.error('[WEBHOOK] Error creating subscription:', subError);
          return Response.json({ error: 'Failed to create subscription', details: subError.message }, { status: 500 });
        }

        console.log('[WEBHOOK] Subscription created successfully for user:', userId);
      }

      console.log('[WEBHOOK] Process completed successfully');
      return Response.json({ 
        success: true, 
        message: 'User processed',
        user_id: userId,
        plan_type: planType
      }, { status: 200 });
    } 
    
    else if (eventType === 'subscription.canceled') {
      console.log('[WEBHOOK] Processing subscription.canceled event');
      // Find user and update subscription status
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (!user) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error canceling subscription:', updateError);
        return Response.json({ error: 'Failed to cancel subscription' }, { status: 500 });
      }

      return Response.json({ 
        success: true, 
        message: 'Subscription canceled' 
      }, { status: 200 });
    }
    
    else if (eventType === 'subscription.expired') {
      console.log('[WEBHOOK] Processing subscription.expired event');
      // Find user and update subscription status
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (!user) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error expiring subscription:', updateError);
        return Response.json({ error: 'Failed to expire subscription' }, { status: 500 });
      }

      return Response.json({ 
        success: true, 
        message: 'Subscription expired' 
      }, { status: 200 });
    }
    
    else {
      // Unknown event type
      console.log(`Unhandled event type: ${eventType}`);
      return Response.json({ 
        success: true, 
        message: 'Event received but not processed' 
      }, { status: 200 });
    }

  } catch (error) {
    console.error('[WEBHOOK] Fatal error:', error);
    console.error('[WEBHOOK] Error stack:', error.stack);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});