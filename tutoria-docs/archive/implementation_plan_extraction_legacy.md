# Create Reusable Architecture Project

This plan outlines the steps to extract the reusable components of the GuarderiasIMSS MVP into a new, clean project directory. This new project will serve as a foundational template with Authentication, Firebase, n8n integration, and standard layouts already configured.

## Open Questions

> [!IMPORTANT]
> **What should we name the new project directory?**
> Please let me know the desired name for the new folder (e.g., `BaseProject`, `ArchitectureTemplate`, etc.). I will use this name to create the folder in `/Users/rius/<YourProjectName>`.

## Proposed Changes

We will create a new directory and copy the essential, reusable pieces from the current project. We will carefully omit any code or pages specific to the `GuarderiasIMSS` business logic (like `Planeaciones`, `ChatNormativo`, etc.).

### Base Configuration
- Copy `package.json` and `package-lock.json`
- Copy `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.js`
- Copy `.env` and `.gitignore`
- Copy `index.html` (Title will be updated to a generic one)

### Source Code (`src/`)

#### Core Files
- Copy `src/main.jsx` and `src/index.css` (Tailwind imports)
- Copy and clean `src/App.jsx` (Remove Guarderias-specific imports)
- Copy and clean `src/routes/AppRoutes.jsx` (Keep only auth routes and a basic Dashboard route)

#### Context & State
- Copy `src/context/AuthContext.jsx`
- Copy `src/context/SessionTimeoutContext.jsx`
- Copy `src/context/UserContext.jsx`

#### Services
- Copy `src/services/firebase.js`
- Copy `src/services/authService.js`
- Copy `src/services/sessionService.js`
- Copy `src/services/n8nService.js`
- (Will **not** copy `guarderiasService.js`, `planeacionService.js`, etc.)

#### Components
- Copy `src/components/auth/ProtectedRoute.jsx`
- Copy `src/components/auth/SessionWarningModal.jsx`
- Copy and clean `src/components/layout/MainLayout.jsx` (Remove Guarderias-specific navigation links)

#### Pages
- Copy `src/pages/Login.jsx`
- Copy `src/pages/Register.jsx`
- Copy `src/pages/ResetPassword.jsx`
- Create a generic `src/pages/Dashboard.jsx` (Empty placeholder for the new product)

### Verification Plan

### Automated Tests
- Run `npm install` in the new directory.
- Run `npm run build` to ensure the project compiles successfully without any missing dependency errors.

### Manual Verification
- After the project is set up, I will ask you to navigate to the new directory, run `npm run dev`, and verify that the authentication flow (Login/Register) and the base layout work as expected.
