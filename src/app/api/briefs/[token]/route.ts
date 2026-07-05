import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const brief = await prisma.projectBrief.findUnique({
      where: { shareToken: token }
    });
    
    if (!brief) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json(brief);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch brief' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const body = await req.json();
    
    const brief = await prisma.projectBrief.update({
      where: { shareToken: token },
      data: {
        ...body
      }
    });
    
    return NextResponse.json(brief);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update brief' }, { status: 500 });
  }
}
