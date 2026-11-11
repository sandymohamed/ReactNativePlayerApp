export type AccessSource = 'provider' | 'google_play';

export type AccessPlan =
  | 'provider_activation'
  | 'monthly'
  | 'yearly';

export type AccessGrantStatus =
  | 'active'
  | 'grace_period'
  | 'billing_issue'
  | 'expired';

export interface AccessGrant {
  source: AccessSource;
  plan: AccessPlan;
  status: AccessGrantStatus;

  productId?: string;
  expiresAt: number | null;

  verifiedAt: number;
  autoRenewing?: boolean;
}

export interface AccessSnapshot {
  hasAccess: boolean;
  grants: AccessGrant[];
  checkedAt: number;
}

export interface AccessSourceService {
  readonly source: AccessSource;

  getCurrentGrant(): Promise<AccessGrant | null>;
}

export interface SubscriptionProduct {
  id: string;
  plan: 'monthly' | 'yearly';
  platform: 'google_play' | 'app_store';
}