"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AdminLoginResponse = {
  ok?: boolean;
  token?: string;
  error?: string;
};

export function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError("Ingresa usuario y contraseña.");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
        cache: "no-store",
        credentials: "same-origin",
      });

      const data = (await response.json().catch(() => null)) as AdminLoginResponse | null;

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || "Credenciales inválidas.");
      }

      if (!data?.token || typeof data.token !== "string") {
        throw new Error("El servidor no entregó token de sesión.");
      }

      window.localStorage.setItem("ptm-admin-token", data.token);
      router.replace("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
            Prescribe tu Multa
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">
            Panel administrativo
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Acceso reservado para gestión interna.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-semibold text-red-100"
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-bold text-slate-200">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={loading}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Ingresa tu usuario"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-200">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs font-semibold text-slate-500">
          Solo personal autorizado.
        </p>
      </section>
    </main>
  );
}

export default AdminLogin;
