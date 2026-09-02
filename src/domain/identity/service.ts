import type {
  IdentityResult,
  IdentitySession,
  IdentityUser,
  ProfileDraft,
} from "./types";

export interface IdentityService {
  restore(): Promise<IdentityResult<IdentitySession | null>>;
  signIn(): Promise<IdentityResult<IdentitySession>>;
  updateProfile(draft: ProfileDraft): Promise<IdentityResult<IdentityUser>>;
  signOut(): Promise<void>;
}
