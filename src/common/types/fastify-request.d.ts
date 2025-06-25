// fastify.d.ts (e.g., in your project root or src/@types/)

// No need for a separate import if you also import `FastifyRequest` directly below
import 'fastify';

// IMPORT YOUR AuthenticatedUser from its single source of truth
// Adjust the path below to match your actual file structure.
// Example assumes fastify.d.ts is in the project root, and the interface is in src/common/interfaces/
import { AuthenticatedUser } from './src/common/interfaces/authenticated-user.interface';

declare module 'fastify' {
  // IMPORTANT: There should be NO 'interface AuthenticatedUser { ... }' defined here.
  // We are solely relying on the imported one.

  interface FastifyRequest {
    user?: AuthenticatedUser; // Use the imported AuthenticatedUser
    jwtToken?: string; // Keep this if your jwtExtractor uses it
  }
}