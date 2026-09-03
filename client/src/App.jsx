import { useState } from "react";
import { Header } from "./components/Header";
import { AdminPage } from "./pages/AdminPage";
import { CitizenPage } from "./pages/CitizenPage";
import { LoginPage } from "./pages/LoginPage";
import { persistSession, restoreSession } from "./session";

export default function App() {
  const [session, setSession] = useState(restoreSession);

  function updateSession(nextSession) {
    persistSession(nextSession);
    setSession(nextSession);
  }

  return (
    <>
      <Header user={session?.user} onLogout={() => updateSession(null)} />
      {!session && <LoginPage onLogin={updateSession} />}
      {session?.user.role === "citizen" && <CitizenPage user={session.user} />}
      {session?.user.role === "admin" && <AdminPage user={session.user} />}
    </>
  );
}
