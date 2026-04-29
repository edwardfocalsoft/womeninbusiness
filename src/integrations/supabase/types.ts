export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          annual_price: number
          charge_fee_to_client: boolean
          id: number
          monthly_price: number
          org_email: string
          org_name: string
          payfast_merchant_id_live: string | null
          payfast_merchant_key_live: string | null
          payfast_mode: string
          send_invite_emails: boolean
          updated_at: string
        }
        Insert: {
          annual_price?: number
          charge_fee_to_client?: boolean
          id?: number
          monthly_price?: number
          org_email?: string
          org_name?: string
          payfast_merchant_id_live?: string | null
          payfast_merchant_key_live?: string | null
          payfast_mode?: string
          send_invite_emails?: boolean
          updated_at?: string
        }
        Update: {
          annual_price?: number
          charge_fee_to_client?: boolean
          id?: number
          monthly_price?: number
          org_email?: string
          org_name?: string
          payfast_merchant_id_live?: string | null
          payfast_merchant_key_live?: string | null
          payfast_mode?: string
          send_invite_emails?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_records: {
        Row: {
          bee_affidavit: boolean | null
          cipc_registered: boolean | null
          coida_registered: boolean | null
          completed: boolean
          created_at: string
          csd_registered: boolean | null
          has_bank_account: boolean | null
          has_website: boolean | null
          id: string
          is_operational: boolean | null
          paye_registered: boolean | null
          sars_registered: boolean | null
          uif_registered: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bee_affidavit?: boolean | null
          cipc_registered?: boolean | null
          coida_registered?: boolean | null
          completed?: boolean
          created_at?: string
          csd_registered?: boolean | null
          has_bank_account?: boolean | null
          has_website?: boolean | null
          id?: string
          is_operational?: boolean | null
          paye_registered?: boolean | null
          sars_registered?: boolean | null
          uif_registered?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bee_affidavit?: boolean | null
          cipc_registered?: boolean | null
          coida_registered?: boolean | null
          completed?: boolean
          created_at?: string
          csd_registered?: boolean | null
          has_bank_account?: boolean | null
          has_website?: boolean | null
          id?: string
          is_operational?: boolean | null
          paye_registered?: boolean | null
          sars_registered?: boolean | null
          uif_registered?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          image_url: string | null
          is_members_only: boolean | null
          location: string | null
          max_attendees: number | null
          member_price: number | null
          price: number | null
          start_date: string
          title: string
          updated_at: string
          virtual_link: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          image_url?: string | null
          is_members_only?: boolean | null
          location?: string | null
          max_attendees?: number | null
          member_price?: number | null
          price?: number | null
          start_date: string
          title: string
          updated_at?: string
          virtual_link?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          image_url?: string | null
          is_members_only?: boolean | null
          location?: string | null
          max_attendees?: number | null
          member_price?: number | null
          price?: number | null
          start_date?: string
          title?: string
          updated_at?: string
          virtual_link?: string | null
        }
        Relationships: []
      }
      membership_claims: {
        Row: {
          admin_notes: string | null
          created_at: string
          granted_until: string | null
          id: string
          membership_expires_at: string | null
          membership_starts_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          granted_until?: string | null
          id?: string
          membership_expires_at?: string | null
          membership_starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          granted_until?: string | null
          id?: string
          membership_expires_at?: string | null
          membership_starts_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          member_id: string | null
          plan: Database["public"]["Enums"]["membership_plan"]
          starts_at: string
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          member_id?: string | null
          plan: Database["public"]["Enums"]["membership_plan"]
          starts_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          member_id?: string | null
          plan?: Database["public"]["Enums"]["membership_plan"]
          starts_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          membership_id: string | null
          net_amount: number
          payfast_payment_id: string | null
          payment_method: string
          payment_reference: string | null
          plan: string
          proof_of_payment_url: string | null
          status: string
          transaction_fee: number | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          membership_id?: string | null
          net_amount: number
          payfast_payment_id?: string | null
          payment_method?: string
          payment_reference?: string | null
          plan: string
          proof_of_payment_url?: string | null
          status?: string
          transaction_fee?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          membership_id?: string | null
          net_amount?: number
          payfast_payment_id?: string | null
          payment_method?: string
          payment_reference?: string | null
          plan?: string
          proof_of_payment_url?: string | null
          status?: string
          transaction_fee?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_members: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          expires_at: string | null
          full_name: string
          id: string
          member_type: string
          plan: Database["public"]["Enums"]["membership_plan"]
          purchase_date: string
          status: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          full_name: string
          id?: string
          member_type?: string
          plan: Database["public"]["Enums"]["membership_plan"]
          purchase_date: string
          status?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          full_name?: string
          id?: string
          member_type?: string
          plan?: Database["public"]["Enums"]["membership_plan"]
          purchase_date?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          business_name: string | null
          created_at: string
          full_name: string
          id: string
          industry: string | null
          location: string | null
          onboarding_completed: boolean | null
          phone: string | null
          products_services: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          industry?: string | null
          location?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          products_services?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          industry?: string | null
          location?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          products_services?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          created_by: string | null
          description: string | null
          file_url: string | null
          id: string
          is_members_only: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          is_members_only?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          is_members_only?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payment_reference: string | null
          payment_status: string
          status: Database["public"]["Enums"]["rsvp_status"]
          ticket_number: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payment_reference?: string | null
          payment_status?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
          ticket_number: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payment_reference?: string | null
          payment_status?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
          ticket_number?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_event_rsvp_count: { Args: { _event_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "member" | "user"
      event_type: "physical" | "virtual" | "hybrid"
      membership_plan: "monthly" | "annual"
      membership_status: "active" | "cancelled" | "expired"
      rsvp_status: "confirmed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member", "user"],
      event_type: ["physical", "virtual", "hybrid"],
      membership_plan: ["monthly", "annual"],
      membership_status: ["active", "cancelled", "expired"],
      rsvp_status: ["confirmed", "cancelled"],
    },
  },
} as const
