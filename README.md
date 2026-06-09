# TeamFlow — Guía de despliegue

App de gestión de tareas para equipos con autenticación, comentarios, historial en tiempo real.

## Stack
- **Frontend**: React + Vite
- **Backend / Auth / DB**: Supabase (gratis)
- **Hosting**: Vercel (gratis)

---

## Paso 1 — Crear proyecto en Supabase (5 min)

1. Ve a [supabase.com](https://supabase.com) → **Start your project** → crea cuenta
2. Haz clic en **New project**, elige nombre (ej: `teamflow`), región más cercana, y una contraseña fuerte para la DB
3. Espera ~2 minutos a que el proyecto arranque
4. Ve a **SQL Editor** (menú izquierdo) → **New query**
5. Pega el contenido completo de `supabase/schema.sql` → clic en **Run**
6. Ve a **Settings → API** y copia:
   - `Project URL` → esto es tu `VITE_SUPABASE_URL`
   - `anon public` key → esto es tu `VITE_SUPABASE_ANON_KEY`

---

## Paso 2 — Subir el código a GitHub (3 min)

1. Crea un repo nuevo en [github.com](https://github.com) (puede ser privado)
2. En tu terminal local:

```bash
cd teamflow
npm install
git init
git add .
git commit -m "TeamFlow inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/teamflow.git
git push -u origin main
```

---

## Paso 3 — Desplegar en Vercel (3 min)

1. Ve a [vercel.com](https://vercel.com) → **Sign up** con tu cuenta de GitHub
2. Haz clic en **Add New → Project** → importa el repo `teamflow`
3. En la sección **Environment Variables**, agrega:

| Nombre | Valor |
|--------|-------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` |

4. Haz clic en **Deploy**. En 1-2 minutos tendrás una URL como `teamflow-tu-usuario.vercel.app`

---

## Paso 4 — Invitar a tu equipo

Comparte la URL con tu equipo. Cada persona debe:

1. Ir a la URL → hacer clic en **Regístrate**
2. Ingresar nombre, correo, contraseña, y seleccionar su rol (Líder / Ingeniero)
3. Confirmar el correo que llegará de Supabase
4. Iniciar sesión

> **Nota**: Los líderes son los únicos que pueden crear tareas. Los ingenieros pueden cambiar el estado de sus tareas y agregar comentarios.

---

## Desarrollo local

```bash
# Copia el archivo de variables de entorno
cp .env.example .env
# Edita .env con tus credenciales de Supabase

npm install
npm run dev
# Abre http://localhost:5173
```

---

## Estructura del proyecto

```
teamflow/
├── index.html
├── vite.config.js
├── vercel.json
├── supabase/
│   └── schema.sql          ← Ejecutar en Supabase SQL Editor
└── src/
    ├── App.jsx             ← Entrada, guard de autenticación
    ├── main.jsx
    ├── lib/
    │   ├── supabase.js     ← Cliente Supabase
    │   ├── AuthContext.jsx ← Estado global de sesión
    │   └── constants.js    ← Constantes y helpers
    ├── components/
    │   ├── UI.jsx          ← Componentes compartidos
    │   ├── TaskPanel.jsx   ← Panel detalle + comentarios + historial
    │   └── TaskModal.jsx   ← Formulario crear/editar tarea
    └── views/
        ├── AuthPage.jsx    ← Login / Registro
        └── AppPage.jsx     ← App principal (4 vistas)
```

---

## Funcionalidades

- ✅ Login / Registro con email y contraseña
- ✅ Roles: Líder (crea tareas) / Ingeniero (actualiza estado, comenta)
- ✅ 4 vistas: Lista, Kanban, Matriz Impacto/Esfuerzo, Equipo
- ✅ Comentarios con autor y timestamp
- ✅ Historial automático de cambios (estado, prioridad, fecha, ingeniero)
- ✅ Tiempo real: cambios visibles al instante para todos
- ✅ Filtros por líder y estado
- ✅ Indicador de tareas vencidas
- ✅ Progreso del equipo en sidebar
