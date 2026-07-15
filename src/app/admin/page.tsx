export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Adminisztráció</h1>
        <p className="text-muted-foreground">Rendszerbeállítások, jogosultságok (RLS) és audit napló.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-50">
        <div className="border rounded-md p-6">
          <h2 className="font-semibold text-lg mb-2">Szerepkörök (RBAC)</h2>
          <p className="text-sm text-muted-foreground">Felhasználók és szervezeti egységek kezelése.</p>
        </div>
        <div className="border rounded-md p-6">
          <h2 className="font-semibold text-lg mb-2">Globális Audit Napló</h2>
          <p className="text-sm text-muted-foreground">Adatbázis szintű, csak olvasható biztonsági napló.</p>
        </div>
      </div>
    </div>
  )
}
