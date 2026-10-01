export default function UnauthorizedPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50">
            <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
                <h1 className="mb-3 text-2xl text-slate-800 font-bold">
                    Access Denied
                </h1>

                <p className="text-zinc-600">
                    You don't have permission to access this area.
                </p>
            </div>
        </main>
    )
}