// GATEWAY/src/files/files.resolver.ts
import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Tu guardia de autenticación GraphQL
import { FilesService} from './files.service'; // <--- ¡Importar UploadFileDto!

import { GraphQLUpload, FileUpload } from 'graphql-upload-minimal';
import { UploadFileDto } from './dto/uploadFile.dto';
import { FileUploadResultModel } from 'src/common/models/file-upload-result.model';

@Resolver()
export class FilesResolver {
  private readonly logger = new Logger(FilesResolver.name);

  constructor(
    private readonly filesService: FilesService,
  ) {}

  @Mutation(() => FileUploadResultModel, { description: 'Sube un archivo y lo almacena en el servicio de archivos.' })
  @UseGuards(JwtAuthGuard)
  async uploadFile(
    @Args({ name: 'file', type: () => GraphQLUpload })
    file: FileUpload,
    @Context('req') req: any,
  ): Promise<FileUploadResultModel> {
    this.logger.log(`[FilesResolver] Petición de subida GraphQL recibida para archivo: ${file.filename}`);

    const { createReadStream, filename, mimetype, encoding } = await file; // 'encoding' y 'size' ya no son directos aquí. size la calculamos.
    const fileStream = createReadStream();

    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of fileStream) {
      chunks.push(chunk);
      size += chunk.length;
    }
    const fileBuffer = Buffer.concat(chunks);

    const user = req['user'];

    // --- ¡CAMBIO CLAVE AQUÍ! ---
    const uploadFileDto: UploadFileDto = {
      buffer: fileBuffer,
      fileName: filename,
      mimetype: mimetype,
      size: size,
    };

    const uploadFileResult = await this.filesService.uploadFile(
      uploadFileDto, // <--- ¡Pasamos el DTO directamente! NO hay 'as Express.Multer.File'
      user
    );
    // --- FIN DEL CAMBIO CLAVE ---

    this.logger.log(`[FilesResolver] Archivo ${filename} procesado y subido a través del microservicio de archivos.`);
    return uploadFileResult;
  }

  @Mutation(() => Boolean, { description: 'Elimina un archivo del servicio de archivos.' })
  @UseGuards(JwtAuthGuard)
  async deleteFile(
    @Args('publicId', { type: () => String }) publicId: string,
    @Context('req') req: any,
  ): Promise<boolean> {
    this.logger.log(`[FilesResolver] Petición de eliminación GraphQL recibida para publicId: ${publicId}`);
    const user = req['user'];
    const fileToDelete = { publicId: publicId };
    const result = await this.filesService.deleteFile(fileToDelete, user);
    this.logger.log(`[FilesResolver] Archivo ${publicId} eliminado: ${result}`);
    return result;
  }
}