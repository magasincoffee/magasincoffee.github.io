export function isOwnerProfile(profile) {
  return Boolean(
    profile &&
    String(profile.status || "").toUpperCase() === "ACTIVE" &&
    String(profile.role || "").toUpperCase() === "OWNER"
  );
}

export function classifyOwnerAccess({ profile = null, error = null } = {}) {
  if (error) {
    return {
      allowed: false,
      state: "ERROR",
      message: "Không thể xác minh quyền Owner."
    };
  }

  if (!profile) {
    return {
      allowed: false,
      state: "AUTH_REQUIRED",
      message: "Bạn cần đăng nhập bằng tài khoản Owner."
    };
  }

  if (String(profile.status || "").toUpperCase() !== "ACTIVE") {
    return {
      allowed: false,
      state: "INACTIVE",
      message: "Tài khoản chưa ở trạng thái hoạt động."
    };
  }

  if (String(profile.role || "").toUpperCase() !== "OWNER") {
    return {
      allowed: false,
      state: "ROLE_DENIED",
      message: "Control Tower chỉ dành cho Owner."
    };
  }

  return {
    allowed: true,
    state: "ALLOWED",
    message: ""
  };
}
