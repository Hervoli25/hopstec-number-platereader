export interface FeatureDefinition {
  code: string;
  name: string;
  description: string;
  enabledForPlans: string[]; // tenant plans that get this feature
}

export const FEATURES = {
  PARKING: "parking",
  CRM_INTEGRATION: "crm_integration",
  LOYALTY: "loyalty",
  INVENTORY: "inventory",
  PUSH_NOTIFICATIONS: "push_notifications",
  SMS_NOTIFICATIONS: "sms_notifications",
  VOICE_COMMANDS: "voice_commands",
  MULTI_BRANCH: "multi_branch",
  CUSTOM_BRANDING: "custom_branding",
  API_ACCESS: "api_access",
} as const;

export type FeatureCode = (typeof FEATURES)[keyof typeof FEATURES];

export const DEFAULT_FEATURE_FLAGS: FeatureDefinition[] = [
  { code: FEATURES.PARKING, name: "Parking Management", description: "Parking sessions, zones, and billing", enabledForPlans: ["basic", "pro", "enterprise"] },
  { code: FEATURES.CRM_INTEGRATION, name: "CRM Integration", description: "Connect to external CRM for bookings and memberships", enabledForPlans: ["pro", "enterprise"] },
  { code: FEATURES.LOYALTY, name: "Loyalty Program", description: "Points, tiers, and rewards", enabledForPlans: ["pro", "enterprise"] },
  { code: FEATURES.INVENTORY, name: "Inventory Tracking", description: "Track supplies, consumption, and purchase orders", enabledForPlans: ["pro", "enterprise"] },
  { code: FEATURES.PUSH_NOTIFICATIONS, name: "Push Notifications", description: "Web push notifications to staff and customers", enabledForPlans: ["basic", "pro", "enterprise"] },
  { code: FEATURES.SMS_NOTIFICATIONS, name: "SMS/WhatsApp Notifications", description: "Twilio-powered SMS and WhatsApp messaging", enabledForPlans: ["pro", "enterprise"] },
  { code: FEATURES.VOICE_COMMANDS, name: "Voice Commands", description: "Hands-free voice control for technicians", enabledForPlans: ["pro", "enterprise"] },
  { code: FEATURES.MULTI_BRANCH, name: "Multi-Branch", description: "Manage multiple locations from one dashboard", enabledForPlans: ["pro", "enterprise"] },
  { code: FEATURES.CUSTOM_BRANDING, name: "Custom Branding", description: "Custom logo, colors, and domain", enabledForPlans: ["pro", "enterprise"] },
  { code: FEATURES.API_ACCESS, name: "API Access", description: "REST API access for integrations", enabledForPlans: ["enterprise"] },
];
