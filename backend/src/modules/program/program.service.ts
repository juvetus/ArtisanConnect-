import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstitutionalProgram } from '../../entities/institutional-program.entity.js';
import { InstitutionalResource } from '../../entities/institutional-resource.entity.js';

@Injectable()
export class ProgramService {
  constructor(
    @InjectRepository(InstitutionalProgram)
    private readonly programRepo: Repository<InstitutionalProgram>,
    @InjectRepository(InstitutionalResource)
    private readonly resourceRepo: Repository<InstitutionalResource>,
  ) {}

  async deleteProgram(programId: string): Promise<void> {
    // Supprimer les ressources liées
    await this.resourceRepo.delete({ program: { id: programId } });
    // Supprimer le programme lui-même
    await this.programRepo.delete(programId);
  }
}