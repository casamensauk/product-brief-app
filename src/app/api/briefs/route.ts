import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientName, contactEmail, projectName } = body;
    
    const shareToken = randomBytes(16).toString('hex');
    
    const brief = await prisma.projectBrief.create({
      data: {
        clientName,
        contactEmail,
        projectName,
        shareToken,
        status: 'DRAFT'
      }
    });
    
    return NextResponse.json(brief);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create brief' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const briefs = await prisma.projectBrief.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json(briefs);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch briefs' }, { status: 500 });
  }
}
