export interface UploadFileDto {
  buffer: Buffer;
  fileName: string;
  mimetype: string;
  size: number;
  folder?: string; // Opcional, si quieres permitir especificar la carpeta
  entityId?: string; // Opcional, si quieres pasar el ID de la entidad relacionada
}