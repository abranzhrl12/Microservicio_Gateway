// src/common/utils/date.utils.ts
import { Logger } from '@nestjs/common';

const logger = new Logger('DateUtils');

export function transformDates<T extends { createdAt?: string | Date, updatedAt?: string | Date, [key: string]: any }>(data: T): T {
  if (!data) { // <--- Asegúrate de que esta línea exista
    logger.debug('[DateUtils] Input data is null/undefined, returning as is.');
    return data; // <--- Y esta línea también
  }

  const transformedData: T = { ...data };

  // ... (resto de tu lógica de transformación)

  return transformedData;
}
// deepTransformDates - Esta es la que usaremos en sendGraphqlRequest
export function deepTransformDates<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepTransformDates(item)) as T;
    }

    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            // Regex para detectar formato ISO 8601 (con milisegundos y Z)
            // Esto es crucial: asegúrate de que la regex coincide con el formato que envía tu microservicio.
            // Ejemplo: "2025-06-21T06:52:09.461Z"
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    newObj[key] = date;
                    // logger.debug(`[DateUtils] Transformed deep: '${value}' to Date object.`); // Puedes activar logs aquí si quieres
                } else {
                    newObj[key] = value; // Mantener como string si no es una fecha válida
                    logger.warn(`[DateUtils] Cadena de fecha ISO inválida para el campo '${key}': ${value} (deepTransformDates).`);
                }
            } else if (typeof value === 'object' && value !== null) {
                newObj[key] = deepTransformDates(value);
            } else {
                newObj[key] = value;
            }
        }
    }
    return newObj as T;
}