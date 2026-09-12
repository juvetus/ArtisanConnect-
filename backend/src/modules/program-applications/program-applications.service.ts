import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProgramApplication } from '../../entities/program-application.entity.js';
import { InstitutionalProgram } from '../../entities/institutional-program.entity.js';
import { User } from '../../entities/user.entity.js';

@Injectable()
export class ProgramApplicationsService {
  constructor(
    @InjectRepository(ProgramApplication) private readonly applications: Repository<ProgramApplication>,
    @InjectRepository(InstitutionalProgram) private readonly programs: Repository<InstitutionalProgram>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async apply(artisanId: string, programId: string, motivation: string) {
    if (!motivation?.trim() || motivation.trim().length < 30) {
      throw new BadRequestException('La motivation doit contenir au moins 30 caractères');
    }
    const program = await this.programs.findOne({ where: { id: programId, status: 'active' } });
    if (!program) throw new NotFoundException('Programme introuvable ou fermé');
    const artisan = await this.users.findOne({ where: { id: artisanId, role: 'artisan' } });
    if (!artisan) throw new ForbiddenException('Seuls les artisans peuvent postuler');
    const existing = await this.applications.findOne({ where: { artisanId, programId } });
    if (existing) throw new ConflictException('Vous avez déjà postulé à ce programme');
    return this.applications.save(this.applications.create({ artisanId, programId, motivation: motivation.trim(), status: 'submitted', institutionNotes: null }));
  }

  mine(artisanId: string) {
    return this.applications.find({ where: { artisanId }, relations: { program: true }, order: { createdAt: 'DESC' } });
  }

  forInstitution(institutionId: string) {
    return this.applications.find({ where: { program: { institutionId } }, relations: { artisan: true, program: true }, order: { createdAt: 'DESC' } });
  }

  async review(institutionId: string, id: string, status: 'submitted' | 'in_review' | 'accepted' | 'rejected', notes?: string) {
    const app = await this.applications.findOne({ where: { id }, relations: { program: true } });
    if (!app) throw new NotFoundException('Candidature introuvable');
    if (app.program.institutionId !== institutionId) {
      throw new ForbiddenException('Cette candidature ne concerne pas vos programmes');
    }
    app.status = status;
    if (notes !== undefined) app.institutionNotes = notes;
    return this.applications.save(app);
  }
}
