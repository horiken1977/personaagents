import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const personas = await import('@/personas.json');
    return NextResponse.json(personas.default);
  } catch (error) {
    return NextResponse.json(
      { error: 'Personas data file not found' },
      { status: 404 }
    );
  }
}