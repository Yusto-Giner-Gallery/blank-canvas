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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["activity_entity_type"]
          event_type: string | null
          field: string | null
          gallery_id: string
          id: string
          profile_id: string | null
        }
        Insert: {
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["activity_entity_type"]
          event_type?: string | null
          field?: string | null
          gallery_id: string
          id?: string
          profile_id?: string | null
        }
        Update: {
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["activity_entity_type"]
          event_type?: string | null
          field?: string | null
          gallery_id?: string
          id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          bio: string | null
          created_at: string
          deleted_at: string | null
          gallery_id: string
          id: string
          name: string
          nationality: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          gallery_id: string
          id?: string
          name: string
          nationality?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          gallery_id?: string
          id?: string
          name?: string
          nationality?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artists_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      artwork_images: {
        Row: {
          artwork_id: string
          created_at: string
          id: string
          is_primary: boolean
          sort_order: number
          storage_path: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          sort_order?: number
          storage_path: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "artwork_images_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artwork_images_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks_with_attention"
            referencedColumns: ["id"]
          },
        ]
      }
      artwork_tags: {
        Row: {
          artwork_id: string
          tag_id: string
        }
        Insert: {
          artwork_id: string
          tag_id: string
        }
        Update: {
          artwork_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artwork_tags_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artwork_tags_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks_with_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artwork_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      artworks: {
        Row: {
          artist_id: string
          created_at: string
          deleted_at: string | null
          depth_cm: number | null
          gallery_id: string
          height_cm: number | null
          id: string
          internal_id: string
          is_nfs: boolean
          location_id: string | null
          medium: string | null
          notes: string | null
          price_eur: number | null
          status: Database["public"]["Enums"]["artwork_status"]
          title: string
          updated_at: string
          width_cm: number | null
          year: number | null
        }
        Insert: {
          artist_id: string
          created_at?: string
          deleted_at?: string | null
          depth_cm?: number | null
          gallery_id: string
          height_cm?: number | null
          id?: string
          internal_id: string
          is_nfs?: boolean
          location_id?: string | null
          medium?: string | null
          notes?: string | null
          price_eur?: number | null
          status?: Database["public"]["Enums"]["artwork_status"]
          title: string
          updated_at?: string
          width_cm?: number | null
          year?: number | null
        }
        Update: {
          artist_id?: string
          created_at?: string
          deleted_at?: string | null
          depth_cm?: number | null
          gallery_id?: string
          height_cm?: number | null
          id?: string
          internal_id?: string
          is_nfs?: boolean
          location_id?: string | null
          medium?: string | null
          notes?: string | null
          price_eur?: number | null
          status?: Database["public"]["Enums"]["artwork_status"]
          title?: string
          updated_at?: string
          width_cm?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artworks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artworks_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artworks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          color: string | null
          created_at: string
          gallery_id: string
          id: string
          name: string
          starred: boolean
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          gallery_id: string
          id?: string
          name: string
          starred?: boolean
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          gallery_id?: string
          id?: string
          name?: string
          starred?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boards_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      card_artwork_mentions: {
        Row: {
          artwork_id: string
          card_id: string
        }
        Insert: {
          artwork_id: string
          card_id: string
        }
        Update: {
          artwork_id?: string
          card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_artwork_mentions_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_artwork_mentions_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks_with_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_artwork_mentions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_attachments: {
        Row: {
          card_id: string
          created_at: string
          id: string
          name: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          name: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          name?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_attachments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      card_checklist: {
        Row: {
          card_id: string
          created_at: string
          done: boolean
          id: string
          sort_order: number
          text: string
        }
        Insert: {
          card_id: string
          created_at?: string
          done?: boolean
          id?: string
          sort_order?: number
          text: string
        }
        Update: {
          card_id?: string
          created_at?: string
          done?: boolean
          id?: string
          sort_order?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_checklist_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_comments: {
        Row: {
          body: string
          card_id: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          body: string
          card_id: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          body?: string
          card_id?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_comments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      card_members: {
        Row: {
          card_id: string
          profile_id: string
        }
        Insert: {
          card_id: string
          profile_id: string
        }
        Update: {
          card_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_members_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          labels: Database["public"]["Enums"]["card_label"][]
          list_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          labels?: Database["public"]["Enums"]["card_label"][]
          list_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          labels?: Database["public"]["Enums"]["card_label"][]
          list_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_artworks: {
        Row: {
          artwork_id: string
          collection_id: string
          sort_order: number
        }
        Insert: {
          artwork_id: string
          collection_id: string
          sort_order?: number
        }
        Update: {
          artwork_id?: string
          collection_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_artworks_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_artworks_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks_with_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_artworks_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          gallery_id: string
          id: string
          kind: Database["public"]["Enums"]["collection_kind"]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gallery_id: string
          id?: string
          kind?: Database["public"]["Enums"]["collection_kind"]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gallery_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["collection_kind"]
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_activity: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["contact_activity_kind"]
          note: string | null
          ref_id: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["contact_activity_kind"]
          note?: string | null
          ref_id?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["contact_activity_kind"]
          note?: string | null
          ref_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_activity_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string
          gallery_id: string
          id: string
          interest: string | null
          newsletter_opt_in: boolean
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name: string
          gallery_id: string
          id?: string
          interest?: string | null
          newsletter_opt_in?: boolean
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          gallery_id?: string
          id?: string
          interest?: string | null
          newsletter_opt_in?: boolean
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          artwork_id: string | null
          contact_id: string
          created_at: string
          gallery_id: string
          id: string
          notes: string | null
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at: string
          value_eur: number | null
        }
        Insert: {
          artwork_id?: string | null
          contact_id: string
          created_at?: string
          gallery_id: string
          id?: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at?: string
          value_eur?: number | null
        }
        Update: {
          artwork_id?: string | null
          contact_id?: string
          created_at?: string
          gallery_id?: string
          id?: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string
          updated_at?: string
          value_eur?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks_with_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      dossiers: {
        Row: {
          body_blocks: Json
          contact_id: string | null
          created_at: string
          gallery_id: string
          id: string
          image_layout: Json
          kind: Database["public"]["Enums"]["dossier_kind"]
          title: string
          updated_at: string
        }
        Insert: {
          body_blocks?: Json
          contact_id?: string | null
          created_at?: string
          gallery_id: string
          id?: string
          image_layout?: Json
          kind: Database["public"]["Enums"]["dossier_kind"]
          title: string
          updated_at?: string
        }
        Update: {
          body_blocks?: Json
          contact_id?: string | null
          created_at?: string
          gallery_id?: string
          id?: string
          image_layout?: Json
          kind?: Database["public"]["Enums"]["dossier_kind"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossiers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_reports: {
        Row: {
          action_history: Json | null
          console_logs: Json | null
          created_at: string
          description: string
          gallery_id: string
          id: string
          kind: Database["public"]["Enums"]["feedback_kind"]
          page_path: string | null
          profile_id: string
          user_agent: string | null
        }
        Insert: {
          action_history?: Json | null
          console_logs?: Json | null
          created_at?: string
          description: string
          gallery_id: string
          id?: string
          kind: Database["public"]["Enums"]["feedback_kind"]
          page_path?: string | null
          profile_id: string
          user_agent?: string | null
        }
        Update: {
          action_history?: Json | null
          console_logs?: Json | null
          created_at?: string
          description?: string
          gallery_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["feedback_kind"]
          page_path?: string | null
          profile_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      galleries: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_lines: {
        Row: {
          amount_eur: number
          artwork_id: string | null
          description: string
          discount_eur: number
          id: string
          invoice_id: string
          sort_order: number
        }
        Insert: {
          amount_eur?: number
          artwork_id?: string | null
          description: string
          discount_eur?: number
          id?: string
          invoice_id: string
          sort_order?: number
        }
        Update: {
          amount_eur?: number
          artwork_id?: string | null
          description?: string
          discount_eur?: number
          id?: string
          invoice_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks_with_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          contact_id: string
          created_at: string
          currency: string
          deleted_at: string | null
          gallery_id: string
          id: string
          issued_at: string | null
          notes: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_payment_link: string | null
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          gallery_id: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_payment_link?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          gallery_id?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_payment_link?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          board_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          gallery_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gallery_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gallery_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          gallery_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          gallery_id: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          gallery_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          gallery_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          gallery_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          gallery_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          artwork_id: string
          contact_id: string
          created_at: string
          end_date: string | null
          gallery_id: string
          id: string
          notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["loan_status"]
          updated_at: string
        }
        Insert: {
          artwork_id: string
          contact_id: string
          created_at?: string
          end_date?: string | null
          gallery_id: string
          id?: string
          notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
        }
        Update: {
          artwork_id?: string
          contact_id?: string
          created_at?: string
          end_date?: string | null
          gallery_id?: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      consignments: {
        Row: {
          artwork_id: string
          created_at: string
          end_date: string | null
          gallery_id: string
          id: string
          notes: string | null
          partner_contact_id: string
          split_pct: number
          start_date: string
          status: Database["public"]["Enums"]["consignment_status"]
          updated_at: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          end_date?: string | null
          gallery_id: string
          id?: string
          notes?: string | null
          partner_contact_id: string
          split_pct?: number
          start_date: string
          status?: Database["public"]["Enums"]["consignment_status"]
          updated_at?: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          end_date?: string | null
          gallery_id?: string
          id?: string
          notes?: string | null
          partner_contact_id?: string
          split_pct?: number
          start_date?: string
          status?: Database["public"]["Enums"]["consignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignments_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignments_partner_contact_id_fkey"
            columns: ["partner_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignments_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          artwork_id: string
          carrier: string | null
          created_at: string
          delivered_at: string | null
          from_location_id: string | null
          gallery_id: string
          id: string
          notes: string | null
          shipped_at: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          to_address: Json | null
          to_contact_id: string | null
          tracking_no: string | null
          updated_at: string
        }
        Insert: {
          artwork_id: string
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          from_location_id?: string | null
          gallery_id: string
          id?: string
          notes?: string | null
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          to_address?: Json | null
          to_contact_id?: string | null
          tracking_no?: string | null
          updated_at?: string
        }
        Update: {
          artwork_id?: string
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          from_location_id?: string | null
          gallery_id?: string
          id?: string
          notes?: string | null
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          to_address?: Json | null
          to_contact_id?: string | null
          tracking_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_to_contact_id_fkey"
            columns: ["to_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      artwork_documents: {
        Row: {
          artwork_id: string
          byte_size: number | null
          created_at: string
          filename: string
          gallery_id: string
          id: string
          mime_type: string | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          artwork_id: string
          byte_size?: number | null
          created_at?: string
          filename: string
          gallery_id: string
          id?: string
          mime_type?: string | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          artwork_id?: string
          byte_size?: number | null
          created_at?: string
          filename?: string
          gallery_id?: string
          id?: string
          mime_type?: string | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artwork_documents_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artwork_documents_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artwork_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      artworks_with_attention: {
        Row: {
          artist_id: string | null
          created_at: string | null
          deleted_at: string | null
          depth_cm: number | null
          gallery_id: string | null
          height_cm: number | null
          id: string | null
          internal_id: string | null
          is_nfs: boolean | null
          location_id: string | null
          medium: string | null
          needs_attention: boolean | null
          notes: string | null
          price_eur: number | null
          status: Database["public"]["Enums"]["artwork_status"] | null
          title: string | null
          updated_at: string | null
          width_cm: number | null
          year: number | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          depth_cm?: number | null
          gallery_id?: string | null
          height_cm?: number | null
          id?: string | null
          internal_id?: string | null
          is_nfs?: boolean | null
          location_id?: string | null
          medium?: string | null
          needs_attention?: never
          notes?: string | null
          price_eur?: number | null
          status?: Database["public"]["Enums"]["artwork_status"] | null
          title?: string | null
          updated_at?: string | null
          width_cm?: number | null
          year?: number | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          depth_cm?: number | null
          gallery_id?: string | null
          height_cm?: number | null
          id?: string | null
          internal_id?: string | null
          is_nfs?: boolean | null
          location_id?: string | null
          medium?: string | null
          needs_attention?: never
          notes?: string | null
          price_eur?: number | null
          status?: Database["public"]["Enums"]["artwork_status"] | null
          title?: string | null
          updated_at?: string | null
          width_cm?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artworks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artworks_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artworks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_gallery_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_entity_type:
        | "artwork"
        | "contact"
        | "invoice"
        | "deal"
        | "card"
        | "loan"
        | "consignment"
        | "shipment"
        | "document"
      app_role: "admin" | "staff"
      artwork_status: "available" | "on_hold" | "sold" | "archived"
      card_label:
        | "red"
        | "orange"
        | "yellow"
        | "green"
        | "blue"
        | "purple"
        | "shipping"
      collection_kind: "exhibition" | "fair" | "viewing_room" | "other"
      consignment_status: "active" | "returned" | "sold"
      contact_activity_kind:
        | "artwork_shown"
        | "dossier_sent"
        | "reply"
        | "purchase"
      deal_stage:
        | "lead"
        | "interested"
        | "offer_sent"
        | "negotiating"
        | "won"
        | "lost"
      dossier_kind:
        | "solo_show"
        | "group_show"
        | "special"
        | "art_fair"
        | "collector_offer"
        | "editorial"
      feedback_kind: "bug" | "feature"
      invoice_status: "draft" | "sent" | "paid" | "cancelled"
      loan_status: "active" | "returned" | "overdue"
      shipment_status: "prep" | "in_transit" | "delivered" | "returned"
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
      activity_entity_type: [
        "artwork",
        "contact",
        "invoice",
        "deal",
        "card",
        "loan",
        "consignment",
        "shipment",
        "document",
      ],
      app_role: ["admin", "staff"],
      artwork_status: ["available", "on_hold", "sold", "archived"],
      card_label: [
        "red",
        "orange",
        "yellow",
        "green",
        "blue",
        "purple",
        "shipping",
      ],
      collection_kind: ["exhibition", "fair", "viewing_room", "other"],
      consignment_status: ["active", "returned", "sold"],
      contact_activity_kind: [
        "artwork_shown",
        "dossier_sent",
        "reply",
        "purchase",
      ],
      deal_stage: [
        "lead",
        "interested",
        "offer_sent",
        "negotiating",
        "won",
        "lost",
      ],
      dossier_kind: [
        "solo_show",
        "group_show",
        "special",
        "art_fair",
        "collector_offer",
        "editorial",
      ],
      feedback_kind: ["bug", "feature"],
      invoice_status: ["draft", "sent", "paid", "cancelled"],
      loan_status: ["active", "returned", "overdue"],
      shipment_status: ["prep", "in_transit", "delivered", "returned"],
    },
  },
} as const
