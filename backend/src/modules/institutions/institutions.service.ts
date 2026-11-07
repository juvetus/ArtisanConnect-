import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ArtisanFormalization, InstitutionalProgram, InstitutionalResource, Listing, Order, ProgramApplication, User } from '../../entities/index.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { isDemoMode } from '../../demo-mode.js';
import { normalizeGeography, normalizedGeographySql, validateGeography, type InstitutionGeography } from './institution-geography.js';

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
    private notificationsService: NotificationsService,
  ) {}

  async listResources() {
    return this.resources.find({ where: { published: true, ...(isDemoMode() ? {} : { isDemo: false }) }, relations: { institution: true }, order: { createdAt: 'DESC' } });
  }

  async listPrograms() {
    return this.programs.find({ where: { status: 'active', ...(isDemoMode() ? {} : { isDemo: false }) }, relations: { institution: true }, order: { createdAt: 'DESC' } });
  }

  async listMyResources(institutionId: string) {
    return this.resources.find({ where: { institution: { id: institutionId } }, relations: { institution: true }, order: { createdAt: 'DESC' } });
  }

  async listMyPrograms(institutionId: string) {
    return this.programs.find({ where: { institutionId }, relations: { institution: true }, order: { createdAt: 'DESC' } });
  }

  async createResource(userId: string, data: { title: string; description: string; type: ResourceType; theme: string; contentUrl?: string; imageUrls?: string[]; videoUrls?: string[]; pdfUrls?: string[] }) {
    const resource = this.resources.create({ ...data, institution: { id: userId } as User, published: true, isDemo: isDemoMode() });
    return this.resources.save(resource);
  }

  async createProgram(userId: string, data: { title: string; description: string; type: ProgramType; eligibility?: string; budget?: number; interventionZone?: string; startDate?: string; endDate?: string; objectives?: string; targetBeneficiaries?: string; impactIndicators?: string[]; imageUrls?: string[]; videoUrls?: string[]; pdfUrls?: string[] }) {
    const program = this.programs.create({ ...data, institution: { id: userId } as User, status: 'active', isDemo: isDemoMode() });
    return this.programs.save(program);
  }

  async updateResource(
    institutionId: string,
    resourceId: string,
    data: Partial<{ title: string; description: string; type: ResourceType; theme: string; contentUrl?: string; imageUrls?: string[]; videoUrls?: string[] }>,
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
      imageUrls?: string[];
      videoUrls?: string[];
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
    const saved = await this.formalizations.save(record);
    void this.notificationsService.notifyAdmins({
      title: 'Dossier de formalisation à examiner',
      content: `Le dossier « ${saved.businessName} » a été soumis ou mis à jour.`,
      link: '/admin',
      relatedId: saved.id,
    }).catch(() => undefined);
    return saved;
  }

  private artisanQuery(input: InstitutionGeography = {}) {
    const filters = validateGeography(input);
    const query = this.users.createQueryBuilder('u').leftJoin('u.shops', 's')
      .where("u.role = 'artisan'");
    if (!isDemoMode()) query.andWhere('u.isDemo = false');
    for (const key of ['city', 'district', 'neighborhood'] as const) {
      if (filters[key]) query.andWhere(`${normalizedGeographySql(`CASE WHEN s.id IS NULL THEN u.${key} ELSE s.${key} END`)} = :${key}`, { [key]: normalizeGeography(filters[key]) });
    }
    if (Object.keys(filters).length && !isDemoMode()) query.andWhere('s.isDemo IS DISTINCT FROM true');
    return query;
  }

  async geographyOptions() {
    return this.artisanQuery().andWhere('(s.city IS NOT NULL OR (s.id IS NULL AND u.city IS NOT NULL))')
      .andWhere(isDemoMode() ? '1 = 1' : 's.isDemo IS DISTINCT FROM true')
      .select('CASE WHEN s.id IS NULL THEN u.city ELSE s.city END', 'city')
      .addSelect('CASE WHEN s.id IS NULL THEN u.district ELSE s.district END', 'district')
      .addSelect('CASE WHEN s.id IS NULL THEN u.neighborhood ELSE s.neighborhood END', 'neighborhood')
      .distinct(true).orderBy('city', 'ASC').getRawMany<{
        city: string; district: string | null; neighborhood: string | null;
      }>();
  }

  async dashboard(institutionId: string, filters: InstitutionGeography = {}) {
    const query = this.artisanQuery(filters);
    const [totalArtisans, womenArtisans, cooperativeArtisans, artisanRows] = await Promise.all([
      query.clone().getCount(),
      query.clone().andWhere("(u.gender = 'female' OR s.isWomenLed = true)").getCount(),
      query.clone().andWhere("(u.gender = 'cooperative' OR s.isCooperative = true)").getCount(),
      Object.keys(validateGeography(filters)).length ? query.clone().select('u.id', 'id').distinct(true).getRawMany<{ id: string }>() : Promise.resolve(null),
    ]);
    const scoped = artisanRows ? { artisan: { id: In(artisanRows.map((row) => row.id)) } } : {};

    const [resources, programs, pendingApps, approvedApps, pendingForm, approvedForm] = await Promise.all([
      this.resources.count({ where: { institution: { id: institutionId } } }),
      this.programs.count({ where: { institutionId, status: 'active' } }),
      this.applications.count({
        where: [
          { program: { institutionId }, status: 'submitted', ...scoped },
          { program: { institutionId }, status: 'in_review', ...scoped },
        ],
      }),
      this.applications.count({
        where: { program: { institutionId }, status: 'accepted', ...scoped },
      }),
      this.formalizations.count({
        where: [
          { reviewedBy: { id: institutionId }, status: 'submitted', ...scoped },
          { reviewedBy: { id: institutionId }, status: 'in_review', ...scoped },
        ],
      }),
      this.formalizations.count({
        where: { reviewedBy: { id: institutionId }, status: 'approved', ...scoped },
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

  async listArtisans(filters: InstitutionGeography = {}) {
    return this.artisanQuery(filters)
      .select(['u.id', 'u.name', 'u.email', 'u.location', 'u.verifiedEmail', 'u.city', 'u.district', 'u.neighborhood'])
      .addSelect(['s.id', 's.city', 's.district', 's.neighborhood'])
      .orderBy('u.createdAt', 'DESC').getMany();
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

  async csvReport(institutionId: string, input: InstitutionGeography = {}) {
    const filters = validateGeography(input);
    const artisans = await this.listArtisans(filters);
    const artisanIds = Object.keys(filters).length ? artisans.map((artisan) => artisan.id) : null;
    const [stats, records] = await Promise.all([
      this.dashboard(institutionId, filters),
      this.formalizations.find({
        where: { reviewedBy: { id: institutionId }, ...(artisanIds ? { artisan: { id: In(artisanIds) } } : {}) },
        relations: { artisan: true },
      }),
    ]);
    const rows = [
      ['indicateur', 'valeur'],
      ['ville', filters.city ?? 'Toutes'],
      ['arrondissement', filters.district ?? 'Tous'],
      ['quartier', filters.neighborhood ?? 'Tous'],
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
      ['artisan', 'ville', 'arrondissement', 'quartier'],
      ...artisans.map((artisan) => [
        artisan.name,
        artisan.shops?.length ? artisan.shops.map((shop) => shop.city ?? '').join(' ; ') : artisan.city ?? '',
        artisan.shops?.length ? artisan.shops.map((shop) => shop.district ?? '').join(' ; ') : artisan.district ?? '',
        artisan.shops?.length ? artisan.shops.map((shop) => shop.neighborhood ?? '').join(' ; ') : artisan.neighborhood ?? '',
      ]),
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
    return rows.map((row) => row.map((value) => {
      const text = String(value ?? '');
      return `"${(/^[\s]*[=+@\-\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`;
    }).join(',')).join('\n');
  }
}