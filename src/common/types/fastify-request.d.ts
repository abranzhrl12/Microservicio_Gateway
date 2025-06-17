import 'fastify'; // Importa el módulo 'fastify' para extender su interfaz

declare module 'fastify' {
  // Define la interfaz User que Passport Strategy adjunta a la petición
  // Asegúrate de que esta interfaz coincida con la estructura que asignas en validate()
  interface AuthenticatedUser {
    id: number;
    email: string;
    role: string;
    // Agrega cualquier otra propiedad que adjuntes a req.user
  }

  // Extiende la interfaz FastifyRequest para incluir la propiedad 'user'
  interface FastifyRequest {
    user?: AuthenticatedUser; // 'user' puede ser opcional
  }
}