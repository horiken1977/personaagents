import { NextRequest, NextResponse } from 'next/server';

// APIキーの取得関数
function getApiKey(provider: string): string | undefined {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'claude':
      return process.env.ANTHROPIC_API_KEY;
    case 'gemini':
      return process.env.GOOGLE_AI_API_KEY;
    default:
      return undefined;
  }
}

// レート制限のシンプルな実装
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1分
  const maxRequests = 60;

  if (!rateLimitMap.has(clientIP)) {
    rateLimitMap.set(clientIP, []);
  }

  const requests = rateLimitMap.get(clientIP)!;
  const validRequests = requests.filter(time => now - time < windowMs);
  
  if (validRequests.length >= maxRequests) {
    return false;
  }

  validRequests.push(now);
  rateLimitMap.set(clientIP, validRequests);
  return true;
}

// GETリクエストの処理
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'get_api_keys') {
      // APIキーの存在確認（キー自体は返さない）
      const hasKeys = {
        openai: !!getApiKey('openai'),
        claude: !!getApiKey('claude'),
        gemini: !!getApiKey('gemini')
      };
      return NextResponse.json(hasKeys);
    }

    if (action === 'get_categories') {
      // personas.jsonから読み込み
      try {
        const personas = await import('@/personas.json');
        if (personas.default && personas.default.categories) {
          return NextResponse.json(personas.default.categories);
        } else {
          return NextResponse.json({ error: 'Invalid personas data structure' }, { status: 500 });
        }
      } catch (error) {
        return NextResponse.json({ error: 'Personas data file not found' }, { status: 404 });
      }
    }

    if (action === 'get_personas') {
      const categoryId = searchParams.get('category');
      if (!categoryId) {
        return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
      }

      try {
        const personas = await import('@/personas.json');
        if (personas.default && personas.default.categories) {
          const category = personas.default.categories.find((c: any) => c.id === categoryId);
          if (category) {
            return NextResponse.json(category.personas);
          } else {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
          }
        }
      } catch (error) {
        return NextResponse.json({ error: 'Personas data file not found' }, { status: 404 });
      }
    }

    // デフォルトのレスポンス
    return NextResponse.json({
      status: 'success',
      message: 'API is working',
      timestamp: new Date().toISOString(),
      method: 'GET'
    });

  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POSTリクエストの処理
export async function POST(request: NextRequest) {
  try {
    console.log('POST request received:', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    });

    // レート制限チェック
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.log('Client IP:', clientIP);
    
    if (!checkRateLimit(clientIP)) {
      console.log('Rate limit exceeded for IP:', clientIP);
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    console.log('Request body:', body);

    // 基本的な検証
    if (!body.provider || !body.prompt) {
      return NextResponse.json(
        { error: 'Provider and prompt are required' },
        { status: 400 }
      );
    }

    // テストモード
    if (body.test === true) {
      return NextResponse.json({
        success: true,
        response: 'Test successful',
        provider: body.provider,
        timestamp: new Date().toISOString()
      });
    }

    // APIキーの確認
    const apiKey = getApiKey(body.provider);
    if (!apiKey) {
      return NextResponse.json(
        { error: `API key not configured for ${body.provider}` },
        { status: 400 }
      );
    }

    // LLM API呼び出し
    let response: string;

    switch (body.provider) {
      case 'openai':
        response = await callOpenAI(body.prompt, apiKey);
        break;
      case 'claude':
        response = await callClaude(body.prompt, apiKey);
        break;
      case 'gemini':
        response = await callGemini(body.prompt, apiKey);
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported provider' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      response: response,
      provider: body.provider,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('POST Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

// OpenAI API呼び出し
async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Claude API呼び出し
async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// Gemini API呼び出し
async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// OPTIONSリクエストの処理（CORS対応）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}