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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json
          summary: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          summary?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          summary?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          business_name: string
          city: string | null
          created_at: string
          email: string | null
          google_directions_url: string | null
          google_maps_embed_url: string | null
          google_maps_url: string | null
          google_rating: number | null
          google_review_count: number | null
          google_review_write_url: string | null
          google_reviews_url: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          offer_banner_active: boolean
          offer_banner_text: string | null
          offer_banner_url: string | null
          opening_hours: Json
          payment_methods: string[]
          phone: string | null
          postcode: string | null
          social_links: Json
          storefront_image_url: string | null
          storefront_interior_image_url: string | null
          tagline: string | null
          timezone: string
          updated_at: string
          warranty_policy: string | null
          whatsapp: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          business_name: string
          city?: string | null
          created_at?: string
          email?: string | null
          google_directions_url?: string | null
          google_maps_embed_url?: string | null
          google_maps_url?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          google_review_write_url?: string | null
          google_reviews_url?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          offer_banner_active?: boolean
          offer_banner_text?: string | null
          offer_banner_url?: string | null
          opening_hours?: Json
          payment_methods?: string[]
          phone?: string | null
          postcode?: string | null
          social_links?: Json
          storefront_image_url?: string | null
          storefront_interior_image_url?: string | null
          tagline?: string | null
          timezone?: string
          updated_at?: string
          warranty_policy?: string | null
          whatsapp?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          business_name?: string
          city?: string | null
          created_at?: string
          email?: string | null
          google_directions_url?: string | null
          google_maps_embed_url?: string | null
          google_maps_url?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          google_review_write_url?: string | null
          google_reviews_url?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          offer_banner_active?: boolean
          offer_banner_text?: string | null
          offer_banner_url?: string | null
          opening_hours?: Json
          payment_methods?: string[]
          phone?: string | null
          postcode?: string | null
          social_links?: Json
          storefront_image_url?: string | null
          storefront_interior_image_url?: string | null
          tagline?: string | null
          timezone?: string
          updated_at?: string
          warranty_policy?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      customer_ledger_entries: {
        Row: {
          created_at: string
          created_by: string | null
          credit_pence: number
          customer_id: string
          debit_pence: number
          entry_type: string
          id: string
          invoice_id: string | null
          note: string | null
          payment_id: string | null
          reference: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credit_pence?: number
          customer_id: string
          debit_pence?: number
          entry_type: string
          id?: string
          invoice_id?: string | null
          note?: string | null
          payment_id?: string | null
          reference?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credit_pence?: number
          customer_id?: string
          debit_pence?: number
          entry_type?: string
          id?: string
          invoice_id?: string | null
          note?: string | null
          payment_id?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_ledger_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_ledger_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_ledger_entries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_reviews: {
        Row: {
          author_name: string
          created_at: string
          id: string
          public_visible: boolean
          quote: string
          rating: number | null
          reviewed_on: string | null
          sort_order: number
          source: string
          updated_at: string
        }
        Insert: {
          author_name: string
          created_at?: string
          id?: string
          public_visible?: boolean
          quote: string
          rating?: number | null
          reviewed_on?: string | null
          sort_order?: number
          source?: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          created_at?: string
          id?: string
          public_visible?: boolean
          quote?: string
          rating?: number | null
          reviewed_on?: string | null
          sort_order?: number
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          phone_normalized: string | null
          postcode: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          phone_normalized?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          phone_normalized?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      doc_sequences: {
        Row: {
          last_value: number
          prefix: string
        }
        Insert: {
          last_value?: number
          prefix: string
        }
        Update: {
          last_value?: number
          prefix?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          public_visible: boolean
          question: string
          sort_order: number
          topic: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          public_visible?: boolean
          question: string
          sort_order?: number
          topic?: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          public_visible?: boolean
          question?: string
          sort_order?: number
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total_pence: number
          meta: Json
          product_id: string | null
          quantity: number
          stock_item_id: string | null
          unit_price_pence: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total_pence?: number
          meta?: Json
          product_id?: string | null
          quantity?: number
          stock_item_id?: string | null
          unit_price_pence?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total_pence?: number
          meta?: Json
          product_id?: string | null
          quantity?: number
          stock_item_id?: string | null
          unit_price_pence?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_terms: {
        Row: {
          additional_terms: string | null
          created_at: string
          created_by: string | null
          customer_acknowledged: boolean
          customer_message: string | null
          customer_note: string | null
          exclusions_text: string | null
          footer_note: string | null
          id: string
          internal_note: string | null
          invoice_id: string
          invoice_type: string
          print_customer_note: boolean
          settings_snapshot: Json
          short_exclusions: string | null
          show_on_a4: boolean
          show_on_thermal: boolean
          show_signature_line: boolean
          show_terms_on_request: boolean | null
          terms_on_request_text: string | null
          terms_text: string | null
          warranty_days: number
          warranty_expires: string | null
          warranty_text: string | null
          warranty_title: string | null
        }
        Insert: {
          additional_terms?: string | null
          created_at?: string
          created_by?: string | null
          customer_acknowledged?: boolean
          customer_message?: string | null
          customer_note?: string | null
          exclusions_text?: string | null
          footer_note?: string | null
          id?: string
          internal_note?: string | null
          invoice_id: string
          invoice_type: string
          print_customer_note?: boolean
          settings_snapshot?: Json
          short_exclusions?: string | null
          show_on_a4?: boolean
          show_on_thermal?: boolean
          show_signature_line?: boolean
          show_terms_on_request?: boolean | null
          terms_on_request_text?: string | null
          terms_text?: string | null
          warranty_days?: number
          warranty_expires?: string | null
          warranty_text?: string | null
          warranty_title?: string | null
        }
        Update: {
          additional_terms?: string | null
          created_at?: string
          created_by?: string | null
          customer_acknowledged?: boolean
          customer_message?: string | null
          customer_note?: string | null
          exclusions_text?: string | null
          footer_note?: string | null
          id?: string
          internal_note?: string | null
          invoice_id?: string
          invoice_type?: string
          print_customer_note?: boolean
          settings_snapshot?: Json
          short_exclusions?: string | null
          show_on_a4?: boolean
          show_on_thermal?: boolean
          show_signature_line?: boolean
          show_terms_on_request?: boolean | null
          terms_on_request_text?: string | null
          terms_text?: string | null
          warranty_days?: number
          warranty_expires?: string | null
          warranty_text?: string | null
          warranty_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_terms_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: true
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_terms_settings: {
        Row: {
          accessories_note: string
          activation_note: string
          battery_disclaimer: string
          customer_message: string
          default_terms: string
          default_warranty_days: number
          doa_days: number
          enable_warranty: boolean
          exclusions_text: string
          footer_note: string
          id_verification_note: string
          label: string
          manufacturer_note: string
          payment_ack_text: string
          require_acknowledgement: boolean
          returns_policy: string
          seller_declaration: string
          short_exclusions: string
          show_exclusions: boolean
          show_on_a4: boolean
          show_on_thermal: boolean
          show_signature_line: boolean
          show_terms_on_request: boolean
          terms_on_request_text: string
          type: string
          updated_at: string
          warranty_text: string
          warranty_title: string
        }
        Insert: {
          accessories_note?: string
          activation_note?: string
          battery_disclaimer?: string
          customer_message?: string
          default_terms?: string
          default_warranty_days?: number
          doa_days?: number
          enable_warranty?: boolean
          exclusions_text?: string
          footer_note?: string
          id_verification_note?: string
          label: string
          manufacturer_note?: string
          payment_ack_text?: string
          require_acknowledgement?: boolean
          returns_policy?: string
          seller_declaration?: string
          short_exclusions?: string
          show_exclusions?: boolean
          show_on_a4?: boolean
          show_on_thermal?: boolean
          show_signature_line?: boolean
          show_terms_on_request?: boolean
          terms_on_request_text?: string
          type: string
          updated_at?: string
          warranty_text?: string
          warranty_title?: string
        }
        Update: {
          accessories_note?: string
          activation_note?: string
          battery_disclaimer?: string
          customer_message?: string
          default_terms?: string
          default_warranty_days?: number
          doa_days?: number
          enable_warranty?: boolean
          exclusions_text?: string
          footer_note?: string
          id_verification_note?: string
          label?: string
          manufacturer_note?: string
          payment_ack_text?: string
          require_acknowledgement?: boolean
          returns_policy?: string
          seller_declaration?: string
          short_exclusions?: string
          show_exclusions?: boolean
          show_on_a4?: boolean
          show_on_thermal?: boolean
          show_signature_line?: boolean
          show_terms_on_request?: boolean
          terms_on_request_text?: string
          type?: string
          updated_at?: string
          warranty_text?: string
          warranty_title?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_paid_pence: number
          balance_pence: number
          client_ref: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_pence: number
          id: string
          invoice_number: string
          kind: string
          notes: string | null
          payment_status: string
          refund_reason: string | null
          refunded_at: string | null
          refunded_pence: number
          snapshot: Json
          status: string
          subtotal_pence: number
          supplier_id: string | null
          total_pence: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount_paid_pence?: number
          balance_pence?: number
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_pence?: number
          id?: string
          invoice_number: string
          kind: string
          notes?: string | null
          payment_status?: string
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_pence?: number
          snapshot?: Json
          status?: string
          subtotal_pence?: number
          supplier_id?: string | null
          total_pence?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount_paid_pence?: number
          balance_pence?: number
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_pence?: number
          id?: string
          invoice_number?: string
          kind?: string
          notes?: string | null
          payment_status?: string
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_pence?: number
          snapshot?: Json
          status?: string
          subtotal_pence?: number
          supplier_id?: string | null
          total_pence?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_pence: number
          client_ref: string | null
          created_at: string
          created_by: string | null
          direction: string
          id: string
          invoice_id: string
          is_reversal: boolean
          method: string
          notes: string | null
          reference: string | null
        }
        Insert: {
          amount_pence: number
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          invoice_id: string
          is_reversal?: boolean
          method?: string
          notes?: string | null
          reference?: string | null
        }
        Update: {
          amount_pence?: number
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          invoice_id?: string
          is_reversal?: boolean
          method?: string
          notes?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_purchase_items: {
        Row: {
          accessories: string | null
          battery_health: string | null
          brand: string | null
          colour: string | null
          condition: string | null
          cost_pence: number
          created_at: string
          device_checks: Json
          faults: string | null
          id: string
          imei: string | null
          model: string | null
          network: string | null
          purchase_id: string
          serial: string | null
          stock_item_id: string | null
          storage: string | null
        }
        Insert: {
          accessories?: string | null
          battery_health?: string | null
          brand?: string | null
          colour?: string | null
          condition?: string | null
          cost_pence?: number
          created_at?: string
          device_checks?: Json
          faults?: string | null
          id?: string
          imei?: string | null
          model?: string | null
          network?: string | null
          purchase_id: string
          serial?: string | null
          stock_item_id?: string | null
          storage?: string | null
        }
        Update: {
          accessories?: string | null
          battery_health?: string | null
          brand?: string | null
          colour?: string | null
          condition?: string | null
          cost_pence?: number
          created_at?: string
          device_checks?: Json
          faults?: string | null
          id?: string
          imei?: string | null
          model?: string | null
          network?: string | null
          purchase_id?: string
          serial?: string | null
          stock_item_id?: string | null
          storage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "phone_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_purchase_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_purchases: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_method: string
          purchase_date: string
          record_status: string
          seller_customer_id: string | null
          supplier_id: string | null
          total_pence: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: string
          purchase_date?: string
          record_status?: string
          seller_customer_id?: string | null
          supplier_id?: string | null
          total_pence?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: string
          purchase_date?: string
          record_status?: string
          seller_customer_id?: string | null
          supplier_id?: string | null
          total_pence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_purchases_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_purchases_seller_customer_id_fkey"
            columns: ["seller_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          availability: string
          brand: string | null
          category_id: string | null
          colour: string | null
          condition: string | null
          cost_price_pence: number
          created_at: string
          description: string | null
          featured: boolean
          id: string
          model: string | null
          name: string
          price_pence: number | null
          public_visible: boolean
          quantity: number
          reorder_level: number
          short_description: string | null
          sku: string | null
          slug: string
          sort_order: number
          specs: Json
          storage: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          availability?: string
          brand?: string | null
          category_id?: string | null
          colour?: string | null
          condition?: string | null
          cost_price_pence?: number
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          model?: string | null
          name: string
          price_pence?: number | null
          public_visible?: boolean
          quantity?: number
          reorder_level?: number
          short_description?: string | null
          sku?: string | null
          slug: string
          sort_order?: number
          specs?: Json
          storage?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          availability?: string
          brand?: string | null
          category_id?: string | null
          colour?: string | null
          condition?: string | null
          cost_price_pence?: number
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          model?: string | null
          name?: string
          price_pence?: number | null
          public_visible?: boolean
          quantity?: number
          reorder_level?: number
          short_description?: string | null
          sku?: string | null
          slug?: string
          sort_order?: number
          specs?: Json
          storage?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      repair_invoices: {
        Row: {
          accessories_received: string | null
          amount_paid_pence: number
          balance_pence: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_notes: string | null
          device_brand: string | null
          device_condition: string | null
          device_model: string | null
          discount_pence: number
          fault: string
          id: string
          imei: string | null
          internal_notes: string | null
          invoice_id: string | null
          payment_status: string
          record_status: string
          repair_description: string | null
          repair_number: string
          serial: string | null
          subtotal_pence: number
          total_pence: number
          updated_at: string
        }
        Insert: {
          accessories_received?: string | null
          amount_paid_pence?: number
          balance_pence?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          device_brand?: string | null
          device_condition?: string | null
          device_model?: string | null
          discount_pence?: number
          fault: string
          id?: string
          imei?: string | null
          internal_notes?: string | null
          invoice_id?: string | null
          payment_status?: string
          record_status?: string
          repair_description?: string | null
          repair_number: string
          serial?: string | null
          subtotal_pence?: number
          total_pence?: number
          updated_at?: string
        }
        Update: {
          accessories_received?: string | null
          amount_paid_pence?: number
          balance_pence?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          device_brand?: string | null
          device_condition?: string | null
          device_model?: string | null
          discount_pence?: number
          fault?: string
          id?: string
          imei?: string | null
          internal_notes?: string | null
          invoice_id?: string | null
          payment_status?: string
          record_status?: string
          repair_description?: string | null
          repair_number?: string
          serial?: string | null
          subtotal_pence?: number
          total_pence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_invoices_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_services: {
        Row: {
          brand: string | null
          category: string
          created_at: string
          description: string | null
          featured: boolean
          icon: string | null
          id: string
          image_url: string | null
          name: string
          public_visible: boolean
          slug: string
          sort_order: number
          starting_price_pence: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          public_visible?: boolean
          slug: string
          sort_order?: number
          starting_price_pence?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          public_visible?: boolean
          slug?: string
          sort_order?: number
          starting_price_pence?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string
          description: string
          id: string
          line_total_pence: number
          product_id: string | null
          quantity: number
          sale_id: string
          stock_item_id: string | null
          unit_cost_pence: number
          unit_price_pence: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          line_total_pence?: number
          product_id?: string | null
          quantity?: number
          sale_id: string
          stock_item_id?: string | null
          unit_cost_pence?: number
          unit_price_pence?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          line_total_pence?: number
          product_id?: string | null
          quantity?: number
          sale_id?: string
          stock_item_id?: string | null
          unit_cost_pence?: number
          unit_price_pence?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cost_pence: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_pence: number
          id: string
          invoice_id: string | null
          notes: string | null
          record_status: string
          sale_kind: string
          subtotal_pence: number
          total_pence: number
          updated_at: string
        }
        Insert: {
          cost_pence?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_pence?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          record_status?: string
          sale_kind: string
          subtotal_pence?: number
          total_pence?: number
          updated_at?: string
        }
        Update: {
          cost_pence?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_pence?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          record_status?: string
          sale_kind?: string
          subtotal_pence?: number
          total_pence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          battery_health: string | null
          brand: string | null
          colour: string | null
          condition: string | null
          created_at: string
          created_by: string | null
          featured: boolean
          id: string
          imei: string | null
          model: string | null
          network: string | null
          notes: string | null
          public_visibility: boolean
          purchase_cost_pence: number
          purchase_reference: string | null
          selling_price_pence: number | null
          serial: string | null
          sku: string
          source: string | null
          status: string
          storage: string | null
          updated_at: string
        }
        Insert: {
          battery_health?: string | null
          brand?: string | null
          colour?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          featured?: boolean
          id?: string
          imei?: string | null
          model?: string | null
          network?: string | null
          notes?: string | null
          public_visibility?: boolean
          purchase_cost_pence?: number
          purchase_reference?: string | null
          selling_price_pence?: number | null
          serial?: string | null
          sku: string
          source?: string | null
          status?: string
          storage?: string | null
          updated_at?: string
        }
        Update: {
          battery_health?: string | null
          brand?: string | null
          colour?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          featured?: boolean
          id?: string
          imei?: string | null
          model?: string | null
          network?: string | null
          notes?: string | null
          public_visibility?: boolean
          purchase_cost_pence?: number
          purchase_reference?: string | null
          selling_price_pence?: number | null
          serial?: string | null
          sku?: string
          source?: string | null
          status?: string
          storage?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          product_id: string | null
          quantity_change: number
          reason: string | null
          reference: string | null
          stock_item_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          product_id?: string | null
          quantity_change: number
          reason?: string | null
          reference?: string | null
          stock_item_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          product_id?: string | null
          quantity_change?: number
          reason?: string | null
          reference?: string | null
          stock_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_ledger_entries: {
        Row: {
          created_at: string
          created_by: string | null
          credit_pence: number
          debit_pence: number
          entry_type: string
          id: string
          invoice_id: string | null
          note: string | null
          payment_id: string | null
          reference: string | null
          supplier_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credit_pence?: number
          debit_pence?: number
          entry_type: string
          id?: string
          invoice_id?: string | null
          note?: string | null
          payment_id?: string | null
          reference?: string | null
          supplier_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credit_pence?: number
          debit_pence?: number
          entry_type?: string
          id?: string
          invoice_id?: string | null
          note?: string | null
          payment_id?: string | null
          reference?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ledger_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ledger_entries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ledger_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      website_enquiries: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          metadata: Json
          name: string
          phone: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          name: string
          phone: string
          status?: string
          type?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          name?: string
          phone?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_product_stock: {
        Args: { p: Json }
        Returns: {
          active: boolean
          availability: string
          brand: string | null
          category_id: string | null
          colour: string | null
          condition: string | null
          cost_price_pence: number
          created_at: string
          description: string | null
          featured: boolean
          id: string
          model: string | null
          name: string
          price_pence: number | null
          public_visible: boolean
          quantity: number
          reorder_level: number
          short_description: string | null
          sku: string | null
          slug: string
          sort_order: number
          specs: Json
          storage: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_invoice_terms: {
        Args: { p_actor?: string; p_invoice_id: string; p_terms?: Json }
        Returns: Json
      }
      attach_invoice_terms: { Args: { p: Json }; Returns: Json }
      business_snapshot: { Args: never; Returns: Json }
      buy_phone: { Args: { p: Json }; Returns: Json }
      create_repair_invoice: { Args: { p: Json }; Returns: Json }
      direct_sale: { Args: { p: Json }; Returns: Json }
      ensure_profile: {
        Args: { _email?: string; _full_name?: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _entity: string
          _entity_id: string
          _meta?: Json
          _summary: string
        }
        Returns: undefined
      }
      next_doc_number: { Args: { _prefix: string }; Returns: string }
      norm_phone: { Args: { _p: string }; Returns: string }
      recalc_invoice: { Args: { _invoice_id: string }; Returns: undefined }
      refund_invoice: { Args: { p: Json }; Returns: Json }
      render_terms_message: {
        Args: { p_text: string; p_vars: Json }
        Returns: string
      }
      require_staff: { Args: never; Returns: string }
      save_customer: {
        Args: { p: Json }
        Returns: {
          address: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          phone_normalized: string | null
          postcode: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_product: {
        Args: { p: Json }
        Returns: {
          active: boolean
          availability: string
          brand: string | null
          category_id: string | null
          colour: string | null
          condition: string | null
          cost_price_pence: number
          created_at: string
          description: string | null
          featured: boolean
          id: string
          model: string | null
          name: string
          price_pence: number | null
          public_visible: boolean
          quantity: number
          reorder_level: number
          short_description: string | null
          sku: string | null
          slug: string
          sort_order: number
          specs: Json
          storage: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_supplier: {
        Args: { p: Json }
        Returns: {
          address: string | null
          company: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "suppliers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sell_phone: { Args: { p: Json }; Returns: Json }
      set_user_role: { Args: { p: Json }; Returns: Json }
      take_payment: { Args: { p: Json }; Returns: Json }
      update_stock_item: {
        Args: { p: Json }
        Returns: {
          battery_health: string | null
          brand: string | null
          colour: string | null
          condition: string | null
          created_at: string
          created_by: string | null
          featured: boolean
          id: string
          imei: string | null
          model: string | null
          network: string | null
          notes: string | null
          public_visibility: boolean
          purchase_cost_pence: number
          purchase_reference: string | null
          selling_price_pence: number | null
          serial: string | null
          sku: string
          source: string | null
          status: string
          storage: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stock_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      void_invoice: { Args: { p: Json }; Returns: Json }
    }
    Enums: {
      app_role: "OWNER" | "ADMIN" | "STAFF" | "TECHNICIAN"
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
      app_role: ["OWNER", "ADMIN", "STAFF", "TECHNICIAN"],
    },
  },
} as const
