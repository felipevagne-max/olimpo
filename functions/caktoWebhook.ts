import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import bcrypt from 'npm:bcryptjs@2.4.3';
import { createClientAsServiceRole } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    console.log('[STEP 1] Parsing payload...');
    const payload = await req.json();
    console.log('[STEP 2] Payload recebido:', JSON.stringify(payload, null, 2));

    const eventType = payload.event || payload.type;
    console.log('[STEP 3] Event type:', eventType);
    
    const customer = payload.data?.customer || {};
    const product = payload.data?.product || {};
    console.log('[STEP 4] Customer:', JSON.stringify(customer, null, 2));
    console.log('[STEP 5] Product:', JSON.stringify(product, null, 2));
    
    const email = customer.email;
    const fullName = customer.name || customer.full_name;
    const productName = product.name;
    console.log('[STEP 6] Extracted data:', { email, fullName, productName });

    if (!email) {
      console.error('[ERROR] Email not provided');
      return Response.json({ error: 'Email not provided' }, { status: 400 });
    }

    // Initialize Supabase client
    console.log('[STEP 7] Initializing Supabase...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[ERROR] Missing Supabase credentials');
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[STEP 8] Supabase client created');

    // Handle different event types
    console.log('[STEP 9] Processing event type:', eventType);
    if (eventType === 'purchase_approved' || eventType === 'purchase.approved' || eventType === 'subscription.created' || eventType === 'subscription_created') {
      console.log('[STEP 10] Event is purchase/subscription');
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

      console.log('[STEP 11] Plan type determined:', planType);

      // Check if user exists
      console.log('[STEP 12] Checking if user exists:', email);
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      
      console.log('[STEP 13] User check result:', { exists: !!existingUser, hasError: !!userError });

      let userId;

      if (existingUser) {
        // User exists
        userId = existingUser.id;
        console.log('[STEP 14] User already exists:', userId);

        // Update subscription
        console.log('[STEP 15] Updating subscription...');
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
          console.error('[ERROR] Error updating subscription:', updateError);
          return Response.json({ error: 'Failed to update subscription', details: updateError.message }, { status: 500 });
        }

        console.log('[STEP 16] Subscription updated successfully');
      } else {
        // User does not exist - create new user in Supabase
        console.log('[STEP 14] User does not exist, creating in Supabase...');
        console.log('[STEP 15] Hashing password...');
        const hashedPassword = await bcrypt.hash('Olimpo12345', 10);
        console.log('[STEP 16] Password hashed');

        console.log('[STEP 17] Inserting user in Supabase...');
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
          console.error('[ERROR] Error creating user in Supabase:', createError);
          return Response.json({ error: 'Failed to create user', details: createError.message }, { status: 500 });
        }

        userId = newUser.id;
        console.log('[STEP 18] New user created in Supabase:', userId);

        // Create subscription in Supabase
        console.log('[STEP 19] Creating subscription in Supabase...');
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
          console.error('[ERROR] Error creating subscription:', subError);
          return Response.json({ error: 'Failed to create subscription', details: subError.message }, { status: 500 });
        }

        console.log('[STEP 20] Subscription created successfully in Supabase');

        // Create user in Base44 (for login)
        console.log('[STEP 21] Creating user in Base44...');
        try {
          const base44Service = createClientAsServiceRole(Deno.env.get('BASE44_APP_ID'));
          await base44Service.users.inviteUser(email, 'user');
          console.log('[STEP 22] User created in Base44 successfully (no email sent)');
        } catch (base44Error) {
          console.error('[ERROR] Error creating user in Base44:', base44Error.message);
          console.log('[WARNING] User created in Supabase but not in Base44');
        }
      }

      console.log('[SUCCESS] Process completed successfully');
      return Response.json({ 
        success: true, 
        message: 'User processed',
        user_id: userId,
        plan_type: planType
      }, { status: 200 });
    } 
    
    else if (eventType === 'subscription.canceled') {
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
    console.error('ERRO FATAL:', error.message);
    console.error('Stack trace:', error.stack);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});