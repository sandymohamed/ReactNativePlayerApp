import {
  AccessGrant,
  AccessSnapshot,
  AccessSourceService,
} from '../../models/access';

export class AccessService {
  private providers: AccessSourceService[];

  constructor(providers: AccessSourceService[]) {
    this.providers = providers;
  }

  private isGrantValid(grant: AccessGrant): boolean {
    const now = Date.now();

    if (
      grant.status !== 'active' &&
      grant.status !== 'grace_period'
    ) {
      return false;
    }

    if (
      grant.expiresAt !== null &&
      grant.expiresAt <= now
    ) {
      return false;
    }

    return true;
  }

  async getAccessSnapshot(): Promise<AccessSnapshot> {
    const results = await Promise.allSettled(
      this.providers.map(provider =>
        provider.getCurrentGrant(),
      ),
    );

    const grants: AccessGrant[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        grants.push(result.value);
      } else if (result.status === 'rejected') {
        console.warn(
          `[AccessService] ${this.providers[index].source} verification failed:`,
          result.reason,
        );
      }
    });

    const validGrants = grants.filter(grant =>
      this.isGrantValid(grant),
    );

    return {
      hasAccess: validGrants.length > 0,
      grants: validGrants,
      checkedAt: Date.now(),
    };
  }
}