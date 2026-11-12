import type { AccessGrant } from "../../models/access";
import type { LoginModel } from "../../models/model";
import { AccessService } from "./AccessService";
import { GooglePlayAccessService } from "./GooglePlayAccessService";
import { ProviderAccessService } from "./ProviderAccessService";

// Supply a loader backed by verified purchase tokens when Play Billing is connected.
export async function loadVerifiedGooglePlayGrant(): Promise<AccessGrant | null> {
  return null;
}

export async function evaluateAccess(
  provider: LoginModel | null,
  checkedAt: number,
) {
  const offlineUntil = checkedAt + 24 * 60 * 60 * 1000;
  const providerSource = new ProviderAccessService(async () =>
    Date.now() < offlineUntil ? provider : null,
  );
  const service = new AccessService([
    providerSource,
    new GooglePlayAccessService(loadVerifiedGooglePlayGrant),
  ]);
  const snapshot = await service.getAccessSnapshot();
  return {
    ...snapshot,
    grants: snapshot.grants.map((grant) =>
      grant.source === "provider"
        ? {
            ...grant,
            verifiedAt: checkedAt,
            expiresAt: Math.min(grant.expiresAt ?? offlineUntil, offlineUntil),
          }
        : grant,
    ),
  };
}
