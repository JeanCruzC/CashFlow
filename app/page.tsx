import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import RegisterLink from "@/components/ui/RegisterLink";
import { buildFaqSchema, buildSoftwareApplicationSchema } from "@/lib/seo/schema";

const FEATURES = [
  {
    title: "Panel financiero en tiempo real",
    description:
      "Visualiza flujo de caja neto, tasa de ahorro, patrimonio y fondo de emergencia con datos de tu organización.",
    note: "Conectado a tus transacciones y cuentas.",
  },
  {
    title: "Transacciones con control",
    description:
      "Registra ingresos y gastos, busca por descripción, ordena por columnas y navega por páginas.",
    note: "Pensado para uso diario y operación continua.",
  },
  {
    title: "Cuentas y categorías",
    description:
      "Administra cuentas financieras y clasifica movimientos por categorías para mantener orden contable.",
    note: "Soporta perfiles personal y negocio.",
  },
  {
    title: "Presupuesto mensual",
    description:
      "Usa una vista base de presupuesto para comparar plan vs avance del mes en una sola tabla.",
    note: "Ideal para tomar decisiones antes de cerrar el período.",
  },
  {
    title: "Onboarding de perfil",
    description:
      "Configura tu espacio como perfil personal o empresarial desde el primer acceso.",
    note: "Tu estructura parte desde un flujo guiado.",
  },
  {
    title: "Seguridad por organización",
    description:
      "Autenticación con Supabase y políticas RLS para aislar datos por usuario y organización.",
    note: "Diseño orientado a privacidad y control de acceso.",
  },
];

const STEPS = [
  {
    title: "Crea tu cuenta",
    description:
      "Regístrate y define tu perfil inicial para comenzar con una estructura financiera clara.",
  },
  {
    title: "Carga tus movimientos",
    description:
      "Agrega transacciones, cuentas y categorías para construir una base de datos útil desde el día uno.",
  },
  {
    title: "Analiza y decide",
    description:
      "Consulta el panel y el presupuesto para actuar con información real, no con suposiciones.",
  },
];

const AVAILABLE_TODAY = [
  "Panel con KPIs calculados desde tus datos.",
  "Gestión de transacciones con búsqueda, orden y paginación.",
  "Módulos de cuentas, categorías y presupuesto mensual.",
  "Autenticación y aislamiento de datos por organización.",
];

const IN_PROGRESS = [
  "Módulo de pronóstico financiero completo.",
  "Más automatizaciones para carga masiva y conciliación.",
];

const FAQS = [
  {
    question: "¿CashFlow sirve para perfil personal y perfil empresa?",
    answer:
      "Sí. El onboarding crea un workspace por tipo: personal o empresa. Cada organización opera con sus propios módulos y datos aislados por RLS.",
  },
  {
    question: "¿Qué KPIs calcula CashFlow en la práctica?",
    answer:
      "Personal: flujo de caja neto, tasa de ahorro, patrimonio neto y fondo de emergencia. Empresa: revenue, COGS, OPEX, EBIT, Operating Margin, Budget vs Actual y Forecast.",
  },
  {
    question: "¿Puedo importar datos desde Excel o CSV?",
    answer:
      "Sí. La plataforma soporta importación con mapeo de columnas, normalización y deduplicación por huella de movimiento para evitar registros duplicados.",
  },
  {
    question: "¿Cómo se protege la información financiera?",
    answer:
      "CashFlow usa autenticación con Supabase Auth y políticas Row Level Security para que cada usuario acceda solo a las organizaciones donde tiene membresía.",
  },
];

function CashFlowLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0D4C7A] shadow-[0_10px_24px_rgba(13,76,122,0.24)]">
        <svg
          viewBox="0 0 48 48"
          className="h-7 w-7"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="7" y="10" width="34" height="28" rx="8" stroke="#FFFFFF" strokeWidth="3" />
          <path d="M14 27C17 21 21 19 24 22C27 25 31 24 34 18" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5A7188]">Plataforma</p>
        <p className="text-xl font-extrabold tracking-tight text-[#0F172A]">CashFlow</p>
      </div>
    </div>
  );
}

