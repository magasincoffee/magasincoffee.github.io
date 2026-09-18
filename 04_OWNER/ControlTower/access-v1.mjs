export function classifyOwnerProfile(profile) {
  if (!profile) return { allowed: false, reason: "UNAUTHENTICATED" };

  const status = String(profile.status || "").toUpperCase();
  if (status !== "ACTIVE") {
    return { allowed: false, reason: "INACTIVE" };
  }

  const role = String(profile.role || "").toUpperCase();
  if (role !== "OWNER") {
    return { allowed: false, reason: "ROLE_DENIED" };
  }

  return { allowed: true, reason: "OWNER" };
}

export async function requireOwnerAccess(core) {
  if (!core?.supabase?.requireActive || !core?.roles?.hasRole) {
    throw new Error("Không tải được hệ thống xác thực.");
  }

  const profile = await core.supabase.requireActive();
  if (!core.roles.hasRole(profile, ["OWNER"])) {
    throw new Error("Chỉ Owner được mở Control Tower.");
  }

  return profile;
}
