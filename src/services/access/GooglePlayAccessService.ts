import type {
  AccessGrant,
  AccessSourceService,
} from '../../models/access';

export type GooglePlayEntitlementLoader =
  () => Promise<AccessGrant | null>;

export class GooglePlayAccessService
  implements AccessSourceService
{
  readonly source = 'google_play' as const;

  constructor(
    private loadEntitlement: GooglePlayEntitlementLoader,
  ) {}

  async getCurrentGrant(): Promise<AccessGrant | null> {
    const grant = await this.loadEntitlement();

    if (!grant) {
      return null;
    }

    if (grant.source !== 'google_play') {
      throw new Error(
        'Invalid entitlement source returned by Google Play service.',
      );
    }

    return grant;
  }
}