export type BusinessEntityType =
  | "sole_proprietorship"
  | "llc"
  | "corporation"
  | "s_corp"
  | "partnership"
  | "nonprofit";

export type PermitStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "approved"
  | "denied"
  | "expired"
  | "renewal_needed";

export type DeadlineType =
  | "application"
  | "renewal"
  | "inspection"
  | "payment"
  | "document_submission"
  | "hearing";

export type SubscriptionTier = "free" | "starter" | "professional" | "enterprise";

export type DocumentType =
  | "application_form"
  | "supporting_document"
  | "certificate"
  | "license"
  | "inspection_report"
  | "correspondence"
  | "receipt";

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfile {
  id: string;
  organization_id: string;
  business_name: string;
  entity_type: BusinessEntityType;
  industry: string;
  naics_code: string | null;
  description: string | null;
  employee_count: number;
  annual_revenue_range: string | null;
  street_address: string;
  city: string;
  county: string | null;
  state: string;
  zip_code: string;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  serves_food: boolean;
  sells_alcohol: boolean;
  handles_hazardous_materials: boolean;
  has_signage: boolean;
  has_employees: boolean;
  operates_from_home: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Jurisdiction {
  id: string;
  name: string;
  level: "federal" | "state" | "county" | "city";
  state: string | null;
  county: string | null;
  city: string | null;
  website: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Regulation {
  id: string;
  jurisdiction_id: string;
  title: string;
  section_code: string | null;
  content: string;
  summary: string | null;
  category: string;
  subcategory: string | null;
  applicable_industries: string[];
  applicable_entity_types: BusinessEntityType[];
  source_url: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  embedding: number[] | null;
  chunk_index: number;
  parent_regulation_id: string | null;
  content_hash: string;
  last_verified_at: string;
  created_at: string;
  updated_at: string;
}

export interface Permit {
  id: string;
  organization_id: string;
  business_profile_id: string;
  jurisdiction_id: string | null;
  regulation_id: string | null;
  name: string;
  description: string | null;
  category: string;
  status: PermitStatus;
  priority: number;
  estimated_cost: number | null;
  actual_cost: number | null;
  estimated_processing_days: number | null;
  requirements: PermitRequirement[];
  application_url: string | null;
  application_number: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  expires_at: string | null;
  renewal_period_months: number | null;
  notes: string | null;
  ai_generated: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PermitRequirement {
  label: string;
  description: string;
  completed: boolean;
}

export interface PermitDeadline {
  id: string;
  permit_id: string;
  organization_id: string;
  title: string;
  description: string | null;
  deadline_type: DeadlineType;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  reminder_days_before: number[];
  last_reminder_sent_at: string | null;
  next_reminder_at: string | null;
  is_recurring: boolean;
  recurrence_months: number | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  organization_id: string;
  permit_id: string | null;
  name: string;
  document_type: DocumentType;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  is_auto_filled: boolean;
  auto_fill_data: Record<string, unknown> | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  organization_id: string;
  user_id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  referenced_regulation_ids: string[];
  input_tokens: number | null;
  output_tokens: number | null;
  model: string | null;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  organization_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  reminder_days: number[];
  daily_digest: boolean;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
}

// Supabase generated database types
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Organization>;
      };
      business_profiles: {
        Row: BusinessProfile;
        Insert: Omit<BusinessProfile, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<BusinessProfile>;
      };
      jurisdictions: {
        Row: Jurisdiction;
        Insert: Omit<Jurisdiction, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Jurisdiction>;
      };
      regulations: {
        Row: Regulation;
        Insert: Omit<Regulation, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Regulation>;
      };
      permits: {
        Row: Permit;
        Insert: Omit<Permit, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Permit>;
      };
      permit_deadlines: {
        Row: PermitDeadline;
        Insert: Omit<PermitDeadline, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PermitDeadline>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Document>;
      };
      chat_history: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<ChatMessage>;
      };
      notification_preferences: {
        Row: NotificationPreference;
        Insert: Omit<NotificationPreference, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<NotificationPreference>;
      };
    };
    Functions: {
      match_regulations: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
          filter_jurisdiction_id?: string;
          filter_category?: string;
        };
        Returns: {
          id: string;
          jurisdiction_id: string;
          title: string;
          content: string;
          summary: string;
          category: string;
          source_url: string;
          similarity: number;
        }[];
      };
      get_upcoming_deadlines: {
        Args: {
          org_id: string;
          days_ahead?: number;
        };
        Returns: {
          deadline_id: string;
          permit_id: string;
          permit_name: string;
          deadline_title: string;
          deadline_type: DeadlineType;
          due_date: string;
          days_until: number;
          permit_status: PermitStatus;
        }[];
      };
    };
  };
}
