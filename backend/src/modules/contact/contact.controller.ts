import { Body, Controller, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Public } from '../auth/public.decorator.js';
import { ContactService } from './contact.service.js';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  @UseInterceptors(FilesInterceptor('files', 3, { limits: { fileSize: 5 * 1024 * 1024 } }))
  sendMessage(
    @Body() body: { name: string; email: string; subject: string; message: string; city?: string; neighborhood?: string },
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.contactService.sendMessage(body, files ?? []);
  }
}
