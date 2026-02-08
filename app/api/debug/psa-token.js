import { NextResponse } from 'next/server';

export async function GET() {
  const PSA_ACCESS_TOKEN = process.env.PSA_ACCESS_TOKEN;
  const PSA_API_URL = process.env.PSA_API_URL;

  return NextResponse.json({
    debug: {
      hasToken: !!PSA_ACCESS_TOKEN,
      tokenLength: PSA_ACCESS_TOKEN?.length || 0,
      tokenPrefix: PSA_ACCESS_TOKEN ? PSA_ACCESS_TOKEN.substring(0, 4) + '...' : 'null',
      tokenSuffix: PSA_ACCESS_TOKEN ? '...' + PSA_ACCESS_TOKEN.substring(PSA_ACCESS_TOKEN.length - 4) : 'null',
      apiUrl: PSA_API_URL,
      nodeEnv: process.env.NODE_ENV,
      allEnvVars: Object.keys(process.env).filter(key => key.includes('PSA'))
    }
  });
}
