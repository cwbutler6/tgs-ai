import { DataAPIClient } from '@datastax/astra-db-ts';
import { OpenAI } from 'openai';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const astraClient = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
const db = astraClient.db(process.env.ASTRA_DB_API_ENDPOINT);

async function loadCSVData(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true
  });
}

async function findDataByEmail(email, data) {
  return (
    data.find(
      (row) =>
        (row.email?.toLowerCase() === email.toLowerCase()) ||
        (row['Email']?.toLowerCase() === email.toLowerCase()) ||
        (row['Customer Email']?.toLowerCase() === email.toLowerCase()) ||
        (row['Email Address']?.toLowerCase() === email.toLowerCase())
    ) || null
  );
}

// Common phrases that should be kept together
const BUSINESS_INTEREST_PHRASES = [
  'AI & Tech',
  'Career Advancement & Leadership',
  'I am in the job market for a new role',
  'I am hiring and looking for qualified candidates',
  'Career Advancement',
  'Leadership',
  'Law',
  'Marketing',
  'Entrepreneurship'
];

function parseInterests(interestString, isBusinessInterest = false) {
  if (!interestString) return [];
  
  if (isBusinessInterest) {
    // For business interests, first try to match known phrases
    const interests = [];
    let remainingString = interestString;

    BUSINESS_INTEREST_PHRASES.forEach(phrase => {
      if (remainingString.includes(phrase)) {
        interests.push(phrase);
        remainingString = remainingString.replace(phrase, '');
      }
    });

    // Parse any remaining text for unknown interests
    const remainingInterests = remainingString
      .split(' ')
      .flatMap(interest => 
        interest
          .split(/(?=[A-Z])|\//)
          .map(s => s.trim())
          .filter(s => s && !['&', 'amp;'].includes(s))
      );

    return [...interests, ...remainingInterests].filter(Boolean);
  }

  // For social interests, use the original parsing logic
  return interestString
    .split(' ')
    .flatMap(interest => {
      return interest
        .split(/(?=[A-Z])|\//)
        .map(s => s.trim())
        .filter(s => s && !['&', 'amp;'].includes(s));
    });
}

async function generateEmbedding(
  userData,
  connectionsData,
  salesforceData,
  peopleVineData
) {
  const userProfile = `
    Name: ${userData.firstName} ${userData.lastName}
    Email: ${userData.email}
    Location: ${peopleVineData?.city || ''}
    Company: ${peopleVineData?.company_name || ''}
    Title: ${peopleVineData?.company_title || ''}
    Service Title: ${peopleVineData?.service_title || ''}
    
    Professional Interests: ${connectionsData?.interests?.business?.join(', ') || ''}
    Social Interests: ${connectionsData?.interests?.social?.join(', ') || ''}
    Services Offered: ${connectionsData?.services || ''}
    
    Mentorship:
    ${connectionsData?.mentorship?.mentorshipInfo || ''}
    
    Why Joined TGS: ${salesforceData?.whyJoin || ''}
    Additional Information: ${salesforceData?.additionalInfo || ''}
  `.trim();

  const embedding = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: userProfile,
  });

  return embedding.data[0].embedding;
}

async function importMembers() {
  try {
    console.log('Starting member import...');
    
    // Load all CSV data
    const peopleVineData = await loadCSVData(path.join(__dirname, 'data/PeopleVine.csv'));
    const connectionsFormData = await loadCSVData(path.join(__dirname, 'data/Connections Form.csv'));
    const salesforceData = await loadCSVData(path.join(__dirname, 'data/Salesforce.csv'));
    
    let totalProcessed = 0;
    
    // Process all members first
    const enrichedMembers = [];
    
    console.log('Processing member data...');
    for (const member of peopleVineData) {
      const connectionsData = await findDataByEmail(member.email, connectionsFormData);
      const sfData = await findDataByEmail(member.email, salesforceData);

      const processedConnectionsData = connectionsData ? {
        interests: {
          social: parseInterests(connectionsData['Please select your social interests. We will use this information to connect you with TGS members that share similar interests.']),
          business: parseInterests(connectionsData['Please select your business interests. We will use this information to connect you with TGS members that share similar interests.'], true)
        },
        newToCity: connectionsData['Are you new to your city?'] === 'Yes',
        services: connectionsData['Do you provide any services that you would like listed in our internal directory for potential client matches?'],
        mentorship: {
          wantsToBeMentor: connectionsData['Are you interested in being a mentor?'] === 'Yes',
          wantsToBeMentee: connectionsData['Are you interested in being a mentee?'] === 'Yes',
          mentorshipInfo: connectionsData['If you selected yes to being a mentor or mentee, please share more information about your areas of interest/experience.']
        }
      } : undefined;

      const processedSFData = sfData ? {
        whyJoin: sfData['Why do you want to be a member?'],
        additionalInfo: sfData['Additional Information']
      } : undefined;

      const metadata = {
        connectionsFormData: processedConnectionsData,
        salesforceData: processedSFData,
        peopleVineData: {
          birthdate: member.birthdate,
          city: member.city,
          companyTitle: member.company_title,
          serviceTitle: member.service_title,
          companyName: member.company_name,
          subscriptionStatus: member.subscription_status
        }
      };

      const enrichedMember = {
        email: member.email,
        firstName: member.first_name,
        lastName: member.last_name,
        profile: {
          location: member.city,
          company: member.company_name,
          title: member.company_title
        },
        metadata,
        lastUpdated: new Date().toISOString()
      };

      // Generate embedding for the member
      console.log(`Generating embedding for ${member.email}...`);
      const embedding = await generateEmbedding(
        enrichedMember,
        processedConnectionsData,
        processedSFData,
        metadata.peopleVineData
      );

      enrichedMembers.push({
        ...enrichedMember,
        $vector: embedding
      });

      totalProcessed++;
      if (totalProcessed % 10 === 0) {
        console.log(`Processed ${totalProcessed} members...`);
      }
    }

    // Now that all data is processed, drop and recreate the collection
    console.log('Dropping existing collection...');
    try {
      await db.dropCollection('members');
    } catch (error) {
      console.error('Error dropping collection:', error);
    }

    console.log('Creating new collection with vector search...');
    const collection = await db.createCollection('members', {
      vector: {
        dimension: 1536, // OpenAI ada-002 dimension
        metric: 'cosine'
      }
    });

    // Upload all processed members
    console.log('Uploading enriched members...');
    for (const member of enrichedMembers) {
      try {
        await collection.insertOne(member);
      } catch (error) {
        console.error(`Error uploading member ${member.email}:`, error);
      }
    }

    console.log(`Successfully processed and uploaded ${totalProcessed} members.`);
  } catch (error) {
    console.error('Error during import:', error);
  }
}

importMembers();
