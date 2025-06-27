// GATEWAY/src/files/files.module.ts
import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesResolver } from './files.resolver';
import { AuthModule } from 'src/auth/auth.module';


@Module({
  imports: [
 AuthModule
  ],
  controllers: [],
  providers: [FilesService, FilesResolver], 
  exports: [FilesService], 
})
export class FilesModule {}