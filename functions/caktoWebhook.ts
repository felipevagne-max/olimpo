import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import * as bcrypt from 'npm:bcrypt@5.1.1';

Deno.serve(async (req) => {
  try {
    // Parse webhook payload
    const payload = await req.json();
    console.log('Cakto Webhook received:', JSON.stringify(payload, null, 2));

    const eventType = payload.event || payload.type;
    const customer = payload.customer || {};
    const product = payload.product || {};
    
    const email = customer.email;
    const fullName = customer.name || customer.full_name;
    const productName = product.name;

    if (!email) {
      return Response.json({ error: 'Email not provided' }, { status: 400 });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different event types
    if (eventType === 'purchase.approved' || eventType === 'subscription.created') {
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

      // Check if user exists
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      let userId;

      if (existingUser) {
        // User exists
        userId = existingUser.id;
        console.log(`User already exists: ${userId}`);

        // Update subscription
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
          console.error('Error updating subscription:', updateError);
          return Response.json({ error: 'Failed to update subscription' }, { status: 500 });
        }

        console.log(`Subscription updated for user ${userId}`);
      } else {
        // User does not exist - create new user
        const hashedPassword = await bcrypt.hash('Olimpo12345', 10);

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
          console.error('Error creating user:', createError);
          return Response.json({ error: 'Failed to create user' }, { status: 500 });
        }

        userId = newUser.id;
        console.log(`New user created: ${userId}`);

        // Create subscription
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
          console.error('Error creating subscription:', subError);
          return Response.json({ error: 'Failed to create subscription' }, { status: 500 });
        }

        console.log(`Subscription created for user ${userId}`);
      }

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
    console.error('Webhook error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});