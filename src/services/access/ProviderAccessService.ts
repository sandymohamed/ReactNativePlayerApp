
import type {
  AccessGrant,
  AccessSourceService,
} from '../../models/access';

import type { LoginModel } from '../../models/model';

type ProviderLoginLoader = () => Promise<LoginModel | null>;

export class ProviderAccessService implements AccessSourceService {
  readonly source = 'provider' as const;

  constructor(private loadLogin: ProviderLoginLoader) {}

  /**
   * Supports:
   * - DD-MM-YYYY
   * - YYYY-MM-DD
   * - YYYY-MM-DD HH:mm:ss
   * - ISO timestamps
   *
   * Date-only values are treated as valid until the end
   * of that date in the device's local timezone.
   */
  private parseExpiry(value?: string | null): number | null {
    if (!value || typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();

    if (!normalized) {
      return null;
    }

    const dateOnlyMatch = normalized.match(
      /^(\d{2})-(\d{2})-(\d{4})$/,
    );

    if (dateOnlyMatch) {
      const [, day, month, year] = dateOnlyMatch;

      const timestamp = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        23,
        59,
        59,
        999,
      ).getTime();

      const parsed = new Date(timestamp);

      if (
        parsed.getDate() !== Number(day) ||
        parsed.getMonth() !== Number(month) - 1 ||
        parsed.getFullYear() !== Number(year)
      ) {
        return null;
      }

      return timestamp;
    }

    const isoValue = normalized.includes(' ')
      ? normalized.replace(' ', 'T')
      : normalized;

    const timestamp = new Date(isoValue).getTime();

    return Number.isFinite(timestamp) ? timestamp : null;
  }

  async getCurrentGrant(): Promise<AccessGrant | null> {
    const login = await this.loadLogin();

    if (!login) {
      return null;
    }

    // Only an activated provider account can grant access.
    if (login.status !== 1) {
      return null;
    }

    // Do not treat provider trials as paid activations.
    if (login.is_terial === true) {
      return null;
    }

    const expiresAt = this.parseExpiry(login.ExipiredAt);

    if (!expiresAt || expiresAt <= Date.now()) {
      return null;
    }

    return {
      source: 'provider',
      plan: 'provider_activation',
      status: 'active',
      expiresAt,
      verifiedAt: Date.now(),
    };
  }
}
