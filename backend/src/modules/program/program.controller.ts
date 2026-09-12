import { Controller, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ProgramService } from './program.service.js';

@Controller('programs')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.programService.deleteProgram(id);
    // Rien à retourner : code 204 No Content
  }
}