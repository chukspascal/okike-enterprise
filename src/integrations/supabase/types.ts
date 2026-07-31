export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          role: "user" | "assistant" | "system" | "tool";
          content: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: "user" | "assistant" | "system" | "tool";
          content?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: "user" | "assistant" | "system" | "tool";
          content?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      addons: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          position: number;
          price: number;
          published: boolean;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          position?: number;
          price?: number;
          published?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          position?: number;
          price?: number;
          published?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      client_projects: {
        Row: {
          admin_notes: string | null;
          client_email: string;
          client_user_id: string | null;
          created_at: string;
          currency: string;
          deposit: number | null;
          id: string;
          inquiry_id: string | null;
          package_name: string | null;
          stage: Database["public"]["Enums"]["project_stage"];
          title: string;
          total: number | null;
          updated_at: string;
        };
        Insert: {
          admin_notes?: string | null;
          client_email: string;
          client_user_id?: string | null;
          created_at?: string;
          currency?: string;
          deposit?: number | null;
          id?: string;
          inquiry_id?: string | null;
          package_name?: string | null;
          stage?: Database["public"]["Enums"]["project_stage"];
          title: string;
          total?: number | null;
          updated_at?: string;
        };
        Update: {
          admin_notes?: string | null;
          client_email?: string;
          client_user_id?: string | null;
          created_at?: string;
          currency?: string;
          deposit?: number | null;
          id?: string;
          inquiry_id?: string | null;
          package_name?: string | null;
          stage?: Database["public"]["Enums"]["project_stage"];
          title?: string;
          total?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_projects_inquiry_id_fkey";
            columns: ["inquiry_id"];
            isOneToOne: false;
            referencedRelation: "project_inquiries";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
        };
        Relationships: [];
      };
      course_enrollments: {
        Row: {
          created_at: string;
          email: string;
          experience_level: string;
          goals: string;
          id: string;
          name: string;
          phone: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          experience_level: string;
          goals: string;
          id?: string;
          name: string;
          phone?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          experience_level?: string;
          goals?: string;
          id?: string;
          name?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      packages: {
        Row: {
          created_at: string;
          currency: string;
          featured: boolean;
          features: Json;
          id: string;
          name: string;
          position: number;
          price: number | null;
          published: boolean;
          request_quote: boolean;
          slug: string;
          tagline: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          featured?: boolean;
          features?: Json;
          id?: string;
          name: string;
          position?: number;
          price?: number | null;
          published?: boolean;
          request_quote?: boolean;
          slug: string;
          tagline?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          featured?: boolean;
          features?: Json;
          id?: string;
          name?: string;
          position?: number;
          price?: number | null;
          published?: boolean;
          request_quote?: boolean;
          slug?: string;
          tagline?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      partners: {
        Row: {
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          position: number;
          published: boolean;
          updated_at: string;
          url: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          position?: number;
          published?: boolean;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          position?: number;
          published?: boolean;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      portfolio_items: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          position: number;
          published: boolean;
          tags: string[];
          title: string;
          updated_at: string;
          url: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          position?: number;
          published?: boolean;
          tags?: string[];
          title: string;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          position?: number;
          published?: boolean;
          tags?: string[];
          title?: string;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      project_inquiries: {
        Row: {
          budget: string | null;
          client_user_id: string | null;
          company: string | null;
          created_at: string;
          details: string;
          email: string;
          id: string;
          name: string;
          phone: string | null;
          project_type: string;
          status: string;
          timeline: string | null;
        };
        Insert: {
          budget?: string | null;
          client_user_id?: string | null;
          company?: string | null;
          created_at?: string;
          details: string;
          email: string;
          id?: string;
          name: string;
          phone?: string | null;
          project_type: string;
          status?: string;
          timeline?: string | null;
        };
        Update: {
          budget?: string | null;
          client_user_id?: string | null;
          company?: string | null;
          created_at?: string;
          details?: string;
          email?: string;
          id?: string;
          name?: string;
          phone?: string | null;
          project_type?: string;
          status?: string;
          timeline?: string | null;
        };
        Relationships: [];
      };
      project_milestones: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          note: string | null;
          position: number;
          project_id: string;
          status: Database["public"]["Enums"]["milestone_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          note?: string | null;
          position?: number;
          project_id: string;
          status?: Database["public"]["Enums"]["milestone_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          note?: string | null;
          position?: number;
          project_id?: string;
          status?: Database["public"]["Enums"]["milestone_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_updates: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          message: string;
          project_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          message: string;
          project_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          message?: string;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_updates_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          created_at: string;
          description: string | null;
          icon: string | null;
          id: string;
          position: number;
          published: boolean;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          position?: number;
          published?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          position?: number;
          published?: boolean;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value?: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          bio: string | null;
          created_at: string;
          id: string;
          image_url: string | null;
          name: string;
          position: number;
          published: boolean;
          role: string | null;
          updated_at: string;
        };
        Insert: {
          bio?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          name: string;
          position?: number;
          published?: boolean;
          role?: string | null;
          updated_at?: string;
        };
        Update: {
          bio?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          name?: string;
          position?: number;
          published?: boolean;
          role?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      blog_posts: {
        Row: {
          author: string | null;
          content: string | null;
          created_at: string;
          excerpt: string | null;
          id: string;
          image_url: string | null;
          position: number;
          published: boolean;
          slug: string;
          tags: string[];
          title: string;
          updated_at: string;
        };
        Insert: {
          author?: string | null;
          content?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          image_url?: string | null;
          position?: number;
          published?: boolean;
          slug: string;
          tags?: string[];
          title: string;
          updated_at?: string;
        };
        Update: {
          author?: string | null;
          content?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          image_url?: string | null;
          position?: number;
          published?: boolean;
          slug?: string;
          tags?: string[];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          title: string;
          slug: string | null;
          description: string | null;
          image_url: string | null;
          date: string | null;
          end_date: string | null;
          location: string | null;
          venue: string | null;
          event_type: string | null;
          tags: string[];
          registration_url: string | null;
          is_free: boolean;
          price: number | null;
          spots_available: number | null;
          published: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug?: string | null;
          description?: string | null;
          image_url?: string | null;
          date?: string | null;
          end_date?: string | null;
          location?: string | null;
          venue?: string | null;
          event_type?: string | null;
          tags?: string[];
          registration_url?: string | null;
          is_free?: boolean;
          price?: number | null;
          spots_available?: number | null;
          published?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string | null;
          description?: string | null;
          image_url?: string | null;
          date?: string | null;
          end_date?: string | null;
          location?: string | null;
          venue?: string | null;
          event_type?: string | null;
          tags?: string[];
          registration_url?: string | null;
          is_free?: boolean;
          price?: number | null;
          spots_available?: number | null;
          published?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      }; courses: {
        Row: {
          created_at: string;
          description: string | null;
          duration: string;
          id: string;
          image_url: string | null;
          instructor: string | null;
          lessons: Json;
          position: number;
          published: boolean;
          slug: string;
          title: string;
          track: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          duration: string;
          id?: string;
          image_url?: string | null;
          instructor?: string | null;
          lessons?: Json;
          position?: number;
          published?: boolean;
          slug: string;
          title: string;
          track: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          duration?: string;
          id?: string;
          image_url?: string | null;
          instructor?: string | null;
          lessons?: Json;
          position?: number;
          published?: boolean;
          slug?: string;
          title?: string;
          track?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "client" | "instructor";
      milestone_status: "pending" | "active" | "done";
      project_stage:
      | "submitted"
      | "reviewing"
      | "accepted"
      | "declined"
      | "in_progress"
      | "completed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
    Row: infer R;
  }
  ? R
  : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I;
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I;
  }
  ? I
  : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U;
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U;
  }
  ? U
  : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "client", "instructor"],
      milestone_status: ["pending", "active", "done"],
      project_stage: ["submitted", "reviewing", "accepted", "declined", "in_progress", "completed"],
    },
  },
} as const;
