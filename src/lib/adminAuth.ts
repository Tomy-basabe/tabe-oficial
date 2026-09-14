// Centralized Super Admin Authorization
export const SUPER_ADMIN_EMAILS = [
  "basabetomas09@gmail.com"
];

export const SUPER_ADMIN_IDS = [
  "47c2a694-d1f2-4a4b-b37f-45e37ea010c6"
];

export const isSuperAdmin = (
  user: { email?: string | null; id?: string } | null | undefined
): boolean => {
  if (!user) return false;
  const userEmail = user.email?.trim().toLowerCase();
  const emailMatch = userEmail ? SUPER_ADMIN_EMAILS.includes(userEmail) : false;
  const idMatch = user.id ? SUPER_ADMIN_IDS.includes(user.id) : false;
  return Boolean(emailMatch || idMatch);
};
