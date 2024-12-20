import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchForm } from '@/components/search-form';
import { searchMembers, SearchResult } from './actions';
import { Badge } from '@/components/ui/badge';

interface SearchState {
  results: SearchResult[];
  searched: boolean;
  summary?: string;
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q : undefined;
  
  const searchState: SearchState = {
    results: [],
    searched: false
  };
  
  if (query) {
    const { results, summary } = await searchMembers(query);
    searchState.results = results;
    searchState.searched = true;
    searchState.summary = summary;
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8 text-center">The Gathering Spot Member Search</h1>
      
      <div className="max-w-2xl mx-auto space-y-4">
        <SearchForm />

        {searchState.searched && searchState.results.length === 0 && (
          <p className="text-center text-gray-500">No results found</p>
        )}

        {searchState.results.length > 0 && (
          <div className="space-y-4">
            {searchState.summary && (
              <div className="bg-muted p-4 rounded-lg mb-6">
                <p className="text-sm text-muted-foreground">{searchState.summary}</p>
              </div>
            )}
            
            <div className="grid gap-4">
              {searchState.results.map((result) => (
                <Card key={result.id}>
                  <CardHeader>
                    <CardTitle>{result.firstName} {result.lastName}</CardTitle>
                    <div className="text-sm text-gray-500">
                      {result.profile?.title && (
                        <p key="title">{result.profile.title}</p>
                      )}
                      {result.profile?.company && (
                        <p key="company">{result.profile.company}</p>
                      )}
                      {result.profile?.location && (
                        <p key="location">{result.profile.location}</p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {result.matchReason && (
                      <div className="mb-4 p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">{result.matchReason}</p>
                      </div>
                    )}
                    
                    {result.metadata?.connectionsFormData?.services && (
                      <div key="services" className="mb-4">
                        <p className="font-semibold text-sm mb-1">Services Offered:</p>
                        <p className="text-sm text-gray-600">{result.metadata.connectionsFormData.services}</p>
                      </div>
                    )}
                    
                    {result.metadata?.connectionsFormData?.interests && (
                      <div key="interests" className="space-y-2">
                        {result?.metadata?.connectionsFormData?.interests?.business?.filter?.(Boolean).filter(i => i !== '&')?.length || 0 > 0 && (
                          <div key="business-interests">
                            <p className="text-sm font-semibold">Professional Interests:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {result?.metadata?.connectionsFormData?.interests?.business?.filter(Boolean)
                                .filter(i => i !== '&')
                                .map((interest, index) => (
                                  <Badge 
                                    key={`business-${interest}-${index}`} 
                                    variant="secondary"
                                  >
                                    {interest}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        )}
                        
                        {result?.metadata?.connectionsFormData?.interests?.social?.filter(Boolean).filter(i => i !== '&').length || 0 > 0 && (
                          <div key="social-interests">
                            <p className="text-sm font-semibold">Social Interests:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {result?.metadata?.connectionsFormData?.interests?.social?.filter(Boolean)
                                .filter(i => i !== '&')
                                .map((interest, index) => (
                                  <Badge 
                                    key={`social-${interest}-${index}`} 
                                    variant="secondary"
                                  >
                                    {interest}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {result.metadata?.connectionsFormData?.mentorship && (
                      <div key="mentorship" className="mt-4">
                        <p className="text-sm font-semibold">Mentorship:</p>
                        {result.metadata.connectionsFormData.mentorship.mentorshipInfo && (
                          <p key="mentorship-info" className="text-sm text-gray-600 mt-1">
                            {result.metadata.connectionsFormData.mentorship.mentorshipInfo}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {result.metadata.connectionsFormData.mentorship.wantsToBeMentor && (
                            <Badge key="mentor">Mentor</Badge>
                          )}
                          {result.metadata.connectionsFormData.mentorship.wantsToBeMentee && (
                            <Badge key="mentee">Mentee</Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {result.metadata?.salesforceData?.whyJoin && (
                      <div key="why-join" className="mt-4">
                        <p className="text-sm font-semibold">Why I Joined TGS:</p>
                        <p className="text-sm text-gray-600 mt-1">{result.metadata.salesforceData.whyJoin}</p>
                      </div>
                    )}

                    {result.metadata?.peopleVineData && (
                      <div key="peoplevine" className="mt-4 text-sm text-gray-500">
                        {result.metadata.peopleVineData.serviceTitle && (
                          <p>Service: {result.metadata.peopleVineData.serviceTitle}</p>
                        )}
                        {result.metadata.peopleVineData.companyTitle && (
                          <p>Role: {result.metadata.peopleVineData.companyTitle}</p>
                        )}
                        {result.metadata.peopleVineData.companyName && (
                          <p>Company: {result.metadata.peopleVineData.companyName}</p>
                        )}
                        {result.metadata.peopleVineData.city && (
                          <p>Location: {result.metadata.peopleVineData.city}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
