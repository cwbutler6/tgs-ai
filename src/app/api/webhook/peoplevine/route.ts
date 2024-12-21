/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { DataAPIClient } from '@datastax/astra-db-ts';
import { OpenAI } from 'openai';
import { Member } from '@/types/member';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const astraClient = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN as string);
const db = astraClient.db(process.env.ASTRA_DB_API_ENDPOINT as string, {
  namespace: process.env.ASTRA_DB_KEYSPACE,
});

async function generateEmbedding(userData: any) {
  const userProfile = `
    Name: ${userData.name}
    Bio: ${userData.bio || ''}
    Interests: ${userData.interests?.join(', ') || ''}
    Location: ${userData.location || ''}
    Role: ${userData.role || ''}
  `.trim();

  const embedding = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: userProfile,
  });

  return embedding.data[0].embedding;
}

export async function POST(request: Request) {
  try {
    const { event, data } = await request.json();

    if (!event || !data) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    const collection = db.collection<Member>('members');

    if (event === 'user.created' || event === 'user.updated') {
      const embedding = await generateEmbedding(data);
      
      await collection.insertOne({
        ...data,
        embedding,
        last_updated: new Date().toISOString(),
      });

      return NextResponse.json({ message: 'Member updated successfully' });
    }

    if (event === 'user.deactivated') {
      await collection.deleteOne({ id: data.member_id });
      return NextResponse.json({ message: 'Member deleted successfully' });
    }

    return NextResponse.json(
      { error: 'Unsupported event type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
