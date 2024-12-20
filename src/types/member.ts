import { VectorDoc } from '@datastax/astra-db-ts';

export interface MemberProfile {
  location?: string;
  company?: string;
  title?: string;
}

export interface PeopleVineData {
  birthdate: string;
  city: string;
  companyTitle: string;
  serviceTitle: string;
  companyName: string;
  subscriptionStatus: string;
}

export interface ConnectionsFormData {
  interests: {
    social: string[];
    business: string[];
  };
  newToCity: boolean;
  services?: string;
  mentorship: {
    wantsToBeMentor: boolean;
    wantsToBeMentee: boolean;
    mentorshipInfo?: string;
  };
}

export interface SalesforceData {
  whyJoin?: string;
  additionalInfo?: string;
}

export interface MemberMetadata {
  connectionsFormData?: ConnectionsFormData;
  salesforceData?: SalesforceData;
  peopleVineData: PeopleVineData;
}

export interface Member extends VectorDoc {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  profile: MemberProfile;
  metadata: MemberMetadata;
  lastUpdated: string;
}
