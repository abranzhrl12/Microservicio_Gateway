import { Injectable, Inject, Logger, InternalServerErrorException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { FileUploadResult, FileToDelete } from 'src/common/interfaces/file-upload-result.interface';
import { UploadFileDto } from './dto/uploadFile.dto';


@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * Envía un archivo al microservicio de archivos para su subida.
   * @param uploadFileDto Objeto que contiene el buffer del archivo y sus metadatos.
   * @param user El objeto de usuario extraído del token JWT (por el AuthGuard).
   * @returns La URL y publicId del archivo subido.
   */
  async uploadFile(uploadFileDto: UploadFileDto, user: any): Promise<FileUploadResult> { // <--- ¡CAMBIO AQUÍ!
    const userId = user?.id || 'anonymous';
    const fileBufferBase64 = uploadFileDto.buffer.toString('base64');

    this.logger.debug(`[FilesService] Enviando archivo '${uploadFileDto.fileName}' (mimetype: ${uploadFileDto.mimetype}, size: ${uploadFileDto.size} bytes) a microservicio de archivos.`);

    try {
      const result: FileUploadResult = await lastValueFrom(
        this.natsClient.send(
          { cmd: 'files.upload' },
          {
            fileBufferBase64: fileBufferBase64,
            fileName: uploadFileDto.fileName,
            mimetype: uploadFileDto.mimetype,
            size: uploadFileDto.size,
            folder: uploadFileDto.folder || 'uploads', // Usar el folder del DTO o un default
            entityId: uploadFileDto.entityId || userId, // Usar entityId del DTO o userId
          },
        ),
      );
      this.logger.log(`[FilesService] Archivo subido exitosamente: ${result.url}`);
      return result;
    } catch (error) {
      this.logger.error(`[FilesService] Error al comunicarse con el microservicio de archivos para subir: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Fallo en la subida de archivo: ${error.message}`);
    }
  }

  /**
   * Envía una solicitud de eliminación de archivo al microservicio de archivos.
   * @param fileToDelete Objeto que contiene el publicId del archivo a eliminar.
   * @param user El objeto de usuario (para propósitos de logging o validación si el microservicio lo usa).
   * @returns `true` si la eliminación fue exitosa.
   */
  async deleteFile(fileToDelete: FileToDelete, user: any): Promise<boolean> {
    const userId = user?.id || 'anonymous';
    this.logger.debug(`[FilesService] Enviando solicitud de eliminación para publicId: ${fileToDelete.publicId} (Usuario: ${userId})`);

    try {
      const result: boolean = await lastValueFrom(
        this.natsClient.send(
          { cmd: 'files.delete' },
          {
            publicId: fileToDelete.publicId,
          },
        ),
      );
      this.logger.log(`[FilesService] Resultado de eliminación para ${fileToDelete.publicId}: ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`[FilesService] Error al comunicarse con el microservicio de archivos para eliminar: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Fallo en la eliminación de archivo: ${error.message}`);
    }
  }
}