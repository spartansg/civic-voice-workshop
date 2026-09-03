const STORAGE_KEY = "civicvoice.session";

// Persist only the demo session fields, never login credentials.
function sessionFields(session) {
  const user = session?.user;
  if (
    typeof session?.token !== "string" || !session.token ||
    typeof user?.nric !== "string" || !user.nric ||
    typeof user?.name !== "string" ||
    !["citizen", "admin"].includes(user?.role)
  ) return null;

  return {
    token: session.token,
    user: { nric: user.nric, name: user.name, role: user.role },
  };
}

export function restoreSession() {
  try {
    return sessionFields(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    // Invalid saved data or blocked storage must not prevent signing in.
    return null;
  }
}

export function persistSession(session) {
  try {
    const saved = sessionFields(session);
    if (saved) localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The current in-memory session still works if storage is unavailable.
  }
}
