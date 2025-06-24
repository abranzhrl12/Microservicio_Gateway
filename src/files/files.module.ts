// GATEWAY/src/files/files.module.ts
import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesResolver } from './files.resolver';


@Module({
  imports: [
 
  ],
  controllers: [],
  providers: [FilesService, FilesResolver], 
  exports: [FilesService], 
})
export class FilesModule {}