import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Gem costs for AI operations
const AI_OP_COSTS = {
  improve:   2,
  rewrite:   3,
  expand:    2,
  shorten:   2,
  change_mood: 2,
  change_location: 2,
  change_dialogue: 2,
  change_transition: 1,
};

async function callOpenAI(apiKey, systemPrompt, userPrompt, model = 'gpt-4o-mini') {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
      temperature: 0.75,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content returned from OpenAI');
  return JSON.parse(content);
}

function resolveModel(role) {
  if (role === 'admin' || role === 'elite' || role === 'premium') return 'gpt-4o';
  return 'gpt-4o-mini';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, scene, project_context, param } = body;

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return Response.json({ error: 'OpenAI API key not configured' }, { status: 500 });

    const role = (user.role || 'free').toLowerCase();
    const model = resolveModel(role);
    const gemCost = AI_OP_COSTS[action] ?? 2;
    const balance = user.gems_balance ?? 0;

    // Gem check (skip for admin)
    if (role !== 'admin') {
      if (balance < gemCost) {
        return Response.json({
          error: `Not enough gems. Need ${gemCost} 💎, have ${balance}.`,
          insufficient_gems: true,
          balance,
          cost: gemCost,
        }, { status: 402 });
      }
      // Deduct gems upfront
      await base44.auth.updateMe({ gems_balance: balance - gemCost });
    }

    const systemPrompt = `You are a professional cinematic script editor for AI film production.
You edit individual scenes from a larger production blueprint.
Always respond with valid JSON matching the scene structure provided.
Preserve what was not asked to change. Be creative but maintain story consistency.
Project context: ${project_context || 'A cinematic production.'}`;

    const sceneStr = JSON.stringify(scene, null, 2);

    let userPrompt = '';
    switch (action) {
      case 'improve':
        userPrompt = `Improve the overall quality, clarity, and cinematic impact of this scene. Keep the core story beat but make it more vivid and professional.\n\nScene:\n${sceneStr}\n\nReturn the full improved scene as JSON with the same fields.`;
        break;
      case 'rewrite':
        userPrompt = `Completely rewrite this scene from scratch, keeping the same scene number and basic story purpose but with fresh creative direction.\n\nScene:\n${sceneStr}\n\nReturn the full rewritten scene as JSON with the same fields.`;
        break;
      case 'expand':
        userPrompt = `Expand this scene with more detail — richer visual description, deeper character moments, more atmospheric detail. Make the script_text longer and more immersive.\n\nScene:\n${sceneStr}\n\nReturn the full expanded scene as JSON with the same fields.`;
        break;
      case 'shorten':
        userPrompt = `Shorten this scene to its essential elements. Keep the key story beat but trim excess. Make it punchy and concise.\n\nScene:\n${sceneStr}\n\nReturn the shortened scene as JSON with the same fields.`;
        break;
      case 'change_mood':
        userPrompt = `Change the mood/tone of this scene to: "${param || 'dramatic'}". Update the script, visual summary, mood field, and any relevant cinematic directions accordingly.\n\nScene:\n${sceneStr}\n\nReturn the updated scene as JSON with the same fields.`;
        break;
      case 'change_location':
        userPrompt = `Change the location of this scene to: "${param || 'a different setting'}". Update the script, visual summary, location_detected field, and camera direction to match the new setting.\n\nScene:\n${sceneStr}\n\nReturn the updated scene as JSON with the same fields.`;
        break;
      case 'change_dialogue':
        userPrompt = `Rewrite the dialogue and character interactions in this scene. Keep the same characters and story beat but use completely different lines and delivery.\n\nScene:\n${sceneStr}\n\nReturn the updated scene as JSON with the same fields.`;
        break;
      case 'change_transition':
        userPrompt = `Change the transition to the next scene to: "${param || 'a cinematic transition'}". Update only the transition_to_next field and make it feel natural.\n\nScene:\n${sceneStr}\n\nReturn the updated scene as JSON with the same fields.`;
        break;
      default:
        if (role !== 'admin') await base44.auth.updateMe({ gems_balance: balance }); // refund
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    let result;
    try {
      result = await callOpenAI(apiKey, systemPrompt, userPrompt, model);
    } catch (e) {
      // Refund on failure
      if (role !== 'admin') {
        await base44.auth.updateMe({ gems_balance: balance });
        await base44.asServiceRole.entities.GemTransaction.create({
          user_email: user.email,
          user_id: user.id,
          plan_name: role,
          action_key: `scene_ai_refund`,
          action_label: `Refund: failed AI scene edit (${action})`,
          action_category: 'text',
          gems_deducted: 0,
          gems_refunded: gemCost,
          balance_before: balance - gemCost,
          balance_after: balance,
          status: 'refunded',
        });
      }
      console.error('[SceneEditor] AI call failed:', e.message);
      return Response.json({ error: e.message || 'AI operation failed' }, { status: 500 });
    }

    // Log transaction
    if (role !== 'admin') {
      await base44.asServiceRole.entities.GemTransaction.create({
        user_email: user.email,
        user_id: user.id,
        plan_name: role,
        action_key: `scene_ai_${action}`,
        action_label: `AI Scene Edit: ${action} (scene ${scene?.scene_number ?? '?'})`,
        action_category: 'text',
        gems_deducted: gemCost,
        gems_refunded: 0,
        balance_before: balance,
        balance_after: balance - gemCost,
        status: 'success',
      });
    }

    console.log(`[SceneEditor] ${action} on scene ${scene?.scene_number} | user: ${user.email} | cost: ${gemCost} gems`);

    return Response.json({
      success: true,
      scene: result,
      gems_deducted: role !== 'admin' ? gemCost : 0,
    });

  } catch (error) {
    console.error('[SceneEditor] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});