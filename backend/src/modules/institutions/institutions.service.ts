import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ArtisanFormalization, InstitutionalProgram, InstitutionalResource, Listing, Order, ProgramApplication, User } from '../../entities/index.js';

type ResourceType = 'training' | 'guide' | 'template';
type ProgramType = 'training' | 'support' | 'funding' | 'grant';
type FormalizationStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';

@Injectable()
export class InstitutionsService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Listing) private listings: Repository<Listing>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(InstitutionalResource) private resources: Repository<InstitutionalResource>,
    @InjectRepository(InstitutionalProgram) private programs: Repository<InstitutionalProgram>,
    @InjectRepository(ArtisanFormalization) private formalizations: Repository<ArtisanFormalization>,
    @InjectRepository(ProgramApplication) private applications: Repository<ProgramApplication>,
  ) {}

  async listResources() {
    return this.resources.find({ where: { published: true }, relations: { institution: true }, order: { createdAt: 'DESC' } });
  }

  async listPrograms() {
    return this.programs.find({ where: { status: 'active' }, relations: { institution: true }, order: { createdAt: 'DESC' } });
  }

  async listMyResources(institutionId: string) {
    return this.resources.find({ where: { institution: { id: institutionId } }, relations: { institution: true }, order: { createdAt: 'DESC' } });
  }

  async listMyPrograms(institutionId: string) {
    return this.programs.find({ where: { institutionId }, relations: { institution: true }, order: { createdAt: 'DESC' } });
  }

  async createResource(userId: string, data: { title: string; description: string; type: ResourceType; theme: string; contentUrl?: string }) {
    const resource = this.resources.create({ ...data, institution: { id: userId } as User, published: true });
    return this.resources.save(resource);
  }

  async createProgram(userId: string, data: { title: string; description: string; type: ProgramType; eligibility?: string; budget?: number; interventionZone?: string; startDate?: string; endDate?: string; objectives?: string; targetBeneficiaries?: string; impactIndicators?: string[] }) {
    const program = this.programs.create({ ...data, institution: { id: userId } as User, status: 'active' });
    return this.programs.save(program);
  }

  async updateResource(
    institutionId: string,
    resourceId: string,
    data: Partial<{ title: string; description: string; type: ResourceType; theme: string; contentUrl?: string }>,
  ) {
    const resource = await this.resources.findOne({
      where: { id: resourceId },
      relations: { institution: true },
    });
    if (!resource) throw new NotFoundException('Ressource introuvable');
    if (resource.institution.id !== institutionId) {
      throw new ForbiddenException('Vous ne pouvez modifier que les ressources de votre institution');
    }
    Object.assign(resource, data);
    return this.resources.save(resource);
  }

  async updateProgram(
    institutionId: string,
    programId: string,
    data: Partial<{
      title: string;
      description: string;
      type: ProgramType;
      eligibility?: string;
      budget?: number;
      interventionZone?: string;
      startDate?: string;
      endDate?: string;
      objectives?: string;
      targetBeneficiaries?: string;
      impactIndicators?: string[];
      status?: 'active' | 'closed';
    }>,
  ) {
    const program = await this.programs.findOne({ where: { id: programId } });
    if (!program) throw new NotFoundException('Programme introuvable');
    if (program.institutionId !== institutionId) {
      throw new ForbiddenException('Vous ne pouvez modifier que les programmes de votre institution');
    }
    Object.assign(program, data);
    return this.programs.save(program);
  }

  async deleteResource(institutionId: string, resourceId: string) {
    // Deletar apenas se o recurso pertence à instituição
    const result = await this.resources.delete({
      id: resourceId,
      institution: { id: institutionId }
    });
    
    if (result.affected === 0) {
      throw new ForbiddenException('Vous ne pouvez supprimer que les ressources de votre institution');
    }
    
    return result;
  }

  async deleteProgram(institutionId: string, programId: string) {
    // Deletar apenas se o programa pertence à instituição
    const result = await this.programs.delete({
      id: programId,
      institution: { id: institutionId }
    });
    
    if (result.affected === 0) {
      throw new ForbiddenException('Vous ne pouvez supprimer que les programmes de votre institution');
    }
    
    return result;
  }

  async getMyFormalization(userId: string) {
    return this.formalizations.findOne({ where: { artisan: { id: userId } }, relations: { artisan: true, reviewedBy: true } });
  }

  async submitFormalization(userId: string, data: { businessName: string; registrationNumber?: string; taxId?: string; documentsUrl?: string }) {
    let record = await this.getMyFormalization(userId);
    if (!record) {
      record = this.formalizations.create({ artisan: { id: userId } as User, ...data, status: 'submitted', progress: 50 });
    } else {
      Object.assign(record, data, { status: 'submitted', progress: Math.max(record.progress, 50) });
    }
    return this.formalizations.save(record);
  }

  async dashboard(institutionId: string) {
    const totalArtisans = await this.users.count({ where: { role: 'artisan' } });

    // 1. Femmes artisanes (exclut les coopératives)
    const womenArtisanRows = await this.users
      .createQueryBuilder('u')
      .leftJoin('u.shops', 's')
      .where("u.role = 'artisan'")
      .andWhere("(u.gender = 'female' OR s.isWomenLed = true)")
      .select('DISTINCT u.id', 'id')
      .getRawMany();

    // 2. Coopératives & Groupements d'intérêt communautaire (GIC)
    const cooperativeRows = await this.users
      .createQueryBuilder('u')
      .leftJoin('u.shops', 's')
      .where("u.role = 'artisan'")
      .andWhere("(u.gender = 'cooperative' OR s.isCooperative = true)")
      .select('DISTINCT u.id', 'id')
      .getRawMany();

    const womenArtisans = womenArtisanRows.length;
    const cooperativeArtisans = cooperativeRows.length;

    const [resources, programs, pendingApps, approvedApps, pendingForm, approvedForm] = await Promise.all([
      this.resources.count({ where: { institution: { id: institutionId } } }),
      this.programs.count({ where: { institutionId, status: 'active' } }),
      this.applications.count({
        where: [
          { program: { institutionId }, status: 'submitted' },
          { program: { institutionId }, status: 'in_review' },
        ],
      }),
      this.applications.count({
        where: { program: { institutionId }, status: 'accepted' },
      }),
      this.formalizations.count({
        where: [
          { reviewedBy: { id: institutionId }, status: 'submitted' },
          { reviewedBy: { id: institutionId }, status: 'in_review' },
        ],
      }),
      this.formalizations.count({
        where: { reviewedBy: { id: institutionId }, status: 'approved' },
      }),
    ]);

    const pendingFormalizations = pendingApps + pendingForm;
    const approvedFormalizations = approvedApps + approvedForm;
    const womenPercentage = totalArtisans > 0 ? Math.round((womenArtisans / totalArtisans) * 100) : 0;
    const cooperativePercentage = totalArtisans > 0 ? Math.round((cooperativeArtisans / totalArtisans) * 100) : 0;

    return {
      stats: {
        artisans: totalArtisans,
        institutions: 1,
        listings: 0,
        orders: 0,
        pendingFormalizations,
        approvedFormalizations,
        resources,
        programs,
        womenArtisans,
        womenPercentage,
        cooperativeArtisans,
        cooperativePercentage,
      },
    };
  }

  async listArtisans() {
    return this.users.find({ where: { role: 'artisan' }, select: { id: true, name: true, email: true, location: true, verifiedEmail: true }, order: { createdAt: 'DESC' } });
  }

  async listFormalizations(institutionId?: string) {
    if (institutionId) {
      return this.formalizations.find({
        where: [
          { reviewedBy: { id: institutionId } },
          { status: 'submitted' },
        ],
        relations: { artisan: true, reviewedBy: true },
        order: { updatedAt: 'DESC' },
      });
    }
    return this.formalizations.find({ relations: { artisan: true, reviewedBy: true }, order: { updatedAt: 'DESC' } });
  }

  async reviewFormalization(institutionId: string, id: string, status: FormalizationStatus, notes?: string) {
    const record = await this.formalizations.findOne({ where: { id }, relations: { artisan: true, reviewedBy: true } });
    if (!record) throw new NotFoundException('Dossier introuvable');
    if (status === 'draft') throw new ForbiddenException('Statut invalide pour une revue institutionnelle');
    Object.assign(record, { status, institutionNotes: notes ?? record.institutionNotes, reviewedBy: { id: institutionId } as User, progress: status === 'approved' ? 100 : Math.max(record.progress, 75) });
    return this.formalizations.save(record);
  }

  async csvReport(institutionId: string) {
    const [stats, records] = await Promise.all([
      this.dashboard(institutionId),
      this.formalizations.find({
        where: { reviewedBy: { id: institutionId } },
        relations: { artisan: true },
      }),
    ]);
    const rows = [
      ['indicateur', 'valeur'],
      ['artisans_suivis', stats.stats.artisans],
      ['femmes_artisanes_suivies', stats.stats.womenArtisans],
      ['taux_entrepreneuriat_feminin', `${stats.stats.womenPercentage}%`],
      ['cooperatives_suivies', stats.stats.cooperativeArtisans],
      ['taux_cooperatives', `${stats.stats.cooperativePercentage}%`],
      ['ressources_publiees', stats.stats.resources],
      ['programmes_actifs', stats.stats.programs],
      ['dossiers_en_attente', stats.stats.pendingFormalizations],
      ['dossiers_approuves', stats.stats.approvedFormalizations],
      [],
      ['artisan', 'profil_genre_ou_coop', 'entreprise', 'statut', 'progression'],
      ...records.map((record) => [
        record.artisan?.name ?? '',
        record.artisan?.gender ?? 'non renseigné',
        record.businessName,
        record.status,
        record.progress,
      ]),
    ];
    return rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  }
}