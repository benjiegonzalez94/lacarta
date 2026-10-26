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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      business_hours: {
        Row: {
          close_time: string
          day_of_week: number
          id: string
          is_open: boolean
          open_time: string
          tenant_id: string
        }
        Insert: {
          close_time?: string
          day_of_week: number
          id?: string
          is_open?: boolean
          open_time?: string
          tenant_id: string
        }
        Update: {
          close_time?: string
          day_of_week?: number
          id?: string
          is_open?: boolean
          open_time?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      modifier_groups: {
        Row: {
          created_at: string
          id: string
          max_select: number
          min_select: number
          name: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_select?: number
          min_select?: number
          name: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_select?: number
          min_select?: number
          name?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modifier_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      modifier_options: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_available: boolean
          name: string
          price_delta: number
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_available?: boolean
          name: string
          price_delta?: number
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_available?: boolean
          name?: string
          price_delta?: number
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modifier_options_group_id_tenant_id_fkey"
            columns: ["group_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "modifier_groups"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "modifier_options_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          line_total: number
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          tenant_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          line_total: number
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          tenant_id: string
          unit_price: number
        }
        Update: {
          id?: string
          line_total?: number
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          tenant_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_tenant_id_fkey"
            columns: ["order_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          arrival_mode: string
          created_at: string
          customer_avatar_url: string | null
          customer_cedula: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_reference: string | null
          id: string
          manual_table_number: number | null
          notes: string | null
          order_type: string
          payment_method: string
          payment_proof_url: string | null
          pickup_pin: string
          status: string
          subtotal: number
          table_id: string | null
          tenant_id: string
          total: number
        }
        Insert: {
          arrival_mode?: string
          created_at?: string
          customer_avatar_url?: string | null
          customer_cedula?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_reference?: string | null
          id?: string
          manual_table_number?: number | null
          notes?: string | null
          order_type: string
          payment_method?: string
          payment_proof_url?: string | null
          pickup_pin?: string
          status?: string
          subtotal?: number
          table_id?: string | null
          tenant_id: string
          total?: number
        }
        Update: {
          arrival_mode?: string
          created_at?: string
          customer_avatar_url?: string | null
          customer_cedula?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_reference?: string | null
          id?: string
          manual_table_number?: number | null
          notes?: string | null
          order_type?: string
          payment_method?: string
          payment_proof_url?: string | null
          pickup_pin?: string
          status?: string
          subtotal?: number
          table_id?: string | null
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_tenant_id_fkey"
            columns: ["table_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modifier_groups: {
        Row: {
          group_id: string
          product_id: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          group_id: string
          product_id: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          group_id?: string
          product_id?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_modifier_groups_group_id_tenant_id_fkey"
            columns: ["group_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "modifier_groups"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "product_modifier_groups_product_id_tenant_id_fkey"
            columns: ["product_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "product_modifier_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          sort_order: number
          tenant_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price: number
          sort_order?: number
          tenant_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_tenant_id_fkey"
            columns: ["category_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string
          id: string
          qr_token: string
          table_number: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          qr_token?: string
          table_number: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          qr_token?: string
          table_number?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          bank_details: string | null
          banner_url: string | null
          created_at: string
          delivery_fee: number
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          phone: string
          primary_color: string
          secondary_color: string
          slogan: string
          slug: string
        }
        Insert: {
          address?: string | null
          bank_details?: string | null
          banner_url?: string | null
          created_at?: string
          delivery_fee?: number
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          phone: string
          primary_color?: string
          secondary_color?: string
          slogan?: string
          slug: string
        }
        Update: {
          address?: string | null
          bank_details?: string | null
          banner_url?: string | null
          created_at?: string
          delivery_fee?: number
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string
          primary_color?: string
          secondary_color?: string
          slogan?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_order_table: {
        Args: { p_order_id: string; p_slug: string; p_table_token: string }
        Returns: number
      }
      assign_order_table_number: {
        Args: { p_order_id: string; p_table_number: number }
        Returns: number
      }
      get_customer_trust_profile: {
        Args: { p_phone: string }
        Returns: {
          cash_allowed: boolean
          completed_orders: number
          max_cash_remote: number
          no_show_orders: number
          trust_tier: string
        }[]
      }
      get_order_live_status: {
        Args: { p_order_id: string }
        Returns: {
          arrival_mode: string
          created_at: string
          customer_name: string
          has_payment_proof: boolean
          items: Json
          order_id: string
          order_type: string
          payment_method: string
          pickup_pin: string
          status: string
          table_number: number
          tenant_name: string
          tenant_phone: string
          tenant_slug: string
          total: number
        }[]
      }
      is_tenant_owner: { Args: { p_tenant_id: string }; Returns: boolean }
      list_public_tables: {
        Args: { p_slug: string }
        Returns: {
          qr_token: string
          table_id: string
          table_number: number
        }[]
      }
      place_order: {
        Args: {
          p_arrival_mode?: string
          p_customer_avatar_url?: string
          p_customer_cedula?: string
          p_customer_name?: string
          p_customer_phone?: string
          p_delivery_address?: string
          p_delivery_lat?: number
          p_delivery_lng?: number
          p_delivery_reference?: string
          p_items: Json
          p_notes?: string
          p_order_type: string
          p_payment_method?: string
          p_payment_proof_url?: string
          p_slug: string
          p_table_number?: number
          p_table_token?: string
        }
        Returns: string
      }
      resolve_table: {
        Args: { p_qr_token: string; p_slug: string }
        Returns: {
          table_id: string
          table_number: number
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