function HeroPanel() {
  return (
    <div className="animate-fade-in-up">
      <div className="rounded-[30px] border border-[#d8e4ee] bg-white p-5 shadow-[0_30px_70px_rgba(23,56,92,0.14)] md:p-7">
        <div className="mb-5 flex items-center justify-between border-b border-[#eaf0f5] pb-4">
          <p className="text-sm font-semibold text-[#1e3950]">Resumen operativo</p>
          <span className="rounded-full bg-[#e8f4fb] px-3 py-1 text-xs font-semibold text-[#0d4c7a]">Actualizado</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-[#e5edf4] bg-[#f8fbfd] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4a6275]">Flujo de caja</p>
            <p className="mt-2 text-sm font-medium text-[#163047]">Lectura mensual de ingresos y gastos</p>
          </article>
          <article className="rounded-2xl border border-[#e5edf4] bg-[#f8fbfd] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4a6275]">Patrimonio</p>
            <p className="mt-2 text-sm font-medium text-[#163047]">Consolidación de activos y pasivos</p>
          </article>
          <article className="rounded-2xl border border-[#e5edf4] bg-[#f8fbfd] p-4 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4a6275]">Tendencia de actividad</p>
            <svg
              viewBox="0 0 520 120"
              className="mt-4 h-auto w-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect width="520" height="120" rx="16" fill="#F2F8FC" />
              <path d="M20 82C63 78 89 53 130 48C173 43 196 69 236 64C277 59 310 30 352 34C393 38 425 61 469 50" stroke="#0D4C7A" strokeWidth="3" strokeLinecap="round" />
              <path d="M20 95C68 89 93 80 132 78C171 76 207 90 247 84C286 79 316 62 355 63C394 64 430 80 470 72" stroke="#14847B" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 6" />
            </svg>
          </article>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const softwareApplicationSchema = buildSoftwareApplicationSchema();
  const faqSchema = buildFaqSchema(FAQS);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f8fc] text-[#0f172a]">
      <JsonLd id="software-application-schema" data={softwareApplicationSchema} />
      <JsonLd id="faq-schema" data={faqSchema} />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,#d6ecfa_0%,transparent_35%),radial-gradient(circle_at_88%_22%,#d8f1ee_0%,transparent_34%),radial-gradient(circle_at_52%_100%,#e8f3fa_0%,transparent_45%)]" />

      <header className="sticky top-0 z-50 border-b border-[#dce8f1]/80 bg-[#f3f8fc]/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <CashFlowLogo />

          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#415f78] lg:flex">
            <a href="#funciones" className="transition-colors hover:text-[#0d4c7a]">
              Funciones
            </a>
            <a href="#flujo" className="transition-colors hover:text-[#0d4c7a]">
              Flujo
            </a>
            <a href="#seguridad" className="transition-colors hover:text-[#0d4c7a]">
              Seguridad
            </a>
            <a href="#faq" className="transition-colors hover:text-[#0d4c7a]">
              FAQs
            </a>
            <Link href="/blog" className="transition-colors hover:text-[#0d4c7a]">
              Blog
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-[#37566f] transition-colors hover:text-[#0d4c7a] sm:inline-flex">
              Ingresar
            </Link>
            <RegisterLink className="rounded-xl bg-[#0d4c7a] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#0b3f66]">
              Crear cuenta
            </RegisterLink>
          </div>
        </div>
      </header>

      <main>
        <section className="px-5 pb-16 pt-14 md:px-8 md:pt-20">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="animate-fade-in-up">
              <span className="inline-flex rounded-full border border-[#cde1ee] bg-white/85 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#335b78]">
                Gestión financiera clara
              </span>
              <h1 className="mt-6 max-w-2xl text-4xl font-black leading-tight text-[#0f172a] md:text-6xl">
                El control de tu dinero,
                <span className="font-display ml-2 text-[#0d4c7a]">sin ruido</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#3f5d76] md:text-lg">
                CashFlow centraliza transacciones, cuentas, categorías y presupuesto en una experiencia moderna.
                Sin métricas de marketing inventadas: solo datos reales de tu operación.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <RegisterLink className="inline-flex items-center justify-center rounded-2xl bg-[#0d4c7a] px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#0b3f66]">
                  Empezar ahora
                </RegisterLink>
                <a
                  href="#funciones"
                  className="inline-flex items-center justify-center rounded-2xl border border-[#cfe0ec] bg-white px-6 py-3.5 text-sm font-bold text-[#1e3e56] transition-all hover:border-[#9fc1d8]"
                >
                  Ver funcionalidades reales
                </a>
              </div>
            </div>

            <div className="animate-float">
              <HeroPanel />
            </div>
          </div>
        </section>

        <section id="funciones" className="px-5 py-16 md:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-10 max-w-3xl animate-fade-in-up">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">Qué puedes hacer hoy</p>
              <h2 className="mt-3 text-3xl font-black text-[#0f172a] md:text-4xl">Funciones construidas sobre el producto actual</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <article
                  key={feature.title}
                  className="animate-fade-in-up rounded-3xl border border-[#d7e5ef] bg-white p-6 shadow-[0_10px_30px_rgba(13,60,95,0.08)]"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <svg
                    viewBox="0 0 180 18"
                    className="mb-4 h-4 w-32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path d="M2 9H132" stroke="#0D4C7A" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="146" cy="9" r="6" stroke="#0D4C7A" strokeWidth="3" />
                    <circle cx="168" cy="9" r="6" stroke="#14847B" strokeWidth="3" />
                  </svg>

                  <h3 className="text-lg font-extrabold text-[#14324a]">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#4b677f]">{feature.description}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#4a6275]">{feature.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="flujo" className="px-5 py-16 md:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="animate-fade-in-up rounded-3xl border border-[#d8e6ef] bg-white p-7 shadow-[0_18px_34px_rgba(10,63,93,0.08)]">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">Flujo simple</p>
              <h2 className="mt-3 text-3xl font-black text-[#0f172a]">Implementación en 3 pasos</h2>
              <p className="mt-4 text-sm leading-relaxed text-[#4b667c]">
                El objetivo es que empieces rápido, con una estructura limpia, y que el panel refleje decisiones útiles.
              </p>

              <svg
                viewBox="0 0 320 170"
                className="mt-7 h-auto w-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="1" y="1" width="318" height="168" rx="20" fill="#F3F9FD" stroke="#D9E8F2" />
                <rect x="28" y="42" width="74" height="74" rx="18" fill="#E5F1FA" />
                <rect x="124" y="42" width="74" height="74" rx="18" fill="#E8F5F4" />
                <rect x="220" y="42" width="74" height="74" rx="18" fill="#E5F1FA" />
                <path d="M102 79H124" stroke="#0D4C7A" strokeWidth="3" strokeLinecap="round" />
                <path d="M198 79H220" stroke="#0D4C7A" strokeWidth="3" strokeLinecap="round" />
                <circle cx="65" cy="79" r="13" stroke="#0D4C7A" strokeWidth="3" />
                <circle cx="161" cy="79" r="13" stroke="#14847B" strokeWidth="3" />
                <circle cx="257" cy="79" r="13" stroke="#0D4C7A" strokeWidth="3" />
              </svg>
            </div>

            <div className="space-y-4">
              {STEPS.map((step, index) => (
                <article
                  key={step.title}
                  className="animate-fade-in-up rounded-3xl border border-[#d7e5ef] bg-white p-6 shadow-[0_12px_28px_rgba(9,62,93,0.08)]"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4a6275]">Paso {index + 1}</p>
                  <h3 className="mt-2 text-xl font-extrabold text-[#123149]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#4b667c]">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="seguridad" className="px-5 py-16 md:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-2">
            <article className="animate-fade-in-up rounded-3xl border border-[#d7e5ef] bg-white p-7 shadow-[0_18px_34px_rgba(10,63,93,0.08)]">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">Transparencia</p>
              <h2 className="mt-3 text-3xl font-black text-[#0f172a]">Sin promesas infladas</h2>
              <p className="mt-4 text-sm leading-relaxed text-[#4b667c]">
                Este landing describe únicamente capacidades existentes o en desarrollo explícito. No usamos testimonios inventados ni métricas irreales.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#dce7f0] bg-[#f6fbfe] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#355e7c]">Disponible hoy</p>
                  <ul className="mt-3 space-y-2 text-sm text-[#1f3a52]">
                    {AVAILABLE_TODAY.map((item) => (
                      <li key={item} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-[#dce7f0] bg-[#f6fbfe] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#355e7c]">En progreso</p>
                  <ul className="mt-3 space-y-2 text-sm text-[#1f3a52]">
                    {IN_PROGRESS.map((item) => (
                      <li key={item} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>

            <article className="animate-fade-in-up rounded-3xl border border-[#d7e5ef] bg-white p-7 shadow-[0_18px_34px_rgba(10,63,93,0.08)] [animation-delay:120ms]">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">Seguridad</p>
              <h2 className="mt-3 text-3xl font-black text-[#0f172a]">Base técnica confiable</h2>
              <p className="mt-4 text-sm leading-relaxed text-[#4b667c]">
                CashFlow trabaja con autenticación y políticas de acceso por organización para mantener tus datos aislados y protegidos.
              </p>

              <svg
                viewBox="0 0 420 190"
                className="mt-6 h-auto w-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="1" y="1" width="418" height="188" rx="22" fill="#F4FAFD" stroke="#D9E8F2" />
                <path d="M210 40L278 67V111C278 137 252 157 210 171C168 157 142 137 142 111V67L210 40Z" fill="#E8F4FB" stroke="#0D4C7A" strokeWidth="3" />
                <path d="M186 102C186 89 196 79 210 79C224 79 234 89 234 102V122H186V102Z" fill="#D8ECF8" stroke="#0D4C7A" strokeWidth="3" />
                <rect x="194" y="118" width="32" height="22" rx="8" fill="#0D4C7A" />
                <circle cx="210" cy="129" r="4" fill="white" />
                <path d="M72 112H120" stroke="#0D4C7A" strokeWidth="3" strokeLinecap="round" />
                <path d="M302 112H350" stroke="#14847B" strokeWidth="3" strokeLinecap="round" />
              </svg>

              <ul className="mt-5 space-y-2 text-sm text-[#1f3a52]">
                <li>Autenticación de usuarios mediante Supabase Auth.</li>
                <li>Políticas RLS para limitar acceso por organización.</li>
                <li>Sesión de trabajo integrada en toda la aplicación.</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="faq" className="px-5 py-16 md:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-10 max-w-3xl animate-fade-in-up">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">Preguntas frecuentes</p>
              <h2 className="mt-3 text-3xl font-black text-[#0f172a] md:text-4xl">
                Conceptos clave antes de empezar a operar
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {FAQS.map((faq, index) => (
                <article
                  key={faq.question}
                  className="animate-fade-in-up rounded-3xl border border-[#d7e5ef] bg-white p-6 shadow-[0_12px_28px_rgba(9,62,93,0.08)]"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <h3 className="text-lg font-extrabold text-[#14324a]">{faq.question}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#4b677f]">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 pt-10 md:px-8">
          <div className="mx-auto w-full max-w-7xl rounded-[34px] border border-[#cfe0ec] bg-[linear-gradient(120deg,#0d4c7a_0%,#0f5f8f_58%,#14847b_100%)] px-8 py-10 text-white shadow-[0_28px_54px_rgba(8,50,79,0.34)] md:px-12 md:py-14">
            <h2 className="max-w-3xl text-3xl font-black leading-tight md:text-5xl">CashFlow: diseño claro, lenguaje claro, decisiones claras.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#d9ecf8] md:text-base">
              Si ya tienes cuenta, entra y continúa. Si aún no, crea tu espacio y empieza a operar con una vista financiera coherente desde el primer día.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <RegisterLink className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-bold text-[#0d4c7a] transition-colors hover:bg-[#ebf4fb]">
                Crear cuenta en CashFlow
              </RegisterLink>
              <Link
                href="/blog"
                className="inline-flex items-center justify-center rounded-2xl border border-white/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Leer blog financiero
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-white/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Ingresar
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#d8e5ef] bg-[#edf4f9] px-5 py-8 md:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-3 text-sm text-[#4c6880] md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} CashFlow</p>
          <p>Aplicación financiera para control personal y empresarial.</p>
        </div>
      </footer>
    </div>
  );
}
