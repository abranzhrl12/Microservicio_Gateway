// GATEWAY/src/files/models/file-upload-result.model.ts
import { Field, ObjectType, Int } from '@nestjs/graphql';

@ObjectType({ description: 'Resultado de la subida de un archivo.' })
export class FileUploadResultModel {
  @Field(() => String, { description: 'La URL pública del archivo subido.' })
  url: string;

  @Field(() => String, { description: 'El ID público del archivo para operaciones de eliminación/consulta.' })
  publicId: string;

  @Field(() => String, { description: 'El nombre original del archivo.' })
  fileName: string;

  @Field(() => String, { description: 'El tipo MIME del archivo.' })
  mimetype: string;

  @Field(() => Int, { description: 'El tamaño del archivo en bytes.' })
  size: number;

  // Asegúrate de que todos los campos de tu interfaz FileUploadResult estén aquí
  // y decorados con @Field()
}