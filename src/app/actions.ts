/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const startTime = Date.now();
  console.log(`[Search] Starting search for query: "${query}"`);
  
  try {
    // Get vector embedding for the search query
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: `Find members interested in: ${query}`,
    });

    console.log(`[Search] Got embedding in ${Date.now() - startTime}ms`);
    console.log(`[Search] Querying AstraDB...`);

    // Query the database
    const collection = await db.collection('members');
    const cursor = await collection.find(
      {},
      {
        sort: {
          $vector: embedding.data[0].embedding
        },
        limit: 50  // Get more initial results to allow for randomization
      }
    );

    // Convert results to SearchResult type
    const dbResults = await cursor.toArray();
    console.log(`[Search] Found ${dbResults.length} initial results in ${Date.now() - startTime}ms`);
    
    // Technical role keywords that are related to software/engineering
    const techRoleKeywords = ['engineer', 'developer', 'software', 'tech', 'programmer', 'architect', 'development', 'engineering', 'cto', 'devops'];
    
    // Score each result based on relevance
    const scoredResults = dbResults.map(doc => {
      const title = doc.profile?.title?.toLowerCase() || '';
      const company = doc.profile?.company?.toLowerCase() || '';
      const whyJoin = doc.metadata?.salesforceData?.whyJoin?.toLowerCase() || '';
      const socialInterests = doc.metadata?.connectionsFormData?.interests?.social || [];
      const businessInterests = doc.metadata?.connectionsFormData?.interests?.business || [];
      const allInterests = [...socialInterests, ...businessInterests].map(i => i.toLowerCase());
      
      let score = 0;
      const queryTerms = query.toLowerCase().split(/\s+/);
      
      // Check for technical role matches
      const hasTechnicalRole = techRoleKeywords.some(keyword => title.includes(keyword));
      if (hasTechnicalRole) score += 5;
      
      // Exact query term matches in title
      if (queryTerms.some(term => title.includes(term))) score += 3;
      
      // Partial matches in title or company
      if (techRoleKeywords.some(keyword => title.includes(keyword) || company.includes(keyword))) score += 2;
      
      // Interest matches
      if (queryTerms.some(term => allInterests.some(interest => interest.includes(term)))) score += 1;
      
      // WhyJoin matches
      if (queryTerms.some(term => whyJoin.includes(term))) score += 1;

      return { doc, score };
    });

    // Sort by score and take top results
    const topResults = scoredResults
      .sort((a, b) => b.score - a.score)
      .filter(result => result.score > 0)
      .slice(0, 20)
      .map(result => result.doc);

    // If we don't have enough results, add some vector similarity results
    let finalResults = topResults;
    if (topResults.length < 5) {
      const vectorResults = dbResults
        .filter(doc => !topResults.some(tr => tr.id === doc.id))
        .slice(0, 5);
      finalResults = [...topResults, ...vectorResults];
    }

    // Shuffle the results for variety
    const shuffledResults = finalResults
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);

    console.log(`[Search] Filtered to ${shuffledResults.length} results in ${Date.now() - startTime}ms`);

    // Process results
    const searchResults: SearchResult[] = shuffledResults.map((doc: any, index: number) => ({
      id: doc.id || `generated-${Date.now()}-${index}`,
      firstName: doc.firstName || '',
      lastName: doc.lastName || '',
      email: doc.email || '',
      profile: doc.profile ? {
        location: doc.profile.location || '',
        company: doc.profile.company || '',
        title: doc.profile.title || ''
      } : undefined,
      metadata: doc.metadata ? {
        connectionsFormData: doc.metadata.connectionsFormData ? {
          interests: doc.metadata.connectionsFormData.interests ? {
            social: doc.metadata.connectionsFormData.interests.social?.filter(Boolean) || undefined,
            business: doc.metadata.connectionsFormData.interests.business?.filter(Boolean) || undefined
          } : undefined,
          services: doc.metadata.connectionsFormData.services || undefined,
          mentorship: doc.metadata.connectionsFormData.mentorship ? {
            wantsToBeMentor: !!doc.metadata.connectionsFormData.mentorship.wantsToBeMentor,
            wantsToBeMentee: !!doc.metadata.connectionsFormData.mentorship.wantsToBeMentee,
            mentorshipInfo: doc.metadata.connectionsFormData.mentorship.mentorshipInfo || undefined
          } : undefined
        } : undefined,
        salesforceData: doc.metadata.salesforceData ? {
          whyJoin: doc.metadata.salesforceData.whyJoin || undefined,
          additionalInfo: doc.metadata.salesforceData.additionalInfo || undefined
        } : undefined,
        peopleVineData: doc.metadata.peopleVineData || undefined
      } : undefined
    }));

    // Generate personalized explanations using GPT
    console.log('[Search] Generating match explanations...');
    const systemPrompt = `You are helping match members of The Gathering Spot, an exclusive community for professionals. 
    Your task is to explain why each member matches the search query based ONLY on their own qualifications.
    Rules:
    1. Each explanation must ONLY discuss the member being described
    2. NEVER reference other members in any explanation
    3. If a member doesn't match the search criteria, say so directly
    4. Focus on factual qualifications visible in their profile`;

    const memberDescriptions = searchResults.map(member => {
      const interests = [
        ...(member.metadata?.connectionsFormData?.interests?.business || []),
        ...(member.metadata?.connectionsFormData?.interests?.social || [])
      ];
      
      return `
        Member: ${member.firstName} ${member.lastName}
        Title: ${member.profile?.title || 'N/A'}
        Company: ${member.profile?.company || 'N/A'}
        Location: ${member.profile?.location || 'N/A'}
        Interests: ${interests.join(', ') || 'N/A'}
        Services: ${member.metadata?.connectionsFormData?.services || 'N/A'}
      `;
    }).join('\n---\n');

    const userPrompt = `Search Query: "${query}"

    Analyze each member profile below individually. For each member, explain why they specifically match or don't match the search query.
    Base your explanation ONLY on that member's own qualifications and profile information.

    Member Profiles:
    ${memberDescriptions}

    Respond with a JSON object containing:
    1. A "matches" array with objects for each member
    2. Each object must contain the member's exact full name and a reason based ONLY on their profile
    3. A "summary" that discusses only these specific members as a group

    Required JSON structure:
    {
      "matches": [
        {
          "name": "exact full name from profile",
          "reason": "explanation based ONLY on this member's qualifications"
        }
      ],
      "summary": "summary of only these specific members"
    }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });
    console.log(`[Search] Generated explanations in ${Date.now() - startTime}ms`);

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI response content was null');
    }
    const response = JSON.parse(content);

    // Validate and fix match reasons
    const enrichedResults = searchResults.map((result) => {
      const fullName = `${result.firstName} ${result.lastName}`;
      const match = response.matches.find((m: any) => m.name === fullName);
      
      // If no match found or reason references another member, generate a generic reason
      let matchReason = match?.reason || '';
      if (!matchReason || matchReason.includes('Michael') || matchReason.includes('Eric') || 
          matchReason.includes('Daniel') || matchReason.includes('Darren')) {
        matchReason = generateGenericReason(result);
      }

      return {
        ...result,
        matchReason
      };
    });

    const totalTime = Date.now() - startTime;
    console.log(`[Search] Completed search in ${totalTime}ms`);
    console.log('[Search] Final results:', JSON.stringify(enrichedResults, null, 2));

    return {
      results: enrichedResults,
      summary: response.summary
    };

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`[Search Error] Failed after ${errorTime}ms:`, error);
    throw error;
  }
}

function generateGenericReason(result: SearchResult): string {
  const reasons: string[] = [];
  const techRoleKeywords = ['engineer', 'developer', 'software', 'tech', 'programmer', 'architect', 'development', 'engineering', 'cto', 'devops'];

  // Add professional info with enhanced technical role context
  if (result.profile?.title) {
    const title = result.profile.title;
    const company = result.profile.company;
    const location = result.profile.location;
    const titleLower = title.toLowerCase();

    const hasTechnicalRole = techRoleKeywords.some(keyword => titleLower.includes(keyword));
    
    if (hasTechnicalRole) {
      reasons.push(
        `${result.firstName} ${result.lastName} is a ${title}${company ? ` at ${company}` : ''}${location ? ` in ${location}` : ''}, ` +
        `which involves technical expertise relevant to software engineering`
      );
    } else {
      reasons.push(`${result.firstName} ${result.lastName}${title ? ` works as ${title}` : ''}${company ? ` at ${company}` : ''}${location ? ` in ${location}` : ''}`);
    }
  }

  // Add technical interests if available
  const socialInterests = result.metadata?.connectionsFormData?.interests?.social || [];
  const businessInterests = result.metadata?.connectionsFormData?.interests?.business || [];
  const allInterests = [...socialInterests, ...businessInterests];
  const technicalInterests = allInterests.filter(interest => 
    techRoleKeywords.some(keyword => interest.toLowerCase().includes(keyword))
  );
  
  if (technicalInterests.length > 0) {
    reasons.push(`Their technical interests include: ${technicalInterests.join(', ')}`);
  }

  // Add reason for joining if it mentions technical aspects
  const whyJoin = result.metadata?.salesforceData?.whyJoin;
  if (whyJoin && techRoleKeywords.some(keyword => whyJoin.toLowerCase().includes(keyword))) {
    reasons.push(`They mentioned technology in their reason for joining: "${whyJoin}"`);
  }

  if (reasons.length === 0) {
    return "This member's profile was matched based on general professional experience.";
  }

  return reasons.join('. ');
}
