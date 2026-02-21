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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcement_acknowledgements: {
        Row: {
          acknowledged_at: string
          announcement_id: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          announcement_id: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          announcement_id?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_acknowledgements_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_acknowledgements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_acknowledgements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          attachment_urls: Json
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          expires_at: string | null
          id: string
          pin_to_top: boolean
          priority: string
          published_at: string | null
          requires_acknowledgement: boolean
          scheduled_for: string | null
          scope: string
          target_class_id: string | null
          target_program_id: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_urls?: Json
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          pin_to_top?: boolean
          priority?: string
          published_at?: string | null
          requires_acknowledgement?: boolean
          scheduled_for?: string | null
          scope?: string
          target_class_id?: string | null
          target_program_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_urls?: Json
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          pin_to_top?: boolean
          priority?: string
          published_at?: string | null
          requires_acknowledgement?: boolean
          scheduled_for?: string | null
          scope?: string
          target_class_id?: string | null
          target_program_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_target_class_id_fkey"
            columns: ["target_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_target_program_id_fkey"
            columns: ["target_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in_at: string | null
          check_out_at: string | null
          class_id: string | null
          created_at: string
          date: string
          deleted_at: string | null
          id: string
          notes: string | null
          recorded_by: string | null
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          check_in_at?: string | null
          check_out_at?: string | null
          class_id?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          check_in_at?: string | null
          check_out_at?: string | null
          class_id?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          muted: boolean
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channel_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channel_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          allow_parent_posts: boolean
          channel_type: string
          class_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_moderated: boolean
          name: string | null
          program_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_parent_posts?: boolean
          channel_type: string
          class_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_moderated?: boolean
          name?: string | null
          program_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_parent_posts?: boolean
          channel_type?: string
          class_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_moderated?: boolean
          name?: string | null
          program_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          channel_id: string
          content: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          hidden_by: string | null
          hidden_reason: string | null
          id: string
          is_hidden: boolean
          message_type: string
          reply_to_id: string | null
          sender_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          channel_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hidden_by?: string | null
          hidden_reason?: string | null
          id?: string
          is_hidden?: boolean
          message_type?: string
          reply_to_id?: string | null
          sender_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          channel_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hidden_by?: string | null
          hidden_reason?: string | null
          id?: string
          is_hidden?: boolean
          message_type?: string
          reply_to_id?: string | null
          sender_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_hidden_by_fkey"
            columns: ["hidden_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          curriculum_instance_id: string | null
          cycle_level: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          room: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          curriculum_instance_id?: string | null
          cycle_level?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          room?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          curriculum_instance_id?: string | null
          cycle_level?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          room?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_curriculum_instance_id_fkey"
            columns: ["curriculum_instance_id"]
            isOneToOne: false
            referencedRelation: "curriculum_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_cross_mappings: {
        Row: {
          confidence: string
          created_at: string
          created_by: string | null
          id: string
          mapping_type: string
          notes: string | null
          source_node_id: string
          source_template_id: string
          target_node_id: string
          target_template_id: string
          tenant_id: string | null
        }
        Insert: {
          confidence?: string
          created_at?: string
          created_by?: string | null
          id?: string
          mapping_type?: string
          notes?: string | null
          source_node_id: string
          source_template_id: string
          target_node_id: string
          target_template_id: string
          tenant_id?: string | null
        }
        Update: {
          confidence?: string
          created_at?: string
          created_by?: string | null
          id?: string
          mapping_type?: string
          notes?: string | null
          source_node_id?: string
          source_template_id?: string
          target_node_id?: string
          target_template_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_cross_mappings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_cross_mappings_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "curriculum_template_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_cross_mappings_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "curriculum_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_cross_mappings_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "curriculum_template_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_cross_mappings_target_template_id_fkey"
            columns: ["target_template_id"]
            isOneToOne: false
            referencedRelation: "curriculum_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_instances: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          source_template_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          source_template_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          source_template_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_instances_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "curriculum_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_nodes: {
        Row: {
          age_range: string | null
          assessment_criteria: string | null
          code: string | null
          content_url: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          direct_aims: string[] | null
          id: string
          indirect_aims: string[] | null
          instance_id: string
          is_hidden: boolean
          level: string
          materials: string[] | null
          parent_id: string | null
          prerequisites: string[] | null
          sequence_order: number
          source_template_node_id: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          assessment_criteria?: string | null
          code?: string | null
          content_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          direct_aims?: string[] | null
          id?: string
          indirect_aims?: string[] | null
          instance_id: string
          is_hidden?: boolean
          level: string
          materials?: string[] | null
          parent_id?: string | null
          prerequisites?: string[] | null
          sequence_order?: number
          source_template_node_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          assessment_criteria?: string | null
          code?: string | null
          content_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          direct_aims?: string[] | null
          id?: string
          indirect_aims?: string[] | null
          instance_id?: string
          is_hidden?: boolean
          level?: string
          materials?: string[] | null
          parent_id?: string | null
          prerequisites?: string[] | null
          sequence_order?: number
          source_template_node_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_nodes_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "curriculum_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "curriculum_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_nodes_source_template_node_id_fkey"
            columns: ["source_template_node_id"]
            isOneToOne: false
            referencedRelation: "curriculum_template_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_nodes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_template_nodes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          level: string
          parent_id: string | null
          sequence_order: number
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          level: string
          parent_id?: string | null
          sequence_order?: number
          template_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          level?: string
          parent_id?: string | null
          sequence_order?: number
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_template_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "curriculum_template_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_template_nodes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "curriculum_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_templates: {
        Row: {
          age_range: string | null
          country: string | null
          created_at: string
          description: string | null
          framework: string
          id: string
          is_active: boolean
          is_compliance_framework: boolean | null
          name: string
          state: string | null
          updated_at: string
          version: number
        }
        Insert: {
          age_range?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          framework: string
          id?: string
          is_active?: boolean
          is_compliance_framework?: boolean | null
          name: string
          state?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          age_range?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          framework?: string
          id?: string
          is_active?: boolean
          is_compliance_framework?: boolean | null
          name?: string
          state?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      custody_restrictions: {
        Row: {
          court_order_doc_url: string | null
          court_order_reference: string | null
          created_at: string
          deleted_at: string | null
          effective_date: string
          expiry_date: string | null
          id: string
          notes: string | null
          restricted_person_name: string
          restriction_type: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          court_order_doc_url?: string | null
          court_order_reference?: string | null
          created_at?: string
          deleted_at?: string | null
          effective_date: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          restricted_person_name: string
          restriction_type: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          court_order_doc_url?: string | null
          court_order_reference?: string | null
          created_at?: string
          deleted_at?: string | null
          effective_date?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          restricted_person_name?: string
          restriction_type?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custody_restrictions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_restrictions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          subject: string
          tenant_id: string
          trigger_stage: string | null
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject: string
          tenant_id: string
          trigger_stage?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          tenant_id?: string
          trigger_stage?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone_primary: string
          phone_secondary: string | null
          priority_order: number
          relationship: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone_primary: string
          phone_secondary?: string | null
          priority_order?: number
          relationship: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone_primary?: string
          phone_secondary?: string | null
          priority_order?: number
          relationship?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_mappings: {
        Row: {
          created_at: string
          external_id: string
          external_name: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          provider: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          external_id: string
          external_name?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          provider: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          external_id?: string
          external_name?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          provider?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_mappings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_applications: {
        Row: {
          admin_notes: string | null
          approved_class_id: string | null
          change_request_notes: string | null
          child_date_of_birth: string
          child_first_name: string
          child_gender: string | null
          child_languages: string[] | null
          child_last_name: string
          child_nationality: string | null
          child_preferred_name: string | null
          child_previous_school: string | null
          created_at: string
          created_student_id: string | null
          custody_restrictions: Json
          custom_responses: Json
          deleted_at: string | null
          directory_consent: boolean
          emergency_contacts: Json
          enrollment_period_id: string
          existing_student_id: string | null
          guardians: Json
          id: string
          media_consent: boolean
          medical_conditions: Json
          privacy_accepted: boolean
          rejection_reason: string | null
          requested_class_id: string | null
          requested_program: string | null
          requested_start_date: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          submitted_by_email: string
          submitted_by_user: string | null
          tenant_id: string
          terms_accepted: boolean
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approved_class_id?: string | null
          change_request_notes?: string | null
          child_date_of_birth: string
          child_first_name: string
          child_gender?: string | null
          child_languages?: string[] | null
          child_last_name: string
          child_nationality?: string | null
          child_preferred_name?: string | null
          child_previous_school?: string | null
          created_at?: string
          created_student_id?: string | null
          custody_restrictions?: Json
          custom_responses?: Json
          deleted_at?: string | null
          directory_consent?: boolean
          emergency_contacts?: Json
          enrollment_period_id: string
          existing_student_id?: string | null
          guardians?: Json
          id?: string
          media_consent?: boolean
          medical_conditions?: Json
          privacy_accepted?: boolean
          rejection_reason?: string | null
          requested_class_id?: string | null
          requested_program?: string | null
          requested_start_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_email: string
          submitted_by_user?: string | null
          tenant_id: string
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approved_class_id?: string | null
          change_request_notes?: string | null
          child_date_of_birth?: string
          child_first_name?: string
          child_gender?: string | null
          child_languages?: string[] | null
          child_last_name?: string
          child_nationality?: string | null
          child_preferred_name?: string | null
          child_previous_school?: string | null
          created_at?: string
          created_student_id?: string | null
          custody_restrictions?: Json
          custom_responses?: Json
          deleted_at?: string | null
          directory_consent?: boolean
          emergency_contacts?: Json
          enrollment_period_id?: string
          existing_student_id?: string | null
          guardians?: Json
          id?: string
          media_consent?: boolean
          medical_conditions?: Json
          privacy_accepted?: boolean
          rejection_reason?: string | null
          requested_class_id?: string | null
          requested_program?: string | null
          requested_start_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_email?: string
          submitted_by_user?: string | null
          tenant_id?: string
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_applications_approved_class_id_fkey"
            columns: ["approved_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_applications_created_student_id_fkey"
            columns: ["created_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_applications_enrollment_period_id_fkey"
            columns: ["enrollment_period_id"]
            isOneToOne: false
            referencedRelation: "enrollment_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_applications_existing_student_id_fkey"
            columns: ["existing_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_applications_requested_class_id_fkey"
            columns: ["requested_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_applications_submitted_by_user_fkey"
            columns: ["submitted_by_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_documents: {
        Row: {
          application_id: string
          created_at: string
          deleted_at: string | null
          document_type: string
          file_name: string
          file_size_bytes: number
          id: string
          mime_type: string
          notes: string | null
          storage_path: string
          tenant_id: string
          updated_at: string
          uploaded_by_email: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          deleted_at?: string | null
          document_type: string
          file_name: string
          file_size_bytes: number
          id?: string
          mime_type: string
          notes?: string | null
          storage_path: string
          tenant_id: string
          updated_at?: string
          uploaded_by_email: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          deleted_at?: string | null
          document_type?: string
          file_name?: string
          file_size_bytes?: number
          id?: string
          mime_type?: string
          notes?: string | null
          storage_path?: string
          tenant_id?: string
          updated_at?: string
          uploaded_by_email?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "enrollment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_periods: {
        Row: {
          available_programs: Json
          closes_at: string | null
          confirmation_message: string | null
          created_at: string
          custom_fields: Json
          deleted_at: string | null
          id: string
          name: string
          opens_at: string
          period_type: string
          required_documents: Json
          status: string
          tenant_id: string
          updated_at: string
          welcome_message: string | null
          year: number
        }
        Insert: {
          available_programs?: Json
          closes_at?: string | null
          confirmation_message?: string | null
          created_at?: string
          custom_fields?: Json
          deleted_at?: string | null
          id?: string
          name: string
          opens_at: string
          period_type?: string
          required_documents?: Json
          status?: string
          tenant_id: string
          updated_at?: string
          welcome_message?: string | null
          year: number
        }
        Update: {
          available_programs?: Json
          closes_at?: string | null
          confirmation_message?: string | null
          created_at?: string
          custom_fields?: Json
          deleted_at?: string | null
          id?: string
          name?: string
          opens_at?: string
          period_type?: string
          required_documents?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
          welcome_message?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string
          created_at: string
          deleted_at: string | null
          end_date: string | null
          id: string
          start_date: string
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          start_date: string
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          event_id: string
          guests: number
          id: string
          notes: string | null
          responded_at: string
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          event_id: string
          guests?: number
          id?: string
          notes?: string | null
          responded_at?: string
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          event_id?: string
          guests?: number
          id?: string
          notes?: string | null
          responded_at?: string
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "school_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      family_directory_entries: {
        Row: {
          bio: string | null
          children_names: string[] | null
          created_at: string
          deleted_at: string | null
          display_name: string
          email_visible: boolean
          id: string
          interests: string[] | null
          is_visible: boolean
          phone_visible: boolean
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          children_names?: string[] | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          email_visible?: boolean
          id?: string
          interests?: string[] | null
          is_visible?: boolean
          phone_visible?: boolean
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          children_names?: string[] | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          email_visible?: boolean
          id?: string
          interests?: string[] | null
          is_visible?: boolean
          phone_visible?: boolean
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_directory_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_directory_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_schedules: {
        Row: {
          amount_cents: number
          class_id: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          description: string | null
          effective_from: string
          effective_until: string | null
          frequency: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          class_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          effective_from?: string
          effective_until?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          class_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          effective_from?: string
          effective_until?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          created_at: string
          deleted_at: string | null
          directory_consent: boolean
          email: string | null
          first_name: string | null
          id: string
          is_emergency_contact: boolean
          is_primary: boolean
          last_name: string | null
          media_consent: boolean
          phone: string | null
          pickup_authorized: boolean
          relationship: string
          student_id: string
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          directory_consent?: boolean
          email?: string | null
          first_name?: string | null
          id?: string
          is_emergency_contact?: boolean
          is_primary?: boolean
          last_name?: string | null
          media_consent?: boolean
          phone?: string | null
          pickup_authorized?: boolean
          relationship: string
          student_id: string
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          directory_consent?: boolean
          email?: string | null
          first_name?: string | null
          id?: string
          is_emergency_contact?: boolean
          is_primary?: boolean
          last_name?: string | null
          media_consent?: boolean
          phone?: string | null
          pickup_authorized?: boolean
          relationship?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardians_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      import_job_records: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          import_job_id: string
          mapped_data: Json
          raw_data: Json
          row_number: number
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          import_job_id: string
          mapped_data?: Json
          raw_data?: Json
          row_number: number
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          import_job_id?: string
          mapped_data?: Json
          raw_data?: Json
          row_number?: number
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_job_records_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_job_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          column_mapping: Json
          completed_at: string | null
          created_at: string
          created_by: string
          error_count: number
          errors: Json
          file_name: string
          id: string
          import_type: string
          imported_count: number
          metadata: Json
          skipped_count: number
          status: string
          tenant_id: string
          total_rows: number
          updated_at: string
        }
        Insert: {
          column_mapping?: Json
          completed_at?: string | null
          created_at?: string
          created_by: string
          error_count?: number
          errors?: Json
          file_name: string
          id?: string
          import_type: string
          imported_count?: number
          metadata?: Json
          skipped_count?: number
          status?: string
          tenant_id: string
          total_rows?: number
          updated_at?: string
        }
        Update: {
          column_mapping?: Json
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_count?: number
          errors?: Json
          file_name?: string
          id?: string
          import_type?: string
          imported_count?: number
          metadata?: Json
          skipped_count?: number
          status?: string
          tenant_id?: string
          total_rows?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_configs: {
        Row: {
          created_at: string
          credentials: Json
          deleted_at: string | null
          id: string
          is_enabled: boolean
          last_synced_at: string | null
          provider: string
          settings: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials?: Json
          deleted_at?: string | null
          id?: string
          is_enabled?: boolean
          last_synced_at?: string | null
          provider: string
          settings?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          deleted_at?: string | null
          id?: string
          is_enabled?: boolean
          last_synced_at?: string | null
          provider?: string
          settings?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_logs: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          id: string
          operation: string
          provider: string
          request_data: Json | null
          response_data: Json | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          operation: string
          provider: string
          request_data?: Json | null
          response_data?: Json | null
          status: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          operation?: string
          provider?: string
          request_data?: Json | null
          response_data?: Json | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          fee_schedule_id: string | null
          id: string
          invoice_id: string
          quantity: number
          tenant_id: string
          total_cents: number
          unit_amount_cents: number
        }
        Insert: {
          created_at?: string
          description: string
          fee_schedule_id?: string | null
          id?: string
          invoice_id: string
          quantity?: number
          tenant_id: string
          total_cents: number
          unit_amount_cents: number
        }
        Update: {
          created_at?: string
          description?: string
          fee_schedule_id?: string | null
          id?: string
          invoice_id?: string
          quantity?: number
          tenant_id?: string
          total_cents?: number
          unit_amount_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_fee_schedule_id_fkey"
            columns: ["fee_schedule_id"]
            isOneToOne: false
            referencedRelation: "fee_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid_cents: number
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          discount_cents: number
          due_date: string
          guardian_id: string
          id: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          sent_at: string | null
          status: string
          stripe_hosted_url: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          student_id: string
          subtotal_cents: number
          tax_cents: number
          tenant_id: string
          total_cents: number
          updated_at: string
          voided_at: string | null
        }
        Insert: {
          amount_paid_cents?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          discount_cents?: number
          due_date: string
          guardian_id: string
          id?: string
          invoice_number: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          sent_at?: string | null
          status?: string
          stripe_hosted_url?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          student_id: string
          subtotal_cents?: number
          tax_cents?: number
          tenant_id: string
          total_cents?: number
          updated_at?: string
          voided_at?: string | null
        }
        Update: {
          amount_paid_cents?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          discount_cents?: number
          due_date?: string
          guardian_id?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          sent_at?: string | null
          status?: string
          stripe_hosted_url?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          student_id?: string
          subtotal_cents?: number
          tax_cents?: number
          tenant_id?: string
          total_cents?: number
          updated_at?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mastery_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          curriculum_node_id: string
          id: string
          new_status: string
          previous_status: string | null
          student_id: string
          student_mastery_id: string
          tenant_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          curriculum_node_id: string
          id?: string
          new_status: string
          previous_status?: string | null
          student_id: string
          student_mastery_id: string
          tenant_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          curriculum_node_id?: string
          id?: string
          new_status?: string
          previous_status?: string | null
          student_id?: string
          student_mastery_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_history_curriculum_node_id_fkey"
            columns: ["curriculum_node_id"]
            isOneToOne: false
            referencedRelation: "curriculum_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_history_student_mastery_id_fkey"
            columns: ["student_mastery_id"]
            isOneToOne: false
            referencedRelation: "student_mastery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_conditions: {
        Row: {
          action_plan: string | null
          action_plan_doc_url: string | null
          condition_name: string
          condition_type: string
          created_at: string
          deleted_at: string | null
          description: string | null
          expiry_date: string | null
          id: string
          medication_location: string | null
          medication_name: string | null
          requires_medication: boolean
          severity: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action_plan?: string | null
          action_plan_doc_url?: string | null
          condition_name: string
          condition_type: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          medication_location?: string | null
          medication_name?: string | null
          requires_medication?: boolean
          severity: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          action_plan?: string | null
          action_plan_doc_url?: string | null
          condition_name?: string
          condition_type?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          medication_location?: string | null
          medication_name?: string | null
          requires_medication?: boolean
          severity?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_conditions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_conditions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_recipients: {
        Row: {
          created_at: string
          id: string
          read_at: string | null
          tenant_id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          read_at?: string | null
          tenant_id: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          read_at?: string | null
          tenant_id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_recipients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_recipients_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          class_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          subject: string | null
          tenant_id: string
          thread_type: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          subject?: string | null
          tenant_id: string
          thread_type: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          subject?: string | null
          tenant_id?: string
          thread_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          sender_id: string
          sent_at: string
          tenant_id: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          sender_id: string
          sent_at?: string
          tenant_id: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          sender_id?: string
          sent_at?: string
          tenant_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          notify_announcements: boolean
          notify_attendance: boolean
          notify_bookings: boolean
          notify_events: boolean
          notify_messages: boolean
          notify_observations: boolean
          notify_reports: boolean
          push_enabled: boolean
          quiet_end: string | null
          quiet_start: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          notify_announcements?: boolean
          notify_attendance?: boolean
          notify_bookings?: boolean
          notify_events?: boolean
          notify_messages?: boolean
          notify_observations?: boolean
          notify_reports?: boolean
          push_enabled?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          notify_announcements?: boolean
          notify_attendance?: boolean
          notify_bookings?: boolean
          notify_events?: boolean
          notify_messages?: boolean
          notify_observations?: boolean
          notify_reports?: boolean
          push_enabled?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      observation_media: {
        Row: {
          created_at: string
          deleted_at: string | null
          file_name: string | null
          file_size_bytes: number | null
          google_drive_file_id: string | null
          id: string
          media_type: string
          observation_id: string
          storage_path: string | null
          storage_provider: string
          tenant_id: string
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          google_drive_file_id?: string | null
          id?: string
          media_type: string
          observation_id: string
          storage_path?: string | null
          storage_provider?: string
          tenant_id: string
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          google_drive_file_id?: string | null
          id?: string
          media_type?: string
          observation_id?: string
          storage_path?: string | null
          storage_provider?: string
          tenant_id?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "observation_media_observation_id_fkey"
            columns: ["observation_id"]
            isOneToOne: false
            referencedRelation: "observations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observation_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      observation_outcomes: {
        Row: {
          created_at: string
          curriculum_node_id: string
          id: string
          observation_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          curriculum_node_id: string
          id?: string
          observation_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          curriculum_node_id?: string
          id?: string
          observation_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "observation_outcomes_curriculum_node_id_fkey"
            columns: ["curriculum_node_id"]
            isOneToOne: false
            referencedRelation: "curriculum_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observation_outcomes_observation_id_fkey"
            columns: ["observation_id"]
            isOneToOne: false
            referencedRelation: "observations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observation_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      observation_students: {
        Row: {
          created_at: string
          id: string
          observation_id: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          observation_id: string
          student_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          observation_id?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "observation_students_observation_id_fkey"
            columns: ["observation_id"]
            isOneToOne: false
            referencedRelation: "observations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observation_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observation_students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      observations: {
        Row: {
          author_id: string
          content: string | null
          created_at: string
          deleted_at: string | null
          id: string
          published_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          published_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          published_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "observations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          deleted_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          status: string
          student_id: string
          tenant_id: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          status?: string
          student_id: string
          tenant_id: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          status?: string
          student_id?: string
          tenant_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_periods: {
        Row: {
          created_at: string
          deleted_at: string | null
          end_date: string
          frequency: string
          id: string
          locked_at: string | null
          locked_by: string | null
          name: string
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          end_date: string
          frequency?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          name: string
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          end_date?: string
          frequency?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          name?: string
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_periods_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          invoice_id: string
          paid_at: string | null
          payment_method_last4: string | null
          payment_method_type: string | null
          refund_amount_cents: number | null
          refund_reason: string | null
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          invoice_id: string
          paid_at?: string | null
          payment_method_last4?: string | null
          payment_method_type?: string | null
          refund_amount_cents?: number | null
          refund_reason?: string | null
          status: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          invoice_id?: string
          paid_at?: string | null
          payment_method_last4?: string | null
          payment_method_type?: string | null
          refund_amount_cents?: number | null
          refund_reason?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_settings: {
        Row: {
          auto_create_periods: boolean
          created_at: string
          default_break_minutes: number
          default_end_time: string
          default_start_time: string
          id: string
          pay_cycle_start_day: number
          pay_frequency: string
          payroll_provider: string | null
          provider_config: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_create_periods?: boolean
          created_at?: string
          default_break_minutes?: number
          default_end_time?: string
          default_start_time?: string
          id?: string
          pay_cycle_start_day?: number
          pay_frequency?: string
          payroll_provider?: string | null
          provider_config?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_create_periods?: boolean
          created_at?: string
          default_break_minutes?: number
          default_end_time?: string
          default_start_time?: string
          id?: string
          pay_cycle_start_day?: number
          pay_frequency?: string
          payroll_provider?: string | null
          provider_config?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          label: string
          module: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          label: string
          module: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          module?: string
        }
        Relationships: []
      }
      pickup_authorizations: {
        Row: {
          authorized_by: string | null
          authorized_name: string
          created_at: string
          deleted_at: string | null
          id: string
          is_permanent: boolean
          phone: string | null
          photo_url: string | null
          relationship: string | null
          student_id: string
          tenant_id: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          authorized_by?: string | null
          authorized_name: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_permanent?: boolean
          phone?: string | null
          photo_url?: string | null
          relationship?: string | null
          student_id: string
          tenant_id: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          authorized_by?: string | null
          authorized_name?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_permanent?: boolean
          phone?: string | null
          photo_url?: string | null
          relationship?: string | null
          student_id?: string
          tenant_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pickup_authorizations_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_authorizations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_authorizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      program_sessions: {
        Row: {
          created_at: string
          date: string
          deleted_at: string | null
          end_time: string
          id: string
          location: string | null
          max_capacity: number | null
          notes: string | null
          program_id: string
          staff_id: string | null
          start_time: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          deleted_at?: string | null
          end_time: string
          id?: string
          location?: string | null
          max_capacity?: number | null
          notes?: string | null
          program_id: string
          staff_id?: string | null
          start_time: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          deleted_at?: string | null
          end_time?: string
          id?: string
          location?: string | null
          max_capacity?: number | null
          notes?: string | null
          program_id?: string
          staff_id?: string | null
          start_time?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_sessions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          billing_type: string
          cancellation_notice_hours: number
          casual_fee_cents: number | null
          ccs_activity_type: string | null
          ccs_eligible: boolean
          ccs_service_id: string | null
          code: string | null
          created_at: string
          default_days: string[] | null
          default_end_time: string | null
          default_start_time: string | null
          deleted_at: string | null
          description: string | null
          eligible_class_ids: string[] | null
          id: string
          is_active: boolean
          late_cancel_fee_cents: number | null
          max_age_months: number | null
          max_capacity: number | null
          min_age_months: number | null
          name: string
          program_type: string
          session_fee_cents: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_type?: string
          cancellation_notice_hours?: number
          casual_fee_cents?: number | null
          ccs_activity_type?: string | null
          ccs_eligible?: boolean
          ccs_service_id?: string | null
          code?: string | null
          created_at?: string
          default_days?: string[] | null
          default_end_time?: string | null
          default_start_time?: string | null
          deleted_at?: string | null
          description?: string | null
          eligible_class_ids?: string[] | null
          id?: string
          is_active?: boolean
          late_cancel_fee_cents?: number | null
          max_age_months?: number | null
          max_capacity?: number | null
          min_age_months?: number | null
          name: string
          program_type: string
          session_fee_cents?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_type?: string
          cancellation_notice_hours?: number
          casual_fee_cents?: number | null
          ccs_activity_type?: string | null
          ccs_eligible?: boolean
          ccs_service_id?: string | null
          code?: string | null
          created_at?: string
          default_days?: string[] | null
          default_end_time?: string | null
          default_start_time?: string | null
          deleted_at?: string | null
          description?: string | null
          eligible_class_ids?: string[] | null
          id?: string
          is_active?: boolean
          late_cancel_fee_cents?: number | null
          max_age_months?: number | null
          max_capacity?: number | null
          min_age_months?: number | null
          name?: string
          program_type?: string
          session_fee_cents?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_booking_patterns: {
        Row: {
          booked_by: string
          created_at: string
          days_of_week: string[]
          deleted_at: string | null
          effective_from: string
          effective_until: string | null
          id: string
          program_id: string
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          booked_by: string
          created_at?: string
          days_of_week: string[]
          deleted_at?: string | null
          effective_from: string
          effective_until?: string | null
          id?: string
          program_id: string
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          booked_by?: string
          created_at?: string
          days_of_week?: string[]
          deleted_at?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          program_id?: string
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_booking_patterns_booked_by_fkey"
            columns: ["booked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_booking_patterns_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_booking_patterns_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_booking_patterns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          content: Json
          created_at: string
          cycle_level: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          cycle_level?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          cycle_level?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      school_events: {
        Row: {
          all_day: boolean
          attachment_urls: Json
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          end_at: string | null
          event_type: string
          id: string
          location: string | null
          location_url: string | null
          max_attendees: number | null
          rsvp_deadline: string | null
          rsvp_enabled: boolean
          scope: string
          start_at: string
          target_class_id: string | null
          target_program_id: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          attachment_urls?: Json
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string
          id?: string
          location?: string | null
          location_url?: string | null
          max_attendees?: number | null
          rsvp_deadline?: string | null
          rsvp_enabled?: boolean
          scope?: string
          start_at: string
          target_class_id?: string | null
          target_program_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          attachment_urls?: Json
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string
          id?: string
          location?: string | null
          location_url?: string | null
          max_attendees?: number | null
          rsvp_deadline?: string | null
          rsvp_enabled?: boolean
          scope?: string
          start_at?: string
          target_class_id?: string | null
          target_program_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_events_target_class_id_fkey"
            columns: ["target_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_events_target_program_id_fkey"
            columns: ["target_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      session_bookings: {
        Row: {
          billing_status: string
          booked_by: string
          booking_type: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          checked_out_at: string | null
          checked_out_by: string | null
          created_at: string
          deleted_at: string | null
          fee_cents: number
          id: string
          invoice_line_id: string | null
          late_cancellation: boolean | null
          recurring_pattern_id: string | null
          session_id: string
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
          waitlist_position: number | null
        }
        Insert: {
          billing_status?: string
          booked_by: string
          booking_type?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          created_at?: string
          deleted_at?: string | null
          fee_cents?: number
          id?: string
          invoice_line_id?: string | null
          late_cancellation?: boolean | null
          recurring_pattern_id?: string | null
          session_id: string
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
          waitlist_position?: number | null
        }
        Update: {
          billing_status?: string
          booked_by?: string
          booking_type?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          created_at?: string
          deleted_at?: string | null
          fee_cents?: number
          id?: string
          invoice_line_id?: string | null
          late_cancellation?: boolean | null
          recurring_pattern_id?: string | null
          session_id?: string
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_bookings_booked_by_fkey"
            columns: ["booked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bookings_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bookings_checked_out_by_fkey"
            columns: ["checked_out_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bookings_recurring_pattern_id_fkey"
            columns: ["recurring_pattern_id"]
            isOneToOne: false
            referencedRelation: "recurring_booking_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          created_at: string
          default_payment_method: string | null
          email: string | null
          guardian_id: string
          id: string
          stripe_customer_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_payment_method?: string | null
          email?: string | null
          guardian_id: string
          id?: string
          stripe_customer_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_payment_method?: string | null
          email?: string | null
          guardian_id?: string
          id?: string
          stripe_customer_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_mastery: {
        Row: {
          assessed_by: string | null
          created_at: string
          curriculum_node_id: string
          date_achieved: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assessed_by?: string | null
          created_at?: string
          curriculum_node_id: string
          date_achieved?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assessed_by?: string | null
          created_at?: string
          curriculum_node_id?: string
          date_achieved?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_mastery_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_mastery_curriculum_node_id_fkey"
            columns: ["curriculum_node_id"]
            isOneToOne: false
            referencedRelation: "curriculum_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_mastery_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_mastery_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_portfolio_folders: {
        Row: {
          created_at: string
          deleted_at: string | null
          drive_folder_id: string
          drive_folder_url: string | null
          id: string
          student_id: string
          tenant_id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          drive_folder_id: string
          drive_folder_url?: string | null
          id?: string
          student_id: string
          tenant_id: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          drive_folder_id?: string
          drive_folder_url?: string | null
          id?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_portfolio_folders_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_portfolio_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_reports: {
        Row: {
          author_id: string
          content: Json
          created_at: string
          deleted_at: string | null
          google_doc_id: string | null
          id: string
          pdf_storage_path: string | null
          published_at: string | null
          status: string
          student_id: string
          template_id: string | null
          tenant_id: string
          term: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: Json
          created_at?: string
          deleted_at?: string | null
          google_doc_id?: string | null
          id?: string
          pdf_storage_path?: string | null
          published_at?: string | null
          status?: string
          student_id: string
          template_id?: string | null
          tenant_id: string
          term?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: Json
          created_at?: string
          deleted_at?: string | null
          google_doc_id?: string | null
          id?: string
          pdf_storage_path?: string | null
          published_at?: string | null
          status?: string
          student_id?: string
          template_id?: string | null
          tenant_id?: string
          term?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_reports_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          country_of_birth: string | null
          created_at: string
          crn: string | null
          deleted_at: string | null
          dob: string | null
          enrollment_status: string
          first_name: string
          gender: string | null
          home_language: string | null
          id: string
          indigenous_status: string | null
          language_background: string | null
          languages: string[] | null
          last_name: string
          medicare_number: string | null
          nationality: string | null
          notes: string | null
          photo_url: string | null
          preferred_name: string | null
          previous_school: string | null
          religion: string | null
          residential_address: Json | null
          tenant_id: string
          updated_at: string
          usi: string | null
          visa_subclass: string | null
        }
        Insert: {
          country_of_birth?: string | null
          created_at?: string
          crn?: string | null
          deleted_at?: string | null
          dob?: string | null
          enrollment_status?: string
          first_name: string
          gender?: string | null
          home_language?: string | null
          id?: string
          indigenous_status?: string | null
          language_background?: string | null
          languages?: string[] | null
          last_name: string
          medicare_number?: string | null
          nationality?: string | null
          notes?: string | null
          photo_url?: string | null
          preferred_name?: string | null
          previous_school?: string | null
          religion?: string | null
          residential_address?: Json | null
          tenant_id: string
          updated_at?: string
          usi?: string | null
          visa_subclass?: string | null
        }
        Update: {
          country_of_birth?: string | null
          created_at?: string
          crn?: string | null
          deleted_at?: string | null
          dob?: string | null
          enrollment_status?: string
          first_name?: string
          gender?: string | null
          home_language?: string | null
          id?: string
          indigenous_status?: string | null
          language_background?: string | null
          languages?: string[] | null
          last_name?: string
          medicare_number?: string | null
          nationality?: string | null
          notes?: string | null
          photo_url?: string | null
          preferred_name?: string | null
          previous_school?: string | null
          religion?: string | null
          residential_address?: Json | null
          tenant_id?: string
          updated_at?: string
          usi?: string | null
          visa_subclass?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_preferences: Json
          id: string
          role_id: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_preferences?: Json
          id?: string
          role_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_preferences?: Json
          id?: string
          role_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          country: string
          created_at: string
          currency: string
          domain: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          plan_tier: string
          settings: Json
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          currency?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          plan_tier?: string
          settings?: Json
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          currency?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          plan_tier?: string
          settings?: Json
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          break_minutes: number
          class_id: string | null
          created_at: string
          date: string
          deleted_at: string | null
          end_time: string
          entry_type: string
          id: string
          notes: string | null
          pay_period_id: string | null
          start_time: string
          tenant_id: string
          total_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          break_minutes?: number
          class_id?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          end_time: string
          entry_type?: string
          id?: string
          notes?: string | null
          pay_period_id?: string | null
          start_time: string
          tenant_id: string
          total_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          break_minutes?: number
          class_id?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          end_time?: string
          entry_type?: string
          id?: string
          notes?: string | null
          pay_period_id?: string | null
          start_time?: string
          tenant_id?: string
          total_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_pay_period_id_fkey"
            columns: ["pay_period_id"]
            isOneToOne: false
            referencedRelation: "pay_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          deleted_at: string | null
          id: string
          leave_hours: number
          overtime_hours: number
          pay_period_id: string
          regular_hours: number
          rejected_at: string | null
          rejected_by: string | null
          rejection_notes: string | null
          status: string
          submitted_at: string | null
          sync_reference: string | null
          synced_at: string | null
          tenant_id: string
          total_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          leave_hours?: number
          overtime_hours?: number
          pay_period_id: string
          regular_hours?: number
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_notes?: string | null
          status?: string
          submitted_at?: string | null
          sync_reference?: string | null
          synced_at?: string | null
          tenant_id: string
          total_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          leave_hours?: number
          overtime_hours?: number
          pay_period_id?: string
          regular_hours?: number
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_notes?: string | null
          status?: string
          submitted_at?: string | null
          sync_reference?: string | null
          synced_at?: string | null
          tenant_id?: string
          total_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_pay_period_id_fkey"
            columns: ["pay_period_id"]
            isOneToOne: false
            referencedRelation: "pay_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_slots: {
        Row: {
          created_at: string
          date: string
          deleted_at: string | null
          end_time: string
          guide_id: string | null
          id: string
          is_active: boolean
          location: string | null
          max_families: number
          notes: string | null
          start_time: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          deleted_at?: string | null
          end_time: string
          guide_id?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          max_families?: number
          notes?: string | null
          start_time: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          deleted_at?: string | null
          end_time?: string
          guide_id?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          max_families?: number
          notes?: string | null
          start_time?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_slots_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_slots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      waitlist_entries: {
        Row: {
          admin_notes: string | null
          child_current_school: string | null
          child_date_of_birth: string
          child_first_name: string
          child_gender: string | null
          child_last_name: string
          converted_application_id: string | null
          created_at: string
          deleted_at: string | null
          how_heard_about_us: string | null
          id: string
          inquiry_date: string
          notes: string | null
          offer_expires_at: string | null
          offer_response: string | null
          offer_response_at: string | null
          offered_at: string | null
          offered_program: string | null
          offered_start_date: string | null
          parent_email: string
          parent_first_name: string
          parent_last_name: string
          parent_phone: string | null
          parent_user_id: string | null
          priority: number
          requested_program: string | null
          requested_start: string | null
          requested_start_date: string | null
          sibling_names: string | null
          siblings_at_school: boolean | null
          source_campaign: string | null
          source_url: string | null
          stage: string
          tenant_id: string
          tour_attended: boolean | null
          tour_date: string | null
          tour_guide: string | null
          tour_notes: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          child_current_school?: string | null
          child_date_of_birth: string
          child_first_name: string
          child_gender?: string | null
          child_last_name: string
          converted_application_id?: string | null
          created_at?: string
          deleted_at?: string | null
          how_heard_about_us?: string | null
          id?: string
          inquiry_date?: string
          notes?: string | null
          offer_expires_at?: string | null
          offer_response?: string | null
          offer_response_at?: string | null
          offered_at?: string | null
          offered_program?: string | null
          offered_start_date?: string | null
          parent_email: string
          parent_first_name: string
          parent_last_name: string
          parent_phone?: string | null
          parent_user_id?: string | null
          priority?: number
          requested_program?: string | null
          requested_start?: string | null
          requested_start_date?: string | null
          sibling_names?: string | null
          siblings_at_school?: boolean | null
          source_campaign?: string | null
          source_url?: string | null
          stage?: string
          tenant_id: string
          tour_attended?: boolean | null
          tour_date?: string | null
          tour_guide?: string | null
          tour_notes?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          child_current_school?: string | null
          child_date_of_birth?: string
          child_first_name?: string
          child_gender?: string | null
          child_last_name?: string
          converted_application_id?: string | null
          created_at?: string
          deleted_at?: string | null
          how_heard_about_us?: string | null
          id?: string
          inquiry_date?: string
          notes?: string | null
          offer_expires_at?: string | null
          offer_response?: string | null
          offer_response_at?: string | null
          offered_at?: string | null
          offered_program?: string | null
          offered_start_date?: string | null
          parent_email?: string
          parent_first_name?: string
          parent_last_name?: string
          parent_phone?: string | null
          parent_user_id?: string | null
          priority?: number
          requested_program?: string | null
          requested_start?: string | null
          requested_start_date?: string | null
          sibling_names?: string | null
          siblings_at_school?: boolean | null
          source_campaign?: string | null
          source_url?: string | null
          stage?: string
          tenant_id?: string
          tour_attended?: boolean | null
          tour_date?: string | null
          tour_guide?: string | null
          tour_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_converted_application_id_fkey"
            columns: ["converted_application_id"]
            isOneToOne: false
            referencedRelation: "enrollment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_parent_user_id_fkey"
            columns: ["parent_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_tour_guide_fkey"
            columns: ["tour_guide"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_stage_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_stage: string | null
          id: string
          notes: string | null
          tenant_id: string
          to_stage: string
          waitlist_entry_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          tenant_id: string
          to_stage: string
          waitlist_entry_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          tenant_id?: string
          to_stage?: string
          waitlist_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_stage_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_stage_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_stage_history_waitlist_entry_id_fkey"
            columns: ["waitlist_entry_id"]
            isOneToOne: false
            referencedRelation: "waitlist_entries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_updated_at_trigger: {
        Args: { target_table: string }
        Returns: undefined
      }
      current_tenant_id: { Args: never; Returns: string }
      has_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      is_guardian_of: { Args: { target_student_id: string }; Returns: boolean }
      next_invoice_number: { Args: { p_tenant_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
