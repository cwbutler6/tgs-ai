'use server';

import { OpenAI } from 'openai';
import { DataAPIClient } from '@datastax/astra-db-ts';
import { PeopleVineData } from '@/types/member';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const astraClient = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN as string);
const db = astraClient.db(process.env.ASTRA_DB_API_ENDPOINT as string, {
  namespace: process.env.ASTRA_DB_KEYSPACE,
});

export interface SearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profile?: {
    location?: string;
    company?: string;
    title?: string;
  };
  metadata?: {
    connectionsFormData?: {
      interests?: {
        social?: string[];
        business?: string[];
      };
      services?: string;
      mentorship?: {
        wantsToBeMentor?: boolean;
        wantsToBeMentee?: boolean;
        mentorshipInfo?: string;
      };
    };
    salesforceData?: {
      whyJoin?: string;
      additionalInfo?: string;
    };
    peopleVineData?: PeopleVineData;
  };
  matchReason?: string;
}

interface SearchResponse {
  results: SearchResult[];
  summary?: string;
}

export async function searchMembers(query: string): Promise<SearchResponse> {
  try {
    // Get vector embedding for the search query
    const embedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query,
    });

    // Search AstraDB with the embedding
    const collection = await db.collection('members');
    const cursor = await collection.find({}, {
      sort: {
        $vector: embedding.data[0].embedding
      },
      limit: 20
    });

    // Convert results to SearchResult type
    const dbResults = await cursor.toArray();
    const searchResults: SearchResult[] = dbResults.map(doc => ({
      id: doc.id || '',
      firstName: doc.firstName || '',
      lastName: doc.lastName || '',
      email: doc.email || '',
      profile: doc.profile,
      metadata: doc.metadata,
    }));

    // Generate personalized explanations using GPT
    const systemPrompt = `You are helping match members of The Gathering Spot, an exclusive community for professionals. 
    Given a search query and member profiles, explain why each member might be a good match. 
    Focus on relevant professional experience, shared interests, and potential synergies.
    Be concise but specific, mentioning key matching points.`;

    const memberDescriptions = searchResults.map(member => {
      const interests = [
        ...(member.metadata?.connectionsFormData?.interests?.business || []),
        ...(member.metadata?.connectionsFormData?.interests?.social || [])
      ];
      
      return `
        Name: ${member.firstName} ${member.lastName}
        Title: ${member.profile?.title || 'N/A'}
        Company: ${member.profile?.company || 'N/A'}
        Location: ${member.profile?.location || 'N/A'}
        Interests: ${interests.join(', ')}
        Services: ${member.metadata?.connectionsFormData?.services || 'N/A'}
        Mentorship Info: ${member.metadata?.connectionsFormData?.mentorship?.mentorshipInfo || 'N/A'}
      `;
    }).join('\n---\n');

    const userPrompt = `Search Query: "${query}"

    Here are the top matching members:
    ${memberDescriptions}

    For each member, provide a 1-2 sentence explanation of why they might be a good match for this query.
    Also provide a brief summary of the overall match results.
    
    Format your response as JSON with this structure:
    {
      "matches": [
        {
          "name": "member full name",
          "reason": "matching reason"
        }
      ],
      "summary": "overall summary"
    }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI response content was null');
    }
    const response = JSON.parse(content);

    // Merge LLM explanations with search results
    const enrichedResults = searchResults.map((result, index) => ({
      ...result,
      matchReason: response.matches[index]?.reason
    }));

    return {
      results: enrichedResults,
      summary: response.summary
    };

  } catch (error) {
    console.error('Error during search:', error);
    throw error;
  }
}
