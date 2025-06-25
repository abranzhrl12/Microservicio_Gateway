import {
  Injectable,
  Inject,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import {
  FileUploadResult,
  FileToDelete,
} from 'src/common/interfaces/file-upload-result.interface';
import { UploadFileDto } from './dto/uploadFile.dto';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  async uploadFile(uploadFileDto: UploadFileDto, user: any): Promise<FileUploadResult> {
    const userId = user?.id || 'anonymous';
    const fileBufferBase64 = uploadFileDto.buffer.toString('base64');

    this.logger.debug(`[FilesService] Enviando archivo '${uploadFileDto.fileName}' (mimetype: ${uploadFileDto.mimetype}, size: ${uploadFileDto.size} bytes) a microservicio de archivos.`);

    try {
      // El microservicio de NATS está envolviendo la respuesta en un objeto con la propiedad 'body'.
      // Necesitamos extraer ese 'body'.
      const natsResponse: { body: FileUploadResult; statusCode: number; message: string } = await lastValueFrom(
        this.natsClient.send(
          { cmd: 'files.upload' },
          {
            fileBufferBase64: fileBufferBase64,
            fileName: uploadFileDto.fileName,
            mimetype: uploadFileDto.mimetype,
            size: uploadFileDto.size,
            folder: uploadFileDto.folder || 'uploads',
            entityId: uploadFileDto.entityId || userId,
          },
        ),
      );

      // === IMPORTANTE: EXTRAER EL CUERPO REAL DE LA RESPUESTA ===
      const result = natsResponse.body; // <-- Aquí está el cambio clave

      // === Log para ver el resultado EXACTO recibido del microservicio (ahora el 'body' extraído) ===
      this.logger.debug(`[Gateway-FilesService] Resultado 'body' extraído del microservicio: ${JSON.stringify(result)}`);
      this.logger.debug(`[Gateway-FilesService] URL en el resultado 'body': ${result?.url}`);
      this.logger.debug(`[Gateway-FilesService] publicId en el resultado 'body': ${result?.publicId}`);


      if (!result || !result.url || !result.publicId) { // Ahora validamos ambos campos
        this.logger.error(`[Gateway-FilesService] El microservicio devolvió un resultado inesperado o incompleto. Result: ${JSON.stringify(result)}`);
        throw new InternalServerErrorException('El microservicio no devolvió una URL válida o publicId.');
      }

      this.logger.log(`[FilesService] Archivo subido exitosamente: ${result.url}`);
      return result; // Retornamos el objeto FileUploadResult directamente
    } catch (error) {
      this.logger.error(`[FilesService] Error al comunicarse con el microservicio de archivos para subir: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Fallo en la subida de archivo: ${error.message}`);
    }
  }


  async deleteFile(fileToDelete: FileToDelete, user: any): Promise<boolean> {
    const userId = user?.id || 'anonymous';
    this.logger.debug(
      `[FilesService] Enviando solicitud de eliminación para publicId: ${fileToDelete.publicId} (Usuario: ${userId})`,
    );

    try {
      const result: boolean = await lastValueFrom(
        this.natsClient.send(
          { cmd: 'files.delete' },
          {
            publicId: fileToDelete.publicId,
          },
        ),
      );
      this.logger.log(
        `[FilesService] Resultado de eliminación para ${fileToDelete.publicId}: ${result}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[FilesService] Error al comunicarse con el microservicio de archivos para eliminar: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Fallo en la eliminación de archivo: ${error.message}`,
      );
    }
  }
}
