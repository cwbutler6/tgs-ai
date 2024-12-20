export class PeopleVineClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, baseUrl = 'https://api.peoplevine.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`PeopleVine API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getMembers(params: {
    page?: number;
    pageSize?: number;
    status?: 'active' | 'inactive' | 'all';
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    
    queryParams.append('is_member', 'true');
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.status) queryParams.append('status', params.status);
    else queryParams.append('status', 'active');
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    return this.request(`/customers?${queryParams.toString()}`);
  }

  async getMember(memberId: string | number) {
    return this.request(`/customers/${memberId}`);
  }

  async getMemberProfile(memberId: string | number) {
    return this.request(`/customers/${memberId}/profile`);
  }

  async getMemberInterests(memberId: string | number) {
    return this.request(`/customers/${memberId}/interests`);
  }

  // Add more methods as needed for other PeopleVine endpoints
}
